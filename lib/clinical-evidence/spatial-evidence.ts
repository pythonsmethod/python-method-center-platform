import { createHash } from "node:crypto";
import { aggregateCoordinates, reconstructSpatialTables, type SpatialOptions, type SpatialToken } from "./spatial-table";
import { createClinicalEvidenceItem, type ClinicalEvidenceContext } from "./parsing";
import type { ClinicalEvidenceItem } from "./types";
import { createNativeTokenProvenance } from "./provenance";

/** Opt-in staging adapter. Never consumes the provider's raw payload or uploads data. */
export function extractSpatialEvidence(tokens: SpatialToken[], context: ClinicalEvidenceContext, options: SpatialOptions) {
  const result = reconstructSpatialTables(tokens, options);
  const facts: ClinicalEvidenceItem[] = [];
  for (const table of result.tables) {
    for (const row of table.rows) {
      const label = row.cells[0]?.text ?? "";
      if (!/\b(?:ER|PR|PgR|HER2|estrogen|progesterone|percentage of cells|average intensity)\b/i.test(label)) continue;
      const sourceTokens = row.cells.flatMap((c) => c?.tokens ?? []);
      const originalText = row.cells.map((c) => c?.text ?? "[missing]").join(" | ");
      const confidence = sourceTokens.every((t) => t.confidence !== null) ? Math.min(...sourceTokens.map((t) => t.confidence!)) : null;
      // Reuse the canonical source-fact constructor without pretending positional text is OCR text.
      const seed = createClinicalEvidenceItem(context, { text: originalText, page: row.page }, "BIOMARKER", originalText);
      facts.push({ ...seed,
        evidenceId: `cef_${createHash("sha256").update(JSON.stringify([context.sourceDocumentId, row.page, sourceTokens.map((t) => t.id)])).digest("hex").slice(0, 24)}`,
        documentType: "PATHOLOGY", originalText, codedValue: null,
        sourceCoordinates: aggregateCoordinates(sourceTokens), extractionConfidence: confidence,
        layoutConfidence: row.layoutConfidence,
        // Association is reconstructed, not independently verified against source truth.
        verificationStatus: "NEEDS_REVIEW",
        tokenProvenance: createNativeTokenProvenance(originalText, row.page, sourceTokens)
      });
    }
  }
  return { ...result, facts };
}
