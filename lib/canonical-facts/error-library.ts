import type { ExtractionErrorCategory } from "@/lib/canonical-facts/benchmark";

export type ExtractionRegressionEntry = {
  errorId: string;
  category: ExtractionErrorCategory;
  discoveredInParserVersion: string;
  fixedInParserVersion: string | null;
  fixtureId: string;
  description: string;
  critical: boolean;
  deidentified: true;
};

export const extractionErrorCategories: ExtractionErrorCategory[] = [
  "OCR_VALUE", "OCR_UNIT", "ROW_ASSOCIATION", "REFERENCE_PARSE", "DATE_PARSE",
  "PROVENANCE", "NORMALIZATION", "DUPLICATE", "FALSE_VERIFIED", "MISSED_FACT",
  "TABLE_STRUCTURE_MISSING", "LAYOUT_RECONSTRUCTION"
];
