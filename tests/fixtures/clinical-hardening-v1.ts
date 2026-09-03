import type { SpatialToken } from "@/lib/clinical-evidence/spatial-table";
import type { ExtractionRegressionEntry } from "@/lib/canonical-facts/error-library";

export const regressions: ExtractionRegressionEntry[] = [
  { errorId: "R1", category: "MISSED_FACT", discoveredInParserVersion: "clinical-parser-v1", fixedInParserVersion: "clinical-hardening-v1", fixtureId: "real.minimized.mitotic.en.v1", description: "Explicit score extraction passes real minimized OCR; historical score-3 Gold annotation corrected to source score 2.", critical: true, deidentified: true },
  { errorId: "R2", category: "TABLE_STRUCTURE_MISSING", discoveredInParserVersion: "clinical-parser-v1", fixedInParserVersion: "clinical-hardening-v2", fixtureId: "real.minimized.synoptic.en.v1", description: "Wrapped receptor rows and same-page headerless suppression fixed; full exact-value Gold gate remains open.", critical: true, deidentified: true }
];

// Authored synthetic data, NOT a transcription or surrogate for real benchmark truth.
export const fixtureMetadata = { version: "1.0", datasetKind: "SYNTHETIC", deidentified: true, parserVersion: "clinical-hardening-v1" } as const;
export const pathologyR1 = "Mitotic count: 11 per 10 HPF, score 2";
export function token(text: string, x: number, y: number, width = 0.12, page = 1): SpatialToken {
  return { id: `${page}-${x}-${y}-${text}`, text, page, confidence: 0.98,
    coordinates: { normalizedVertices: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + 0.015 }, { x, y: y + 0.015 }] } };
}
export function biomarkerR2(): SpatialToken[] {
  return [token("Marker", .1, .1), token("Result", .6, .1),
    token("ER", .1, .14), token("Positive", .6, .14),
    token("PR", .1, .18), token("Negative", .6, .18),
    token("HER2", .1, .22), token("IHC", .6, .22, .04), token("0", .66, .22, .02)];
}
