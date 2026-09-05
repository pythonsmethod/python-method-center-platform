import { buildCanonicalFacts } from "@/lib/canonical-facts/pipeline";
import type { GoldDataset, GoldObservation, LayoutRegistryEntry } from "@/lib/canonical-facts/gold-dataset";
import { fixtureA, fixtureE, fixtureF } from "@/tests/fixtures/canonical-lab-facts";

const context = (documentId: string) => ({ caseId: "case-synthetic-gold", sourceDocumentId: documentId, extractionProvider: "google-document-ai", extractionVersion: "pretrained-ocr-v2.1-2024-08-07" });
const review = { visibleTextReviewed: true as const, filenameReviewed: true as const, embeddedPropertiesReviewed: true as const };

const truthA: GoldObservation[] = [
  ["hemoglobin", 1, "Hemoglobin", "9.6", 9.6, "g/dL", 12, 15.5, "LOW"],
  ["ferritin", 1, "Ferritin", "14", 14, "ng/mL", 15, 150, "LOW"],
  ["alt", 1, "ALT", "62", 62, "U/L", 7, 35, "HIGH"],
  ["albumin", 1, "Albumin", "32", 32, "g/L", 35, 50, "LOW"]
].map(([id, page, name, value, numeric, unit, low, high, flag]) => ({
  observationId: String(id), page: Number(page), originalTestName: String(name), expectedValueOriginal: String(value),
  expectedNumericValue: Number(numeric), expectedComparator: null, expectedUnit: String(unit),
  expectedReferenceLow: Number(low), expectedReferenceHigh: Number(high), expectedLabFlag: String(flag),
  expectedCollectionDate: null, expectedCoordinates: fixtureA[0].sourceCoordinates,
  expectedParseability: "PARSEABLE" as const, expectedVerificationStatus: "VERIFIED" as const
}));

export const syntheticGoldDataset: GoldDataset = {
  datasetId: "ankh-synthetic-development",
  version: "1.0.0",
  createdAt: "2026-09-01T00:00:00.000Z",
  datasetKind: "synthetic_development",
  documents: [
    {
      documentId: "synthetic-simple-table-v1", datasetKind: "synthetic_development", deidentified: true,
      metadataSanitization: review, layoutId: "synthetic.simple-table.en.v1", layoutClasses: ["simple_table"],
      language: "en", sourceType: "synthetic", pageCount: 1, estimatedProviderCostUsdPerPage: 0.0015,
      truth: truthA, outputFacts: buildCanonicalFacts(fixtureA, context("synthetic-simple-table-v1")).facts, latencyMs: 420
    },
    {
      documentId: "synthetic-multipage-v1", datasetKind: "synthetic_development", deidentified: true,
      metadataSanitization: review, layoutId: "synthetic.multi-page.en.v1", layoutClasses: ["multi_page", "split_table"],
      language: "en", sourceType: "synthetic", pageCount: 2, estimatedProviderCostUsdPerPage: 0.0015,
      truth: [truthA[0], { ...truthA[1], page: 2 }], outputFacts: buildCanonicalFacts(fixtureE, context("synthetic-multipage-v1")).facts, latencyMs: 710
    },
    {
      documentId: "synthetic-ambiguous-v1", datasetKind: "synthetic_development", deidentified: true,
      metadataSanitization: review, layoutId: "synthetic.ambiguous.en.v1", layoutClasses: ["intentionally_ambiguous"],
      language: "en", sourceType: "synthetic", pageCount: 1, estimatedProviderCostUsdPerPage: 0.0015,
      truth: [{ ...truthA[3], observationId: "albumin-ambiguous", expectedLabFlag: null, expectedParseability: "AMBIGUOUS", expectedVerificationStatus: "NEEDS_REVIEW" }],
      outputFacts: buildCanonicalFacts([fixtureF], context("synthetic-ambiguous-v1")).facts, latencyMs: 390
    }
  ]
};

export const syntheticLayoutRegistry: LayoutRegistryEntry[] = [
  { layoutId: "synthetic.simple-table.en.v1", fingerprint: "columns:test-result-unit-reference-flag", sourceLabel: null, language: "en", characteristics: ["single table", "fixed headers"], sampleCount: 1, parserSuccessRate: 1, reviewRate: 0, knownFailurePatterns: [], lastValidatedParserVersion: "canonical-parser-v1" },
  { layoutId: "synthetic.multi-page.en.v1", fingerprint: "multi-page-split-table", sourceLabel: null, language: "en", characteristics: ["two pages", "table continuation"], sampleCount: 1, parserSuccessRate: 1, reviewRate: 0, knownFailurePatterns: [], lastValidatedParserVersion: "canonical-parser-v1" },
  { layoutId: "synthetic.ambiguous.en.v1", fingerprint: "ambiguous-row-low-confidence", sourceLabel: null, language: "en", characteristics: ["ambiguous association", "low confidence"], sampleCount: 1, parserSuccessRate: 1, reviewRate: 1, knownFailurePatterns: ["must not become VERIFIED"], lastValidatedParserVersion: "canonical-parser-v1" }
];
