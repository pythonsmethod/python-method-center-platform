import { createClinicalEvidenceItem, type ClinicalEvidenceContext, type EvidenceTextBlock } from "./parsing";
import { createHash } from "node:crypto";
import type { ClinicalEvidenceItem, ClinicalEvidenceType } from "./types";

type Span = { text: string; start: number; end: number };
type DateKind = NonNullable<ClinicalEvidenceItem["dateKind"]>;
export type SourceExtractionOptions = { dateOrder?: "MDY" | "DMY" };

// These are document sections, not individual benchmark targets. Unknown text
// remains unstructured; no diagnosis, recommendation or linkage is inferred.
const sections: Array<[RegExp, ClinicalEvidenceType]> = [
  [/^(?:findings?|left|right)\s*:?$/i, "FINDING"],
  [/^impression\s*:?$/i, "IMPRESSION"],
  [/^recommendations?\s*:?$/i, "RECOMMENDATION"],
  [/^(?:final diagnosis|pathology results)\s*:?$/i, "FINAL_DIAGNOSIS"],
  [/^specimens?\s*:?$/i, "SPECIMEN"],
  [/^(?:procedures? performed|technique)\s*:?$/i, "PROCEDURE_NAME"],
  [/^comparisons?\s*:?$/i, "COMPARISON"],
  [/^tissue density\s*:?$/i, "FINDING"]
];
const barriers = /^(?:name|patient|dob|mrn|signed by|electronically signed|printed|report author|deliver to|workstation|clinical data|relevant history|risk assessment|note|methods)\b/i;

function spans(text: string): Span[] {
  const result: Span[] = [];
  // Decimal points remain inside a sentence. Newlines remain explicit boundaries
  // unless they are clearly wrapped prose inside the same recognized section.
  for (const match of text.matchAll(/[^\n]+/g)) {
    const leading = match[0].length - match[0].trimStart().length;
    const trimmed = match[0].trim();
    if (trimmed) result.push({ text: trimmed, start: match.index! + leading, end: match.index! + leading + trimmed.length });
  }
  return result;
}

function sourceItem(context: ClinicalEvidenceContext, block: EvidenceTextBlock, span: Span, type: ClinicalEvidenceType): ClinicalEvidenceItem {
  const fact = createClinicalEvidenceItem(context, block, type, span.text);
  const left = /\bleft\b/i.test(span.text), right = /\bright\b/i.test(span.text);
  fact.laterality = /\bbilateral\b/i.test(span.text) ? "BILATERAL" : left && right ? null : left ? "LEFT" : right ? "RIGHT" : null;
  fact.verificationStatus = "NEEDS_REVIEW";
  fact.verificationIssues = ["INDEPENDENT_SOURCE_VERIFICATION_REQUIRED", ...(block.coordinates ? ["BLOCK_REGION_PROVENANCE"] : ["MISSING_PROVENANCE"]), ...(left && right ? ["MULTIPLE_LATERALITIES"] : [])];
  fact.sourceSpan = { start: span.start, end: span.end, scope: "INPUT_BLOCK" };
  return fact;
}

function normalizeDate(raw: string, order?: "MDY" | "DMY"): string | null {
  const parts = raw.split(/[/-]/).map(Number);
  let year: number, month: number, day: number;
  if (/^\d{4}-/.test(raw)) [year, month, day] = parts;
  else {
    if (!order) return null;
    year = parts[2]; month = parts[order === "MDY" ? 0 : 1]; day = parts[order === "MDY" ? 1 : 0];
  }
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}

const dateLabels: Array<[RegExp, DateKind]> = [
  [/^(?:exam date(?:\s*\/\s*time)?|examination date)\s*:?\s*$/i, "EXAM"],
  [/^procedure date\s*:?\s*$/i, "PROCEDURE"],
  [/^(?:specimen\s+)?collected\s*:?\s*$/i, "COLLECTED"],
  [/^(?:specimen\s+)?received\s*:?\s*$/i, "RECEIVED"],
  [/^(?:report signed|final report date|signed)\s*:?\s*$/i, "FINAL"],
  [/^addendum date\s*:?\s*$/i, "ADDENDUM"],
  [/^printed\s*:?\s*$/i, "PRINTED"],
  [/^(?:comparison|prior study date|prior breast imaging dated)\s*:?\s*$/i, "COMPARISON"]
];

/** Opt-in bounded source extraction. Region provenance never implies VERIFIED. */
export function extractBoundedSourceEvidence(blocks: EvidenceTextBlock[], context: ClinicalEvidenceContext, options: SourceExtractionOptions = {}): ClinicalEvidenceItem[] {
  const output: ClinicalEvidenceItem[] = [];
  for (const block of blocks) {
    const lines = spans(block.text);
    let section: ClinicalEvidenceType | null = null;
    let biradsSection = false;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (barriers.test(line.text)) { section = null; biradsSection = false; }
      const colon = line.text.indexOf(":");
      const header = colon >= 0 ? line.text.slice(0, colon) : line.text;
      const knownSection = sections.find(([pattern]) => pattern.test(header));
      if (knownSection) section = knownSection[1];
      if (/^(?:assessment\s*\/\s*)?BI-?RADS(?: category)?\s*:?$/i.test(line.text)) {
        biradsSection = true; section = null; continue;
      }
      if ((knownSection && !/^(?:Left|Right)\s*:/i.test(line.text)) || barriers.test(line.text)) biradsSection = false;

      const datePattern = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/g;
      const dateMatches = [...line.text.matchAll(datePattern)];
      const dateLabel = dateMatches.length ? line.text.slice(0, dateMatches[0].index).trim() : line.text;
      const dateType = dateLabels.find(([pattern]) => pattern.test(dateLabel));
      if (dateType) {
        const next = lines[index + 1];
        const candidate = dateMatches.length ? line : next && /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?:\s+\d{1,2}:\d{2}(?:\s*[AP]M)?)?$/i.test(next.text) ? next : null;
        if (candidate) {
          const dates = [...candidate.text.matchAll(datePattern)];
          for (const date of dates) {
            const dateSpan = { text: block.text.slice(line.start, candidate.end), start: line.start, end: candidate.end };
            const fact = sourceItem(context, block, dateSpan, "EVENT_DATE");
            const normalized = dates.length === 1 ? normalizeDate(date[0], options.dateOrder) : null;
            fact.eventDate = normalized; fact.dateKind = dateType[1];
            fact.structuredPayload = { kind: "DATE_EVENT", rawDate: date[0], normalized, dateKind: dateType[1] };
            if (!normalized) fact.verificationIssues!.push("AMBIGUOUS_OR_INVALID_DATE");
            output.push(fact);
          }
        }
        continue;
      }

      const category = /(?:BI-?RADS(?:\s+CATEGORY)?\s*:?\s*(?:(Overall|Left|Right)\s*:?\s*)?|(Overall|Left|Right)\s*:\s*)([0-6])\b/ig;
      if (/BI-?RADS/i.test(line.text) || biradsSection) for (const match of line.text.matchAll(category)) {
        const fact = sourceItem(context, block, line, "BI_RADS");
        const subject = (match[1] ?? match[2])?.toUpperCase() as "LEFT" | "RIGHT" | "OVERALL" | undefined;
        fact.numericValue = Number(match[3]); fact.codedValue = match[3];
        fact.structuredPayload = { kind: "SOURCE_CATEGORY", system: "BI_RADS", value: Number(match[3]), subject: subject ?? null };
        output.push(fact);
      }
      if (biradsSection && !/^(?:Left|Right|Overall)\s*:/i.test(line.text)) biradsSection = false;

      // A sentence may span OCR lines, but never crosses another named field.
      let span = line;
      if (section && !/[.!?]$/.test(line.text) && colon < 0) {
        let end = index;
        while (end + 1 < lines.length && end - index < 6) {
          const next = lines[end + 1];
          if (barriers.test(next.text) || next.text.includes(":") || sections.some(([p]) => p.test(next.text)) || /^[-*•]|^\d+[.)]/.test(next.text)) break;
          end++;
          if (/[.!?]$/.test(next.text)) break;
        }
        if (end > index) { span = { text: block.text.slice(line.start, lines[end].end), start: line.start, end: lines[end].end }; index = end; }
      }
      const meaningful = knownSection ? colon >= 0 && line.text.slice(colon + 1).trim().length > 0 : true;
      const clinical = /\b(?:breast|biopsy|mass|carcinoma|mitoses|nottingham|tubule|nuclear grade|lymph.?vascular|microcalcifications?|washout|non.mass|lymphadenopathy|clip|specimen|mammograph|MRI|ultrasound)\b/i.test(span.text);
      if (meaningful && (section || clinical) && !barriers.test(span.text)) {
        const type = /lymph.?vascular invasion/i.test(span.text) ? "LYMPHOVASCULAR_INVASION" : /microcalcification/i.test(span.text) ? "MICROCALCIFICATIONS" : section ?? "OTHER_SOURCE_FACT";
        const fact = sourceItem(context, block, span, type);
        fact.structuredPayload = { kind: "SOURCE_NARRATIVE", normalized: null };
        output.push(fact);
      }
      if (!clinical && !section) continue;
      // Units may be repeated between dimensions. Mixed units are retained as
      // source-only evidence instead of silently converted.
      const measurement = /([<>]=?\s*)?(\d+(?:\.\d+)?(?:\s*(?:mm|cm)?\s*[x×]\s*\d+(?:\.\d+)?){0,2})\s*(mm|cm)\b/ig;
      for (const match of span.text.matchAll(measurement)) {
        const fact = sourceItem(context, block, span, "MEASUREMENT");
        const dimensions = [...match[2].matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
        const unit = match[3].toLowerCase() as "mm" | "cm";
        const mixed = [...match[2].matchAll(/\b(mm|cm)\b/ig)].some((m) => m[1].toLowerCase() !== unit);
        if (mixed) { fact.structuredPayload = { kind: "SOURCE_NARRATIVE", normalized: null }; fact.verificationIssues!.push("MIXED_MEASUREMENT_UNITS"); }
        else fact.structuredPayload = { kind: "MEASUREMENT", dimensions, unit, sourceUnit: match[3], comparator: match[1]?.trim() as "<" | ">" | "<=" | ">=" | undefined ?? null };
        // Keep scalar and multidimensional values distinct.
        fact.numericValue = !mixed && dimensions.length === 1 ? dimensions[0] : null;
        output.push(fact);
      }
    }
  }
  const unique = new Map<string, ClinicalEvidenceItem>();
  for (const fact of output) unique.set(JSON.stringify([fact.evidenceId, fact.structuredPayload]), fact);
  return [...unique.values()].map((fact) => ({ ...fact, evidenceId: `cef_${createHash("sha256").update(JSON.stringify([fact.evidenceId, fact.structuredPayload])).digest("hex").slice(0, 24)}` }));
}
