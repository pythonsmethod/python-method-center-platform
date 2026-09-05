import type { VerificationStatus } from "@/lib/canonical-facts/types";

export const EVIDENCE_CLASSES = [
  "LAB_NUMERIC", "LAB_REFERENCE_RANGE", "BIOMARKER_STRUCTURED", "RADIOLOGY_MEASUREMENT",
  "RADIOLOGY_CODED_CATEGORY", "PATHOLOGY_STRUCTURED_SCORE", "PATHOLOGY_NARRATIVE",
  "PROCEDURE_STRUCTURED_FACT", "DATE_EVENT", "LATERALITY_SITE", "DOCUMENT_RELATION",
  "NARRATIVE_SOURCE_FACT"
] as const;
export type EvidenceClass = typeof EVIDENCE_CLASSES[number];
export type ProvenanceLevel = "P0" | "P1" | "P2" | "P3" | "P4";
export type TrustState = VerificationStatus | "SOURCE_ONLY";
export type ConfidenceDimensions = {
  ocrText: number | null;
  layout: number | null;
  fieldParse: number | null;
  sourceProvenance: number | null;
  normalization: number | null;
  crossCheck: number | null;
  documentQuality: number | null;
  contextAssociation: number | null;
};
export const TRUST_REASON_CODES = [
  "LOW_OCR_CONFIDENCE", "LOW_LAYOUT_CONFIDENCE", "AMBIGUOUS_ROW_ASSOCIATION",
  "MISSING_TOKEN_PROVENANCE", "INSUFFICIENT_PROVENANCE_LEVEL", "MISSING_REGION_PROVENANCE", "VALUE_REFERENCE_CONFLICT",
  "UNIT_ASSOCIATION_UNCERTAIN", "DATE_EVENT_UNCERTAIN", "LATERALITY_UNCERTAIN",
  "NORMALIZATION_UNRESOLVED", "SECOND_PASS_DISAGREEMENT", "SOURCE_AMBIGUOUS",
  "DOCUMENT_QUALITY_LOW", "POLICY_REQUIREMENT_NOT_MET"
] as const;
export type TrustReasonCode = typeof TRUST_REASON_CODES[number];
export type DeterministicCheckName = "NUMERIC_PARSE" | "UNIT_VALUE_SEPARATION" | "REFERENCE_VALUE_SEPARATION" | "LABEL_VALUE_ASSOCIATION" | "DATE_EVENT_ASSOCIATION" | "LATERALITY_SITE_ASSOCIATION" | "IDEMPOTENCY" | "SOURCE_EXISTS" | "SCHEMA_CONSTRAINTS" | "LAYOUT_CONTRADICTION";
export type CheckResult = { name: DeterministicCheckName; passed: boolean; status?: "PASSED" | "FAILED" | "NOT_EVALUATED"; detail?: string };
export type CrossCheckResult = { method: "INDEPENDENT_PARSER" | "SPATIAL_REEVALUATION" | "EXACT_SOURCE_SPAN" | "SECOND_OCR_PROVIDER"; independentSignal: boolean; passed: boolean; detail?: string };

export type TrustCandidate = {
  factId: string;
  evidenceClass: EvidenceClass;
  inputVerificationState: VerificationStatus;
  confidences: ConfidenceDimensions;
  provenanceLevel: ProvenanceLevel;
  deterministicChecks: CheckResult[];
  crossChecks: CrossCheckResult[];
  normalizationRequired: boolean;
  competingCandidateCount: number;
  sourceAmbiguous: boolean;
};

export type TrustDecision = {
  decisionId: string;
  factId: string;
  evidenceClass: EvidenceClass;
  inputVerificationState: VerificationStatus;
  confidenceDimensions: ConfidenceDimensions;
  provenanceLevel: ProvenanceLevel;
  deterministicChecks: CheckResult[];
  crossCheckResults: CrossCheckResult[];
  failedGates: string[];
  finalVerificationState: TrustState;
  decisionReasonCodes: TrustReasonCode[];
  policyVersion: string;
  shadowDecision: true;
  wouldAutoVerify: boolean;
  shadowReasonCodes: TrustReasonCode[];
  evaluatedAt: string;
};

export type HumanReviewCalibration = {
  factId: string;
  reviewerId: string;
  reviewerRole: string;
  reviewedAt: string;
  sourceConfirmedValue: unknown;
  reviewOutcome: "CONFIRMED" | "CORRECTED" | "REJECTED" | "UNRESOLVED";
  disagreementReason: string | null;
  adjudicated: boolean;
};
