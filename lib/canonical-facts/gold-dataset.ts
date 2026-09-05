import type { BoundingPolygon, CanonicalLabFact, VerificationStatus } from "@/lib/canonical-facts/types";

export type GoldDatasetKind = "real_deidentified" | "synthetic_development";
export type GoldLayoutClass =
  | "simple_table" | "multi_result_columns" | "multi_page" | "mobile_photo"
  | "low_contrast_or_skew" | "multilingual" | "split_table" | "multi_panel"
  | "corrected_report" | "intentionally_ambiguous";

export type GoldObservation = {
  observationId: string;
  page: number;
  originalTestName: string;
  expectedValueOriginal: string;
  expectedNumericValue: number | null;
  expectedComparator: "<" | ">" | "<=" | ">=" | null;
  expectedUnit: string | null;
  expectedReferenceLow: number | null;
  expectedReferenceHigh: number | null;
  expectedLabFlag: string | null;
  expectedCollectionDate: string | null;
  expectedCoordinates?: BoundingPolygon | null;
  expectedParseability: "PARSEABLE" | "AMBIGUOUS" | "NOT_PARSEABLE";
  expectedVerificationStatus: VerificationStatus;
};

export type GoldDocument = {
  documentId: string;
  datasetKind: GoldDatasetKind;
  deidentified: true;
  metadataSanitization: {
    visibleTextReviewed: true;
    filenameReviewed: true;
    embeddedPropertiesReviewed: true;
  };
  layoutId: string;
  layoutClasses: GoldLayoutClass[];
  language: string;
  sourceType: "pdf_text" | "scan" | "mobile_photo" | "synthetic";
  pageCount: number;
  estimatedProviderCostUsdPerPage: number;
  truth: GoldObservation[];
  outputFacts: CanonicalLabFact[];
  latencyMs: number;
};

export type GoldDataset = {
  datasetId: string;
  version: string;
  createdAt: string;
  datasetKind: GoldDatasetKind;
  documents: GoldDocument[];
};

export type LayoutRegistryEntry = {
  layoutId: string;
  fingerprint: string;
  sourceLabel: string | null;
  language: string;
  characteristics: string[];
  sampleCount: number;
  parserSuccessRate: number | null;
  reviewRate: number | null;
  knownFailurePatterns: string[];
  lastValidatedParserVersion: string | null;
};

const IDENTIFIER_PATTERN = /(?:\b(?:dob|date of birth|mrn|medical record|patient id)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{8,}\d)/i;

export function validateGoldDatasetSecurity(dataset: GoldDataset): string[] {
  const issues: string[] = [];
  for (const document of dataset.documents) {
    if (!document.deidentified) issues.push(`${document.documentId}:not_deidentified`);
    if (document.datasetKind !== dataset.datasetKind) issues.push(`${document.documentId}:dataset_kind_mismatch`);
    if (IDENTIFIER_PATTERN.test(document.documentId) || IDENTIFIER_PATTERN.test(document.layoutId)) {
      issues.push(`${document.documentId}:identifier_in_metadata`);
    }
    const review = document.metadataSanitization;
    if (!review.visibleTextReviewed || !review.filenameReviewed || !review.embeddedPropertiesReviewed) {
      issues.push(`${document.documentId}:incomplete_metadata_review`);
    }
  }
  return issues;
}
