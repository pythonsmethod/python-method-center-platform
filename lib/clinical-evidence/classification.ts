import type { ClinicalDocumentType } from "@/lib/clinical-evidence/types";

const rules: Array<{ type: ClinicalDocumentType; patterns: RegExp[] }> = [
  { type: "PATHOLOGY", patterns: [/surgical pathology/i, /final diagnosis/i, /specimen(?:s)?\b/i, /histolog/i] },
  { type: "PROCEDURE", patterns: [/procedure(?:s)? performed/i, /ultrasound[- ]guided biopsy/i, /specimen collection/i, /clip (?:was )?placed/i] },
  { type: "RADIOLOGY", patterns: [/bi-rads/i, /mammograph/i, /breast (?:mri|ultrasound)/i, /impression:/i] },
  { type: "LAB", patterns: [/reference (?:range|interval)/i, /analyte/i, /result\s+unit/i] },
  { type: "CLINICAL_NOTE", patterns: [/history of present illness/i, /assessment and plan/i] },
  { type: "REPORT", patterns: [/report date/i, /signed by/i] }
];

export function classifyClinicalDocument(text: string) {
  const scored = rules.map((rule) => ({ type: rule.type, matches: rule.patterns.filter((pattern) => pattern.test(text)).map(String) }))
    .filter((result) => result.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length);
  const best = scored[0];
  if (!best) return { documentType: "UNKNOWN" as const, confidence: 0, reasons: [] as string[] };
  return { documentType: best.type, confidence: Math.min(0.99, 0.55 + best.matches.length * 0.12), reasons: best.matches };
}
