import type { BoundingPolygon, NormalizationStatus, VerificationStatus } from "@/lib/canonical-facts/types";

export type ClinicalDocumentType = "LAB" | "RADIOLOGY" | "PATHOLOGY" | "PROCEDURE" | "CLINICAL_NOTE" | "REPORT" | "OTHER" | "UNKNOWN";
export type ClinicalEvidenceType =
  | "MODALITY" | "PROCEDURE_NAME" | "INDICATION" | "COMPARISON" | "FINDING" | "IMPRESSION"
  | "BI_RADS" | "MEASUREMENT" | "RECOMMENDATION" | "SPECIMEN" | "FINAL_DIAGNOSIS"
  | "GRADE_SCORE" | "LYMPHOVASCULAR_INVASION" | "MICROCALCIFICATIONS" | "BIOMARKER"
  | "EVENT_DATE" | "REPORT_AUTHOR" | "OTHER_SOURCE_FACT";

export type ClinicalDocumentMetadata = {
  documentId: string;
  documentType: ClinicalDocumentType;
  classificationConfidence: number;
  classificationReasons: string[];
  language: string;
  layoutFamily: string;
  pageCount: number;
  hasTables: boolean;
  repeatedIdentityHeader: boolean;
  versionKind: "ORIGINAL" | "ADDENDUM" | "CORRECTED" | "UNKNOWN";
  referencedDocumentIds: string[];
};

export type ClinicalEvidenceItem = {
  evidenceId: string;
  caseId: string;
  sourceDocumentId: string;
  documentType: ClinicalDocumentType;
  evidenceType: ClinicalEvidenceType;
  originalText: string;
  normalizedText: string | null;
  numericValue: number | null;
  codedValue: string | null;
  laterality: "LEFT" | "RIGHT" | "BILATERAL" | null;
  anatomicalSite: string | null;
  eventDate: string | null;
  dateKind: "EXAM" | "PROCEDURE" | "COLLECTED" | "RECEIVED" | "FINAL" | "ADDENDUM" | "COMPARISON" | "PRINTED" | null;
  sourcePage: number;
  sourceCoordinates: BoundingPolygon | null;
  extractionConfidence: number | null;
  layoutConfidence: number | null;
  verificationStatus: VerificationStatus;
  normalizationStatus: NormalizationStatus;
  providerVersion: string;
  parserVersion: string;
  canonicalLabFactId: string | null;
  caseEventId: string | null;
  /** Staging-only payload. Persistence mapping is deliberately not enabled. */
  structuredPayload?: ClinicalStructuredPayload | null;
  sourceSpan?: { start: number; end: number; scope: "INPUT_BLOCK" };
  tokenProvenance?: ClinicalTokenProvenance | null;
  verificationIssues?: string[];
};

export type ClinicalTokenProvenance = {
  level: "P3" | "P4";
  page: number;
  tokenIds: string[];
  tokenStartIndex: number;
  tokenEndIndex: number;
  documentTextSpan: { start: number; end: number } | null;
  exactSourceText: string;
  normalizedSourceHash: string;
  minimumTokenConfidence: number | null;
  matchMethod: "UNIQUE_CONTIGUOUS_TOKEN_SEQUENCE" | "PARSER_NATIVE_TOKEN_SET";
  relationValidation: { method: string; independentSignal: true; passed: true } | null;
};

export type ClinicalStructuredPayload =
  | { kind: "MEASUREMENT"; dimensions: number[]; unit: "mm" | "cm"; comparator: "<" | ">" | "<=" | ">=" | null; sourceUnit: string }
  | { kind: "SOURCE_CATEGORY"; system: "BI_RADS"; value: number; subject: "LEFT" | "RIGHT" | "OVERALL" | null }
  | { kind: "SOURCE_NARRATIVE"; normalized: null }
  | { kind: "DATE_EVENT"; rawDate: string; normalized: string | null; dateKind: NonNullable<ClinicalEvidenceItem["dateKind"]> };

export type ClinicalExtractionCounters = {
  table_objects_missing_but_fallback_used: number;
  spatial_rows_reconstructed: number;
  spatial_rows_needing_review: number;
  layout_reconstruction_failures: number;
  pathology_pattern_misses: number;
  false_verified_count: number | null;
  benchmark_regression_count: number | null;
};

export type ClinicalEvidenceLinkType = "RECOMMENDS" | "RESULT_OF" | "ADDENDUM_TO" | "COMPARED_WITH" | "REFERENCES";
export type ClinicalEvidenceLink = {
  sourceDocumentId: string;
  targetDocumentId: string;
  linkType: ClinicalEvidenceLinkType;
  basis: string;
  confidence: number;
  verificationStatus: VerificationStatus;
};
