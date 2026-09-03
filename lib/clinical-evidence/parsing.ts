import { createHash } from "node:crypto";
import type { BoundingPolygon, VerificationStatus } from "@/lib/canonical-facts/types";
import { classifyClinicalDocument } from "@/lib/clinical-evidence/classification";
import type { ClinicalEvidenceItem, ClinicalEvidenceType } from "@/lib/clinical-evidence/types";
import { extractMitoticScores } from "@/lib/clinical-evidence/pathology";

export type EvidenceTextBlock = { text: string; page: number; coordinates?: BoundingPolygon | null; confidence?: number | null };
export type ClinicalEvidenceContext = { caseId: string; sourceDocumentId: string; providerVersion: string; parserVersion: string };

const labels: Array<[ClinicalEvidenceType, RegExp]> = [
  ["PROCEDURE_NAME", /^\s*procedures? performed\s*:\s*(.+)$/im],
  ["INDICATION", /^\s*(?:indication|reason for exam)\s*:\s*(.+)$/im],
  ["COMPARISON", /^\s*comparisons?\s*:\s*(.+)$/im],
  ["FINDING", /^\s*findings?\s*:\s*([\s\S]+?)(?=^\s*(?:impression|assessment|recommendation)\s*:|$)/im],
  ["IMPRESSION", /^\s*impression\s*:\s*([\s\S]+?)(?=^\s*(?:assessment|recommendation|bi-rads)\s*:|$)/im],
  ["RECOMMENDATION", /^\s*recommendations?\s*:\s*([\s\S]+?)(?=^\s*[A-Z][A-Z /-]{3,}\s*:|$)/im],
  ["FINAL_DIAGNOSIS", /^\s*final diagnosis\s*:?\s*([\s\S]+?)(?=^\s*(?:note|clinical data|addendum)\s*:|$)/im],
  ["SPECIMEN", /^\s*specimens?\s*:?\s*([\s\S]+?)(?=^\s*(?:addendum|final diagnosis)\s*:|$)/im]
];

function status(block: EvidenceTextBlock): VerificationStatus {
  return block.coordinates && (block.confidence ?? 0) >= 0.9 ? "VERIFIED" : "NEEDS_REVIEW";
}

export function createClinicalEvidenceItem(context: ClinicalEvidenceContext, block: EvidenceTextBlock, evidenceType: ClinicalEvidenceType, originalText: string, codedValue: string | null = null, numericValue: number | null = null): ClinicalEvidenceItem {
  const classified = classifyClinicalDocument(block.text);
  const digest = createHash("sha256").update([context.sourceDocumentId, block.page, evidenceType, originalText].join("|")).digest("hex");
  const lower = originalText.toLowerCase();
  const laterality = /bilateral/.test(lower) ? "BILATERAL" : /\bleft\b/.test(lower) ? "LEFT" : /\bright\b/.test(lower) ? "RIGHT" : null;
  return {
    evidenceId: `cef_${digest.slice(0, 24)}`, caseId: context.caseId, sourceDocumentId: context.sourceDocumentId,
    documentType: classified.documentType, evidenceType, originalText: originalText.trim(), normalizedText: null,
    numericValue, codedValue, laterality, anatomicalSite: /breast/i.test(originalText) ? "breast" : null,
    eventDate: null, dateKind: null, sourcePage: block.page, sourceCoordinates: block.coordinates ?? null,
    extractionConfidence: block.confidence ?? null, layoutConfidence: null, verificationStatus: status(block), normalizationStatus: "UNRESOLVED",
    providerVersion: context.providerVersion, parserVersion: context.parserVersion, canonicalLabFactId: null, caseEventId: null
  };
}

const item = createClinicalEvidenceItem;

export function extractClinicalEvidence(blocks: EvidenceTextBlock[], context: ClinicalEvidenceContext): ClinicalEvidenceItem[] {
  const output: ClinicalEvidenceItem[] = [];
  for (const block of blocks) {
    for (const score of extractMitoticScores(block.text)) {
      const fact = item(context, block, "GRADE_SCORE", score.text, "MITOTIC_SCORE", score.value);
      // Block-level geometry does not establish an exact score anchor.
      fact.verificationStatus = "NEEDS_REVIEW";
      output.push(fact);
    }
    for (const [type, pattern] of labels) {
      const match = pattern.exec(block.text);
      if (match?.[1]) output.push(item(context, block, type, match[1]));
    }
    const birads = /BI-?RADS(?:\s+CATEGORY)?\s*:?\s*(?:overall\s*:?)?\s*([0-6])(?:\s*[-:]\s*([^\n]+))?/ig;
    for (const match of block.text.matchAll(birads)) output.push(item(context, block, "BI_RADS", match[0], match[1], Number(match[1])));
    const biomarker = /\b(ER|estrogen receptor|PR|progesterone receptor|HER2)(?:\s+(?:IHC|ISH))?\s*(?:status)?\s*[:=-]\s*([^\n;]+)/ig;
    for (const match of block.text.matchAll(biomarker)) output.push(item(context, block, "BIOMARKER", match[0], `${match[1]}:${match[2].trim()}`));
    const measurements = /\b(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(mm|cm)\b/ig;
    for (const match of block.text.matchAll(measurements)) output.push(item(context, block, "MEASUREMENT", match[0]));
  }
  return output;
}
