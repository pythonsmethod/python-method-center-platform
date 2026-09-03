export type VerificationStatus = "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
export type NormalizationStatus = "NORMALIZED" | "UNRESOLVED";
export type ComparabilityStatus = "HIGH" | "MODERATE" | "LIMITED" | "NOT_COMPARABLE";

export type BoundingPolygon = {
  normalizedVertices?: Array<{ x?: number; y?: number }>;
  vertices?: Array<{ x?: number; y?: number }>;
};

export type ExtractedLabRow = {
  originalTestName: string;
  valueOriginal: string;
  unitOriginal?: string | null;
  referenceOriginal?: string | null;
  labFlagOriginal?: string | null;
  sourcePage: number;
  sourceCoordinates?: BoundingPolygon | null;
  extractionConfidence?: number | null;
  orderDate?: string | null;
  collectionDate?: string | null;
  receivedDate?: string | null;
  resultDate?: string | null;
  reportDate?: string | null;
  laboratoryName?: string | null;
  method?: string | null;
  associationAmbiguous?: boolean;
};

export type CanonicalLabFact = {
  factId: string;
  factFingerprint: string;
  caseId: string;
  sourceDocumentId: string;
  sourcePage: number;
  sourceCoordinates: BoundingPolygon | null;
  originalTestName: string;
  normalizedTestName: string | null;
  standardCode: string | null;
  valueOriginal: string;
  valueNumeric: number | null;
  valueComparator: "<" | ">" | "<=" | ">=" | null;
  unitOriginal: string | null;
  unitNormalized: string | null;
  referenceOriginal: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  labFlagOriginal: string | null;
  orderDate: string | null;
  collectionDate: string | null;
  receivedDate: string | null;
  resultDate: string | null;
  reportDate: string | null;
  laboratoryName: string | null;
  method: string | null;
  extractionConfidence: number | null;
  verificationStatus: VerificationStatus;
  verificationIssues: string[];
  normalizationStatus: NormalizationStatus;
  comparabilityStatus: ComparabilityStatus;
  extractionProvider: string;
  extractionVersion: string;
};

export type CanonicalFactCounters = {
  documents_processed: number;
  facts_extracted: number;
  facts_verified: number;
  facts_needing_review: number;
  facts_rejected: number;
  parser_errors: number;
  normalization_unresolved: number;
};

export type SelectiveVerificationRequest = {
  sourceDocumentId: string;
  factFingerprint: string;
  reason: string;
  fields: Array<"value" | "unit" | "reference" | "date" | "row_association" | "provenance">;
};
