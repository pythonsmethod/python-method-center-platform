import type { DeterministicCheckName, EvidenceClass, ProvenanceLevel, TrustReasonCode } from "./types";

export const TRUST_POLICY_VERSION = "phase-2.7-shadow-v1";
export type TrustPolicy = {
  evidenceClass: EvidenceClass;
  requiredFields: Array<"value" | "unit" | "reference" | "date" | "label" | "laterality" | "site">;
  minimum: { ocrText: number; layout?: number; fieldParse: number; sourceProvenance: number; documentQuality: number; normalization?: number; contextAssociation?: number };
  requiredProvenance: ProvenanceLevel;
  requiredChecks: DeterministicCheckName[];
  crossCheck: "REQUIRED" | "OPTIONAL";
  normalization: "REQUIRED" | "OPTIONAL";
  missingSignalRoute: "NEEDS_REVIEW" | "REJECTED";
  sourceAmbiguousRoute: "NEEDS_REVIEW" | "SOURCE_ONLY";
};

const base = { minimum: { ocrText: .98, fieldParse: .98, sourceProvenance: .98, documentQuality: .9 }, requiredProvenance: "P3" as const, crossCheck: "REQUIRED" as const, normalization: "OPTIONAL" as const, missingSignalRoute: "NEEDS_REVIEW" as const, sourceAmbiguousRoute: "SOURCE_ONLY" as const };
export const TRUST_POLICIES: Record<EvidenceClass, TrustPolicy> = {
  LAB_NUMERIC: { ...base, evidenceClass:"LAB_NUMERIC", requiredFields:["value","unit","label"], minimum:{...base.minimum,layout:.97,contextAssociation:.98}, requiredChecks:["NUMERIC_PARSE","UNIT_VALUE_SEPARATION","LABEL_VALUE_ASSOCIATION","IDEMPOTENCY","SOURCE_EXISTS","SCHEMA_CONSTRAINTS","LAYOUT_CONTRADICTION"], normalization:"REQUIRED" },
  LAB_REFERENCE_RANGE: { ...base, evidenceClass:"LAB_REFERENCE_RANGE", requiredFields:["reference","label"], minimum:{...base.minimum,layout:.98,contextAssociation:.98}, requiredChecks:["REFERENCE_VALUE_SEPARATION","LABEL_VALUE_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS","LAYOUT_CONTRADICTION"] },
  BIOMARKER_STRUCTURED: { ...base, evidenceClass:"BIOMARKER_STRUCTURED", requiredFields:["value","label"], minimum:{...base.minimum,layout:.98,contextAssociation:.99}, requiredChecks:["LABEL_VALUE_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS","LAYOUT_CONTRADICTION"], requiredProvenance:"P4" },
  RADIOLOGY_MEASUREMENT: { ...base, evidenceClass:"RADIOLOGY_MEASUREMENT", requiredFields:["value","unit","site"], minimum:{...base.minimum,layout:.97,contextAssociation:.99}, requiredChecks:["NUMERIC_PARSE","UNIT_VALUE_SEPARATION","LATERALITY_SITE_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], requiredProvenance:"P4" },
  RADIOLOGY_CODED_CATEGORY: { ...base, evidenceClass:"RADIOLOGY_CODED_CATEGORY", requiredFields:["value","label"], minimum:{...base.minimum,layout:.97,contextAssociation:.99}, requiredChecks:["LABEL_VALUE_ASSOCIATION","LATERALITY_SITE_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], requiredProvenance:"P4" },
  PATHOLOGY_STRUCTURED_SCORE: { ...base, evidenceClass:"PATHOLOGY_STRUCTURED_SCORE", requiredFields:["value","label"], minimum:{...base.minimum,layout:.97,contextAssociation:.99}, requiredChecks:["NUMERIC_PARSE","LABEL_VALUE_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], requiredProvenance:"P4" },
  PATHOLOGY_NARRATIVE: { ...base, evidenceClass:"PATHOLOGY_NARRATIVE", requiredFields:[], minimum:{...base.minimum}, requiredChecks:["SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], sourceAmbiguousRoute:"SOURCE_ONLY" },
  PROCEDURE_STRUCTURED_FACT: { ...base, evidenceClass:"PROCEDURE_STRUCTURED_FACT", requiredFields:["label"], minimum:{...base.minimum,contextAssociation:.99}, requiredChecks:["LABEL_VALUE_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], requiredProvenance:"P4" },
  DATE_EVENT: { ...base, evidenceClass:"DATE_EVENT", requiredFields:["date","label"], minimum:{...base.minimum,contextAssociation:.99}, requiredChecks:["DATE_EVENT_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], requiredProvenance:"P4" },
  LATERALITY_SITE: { ...base, evidenceClass:"LATERALITY_SITE", requiredFields:["laterality","site"], minimum:{...base.minimum,contextAssociation:.99}, requiredChecks:["LATERALITY_SITE_ASSOCIATION","SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], requiredProvenance:"P4" },
  DOCUMENT_RELATION: { ...base, evidenceClass:"DOCUMENT_RELATION", requiredFields:[], minimum:{...base.minimum,contextAssociation:.995}, requiredChecks:["SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], requiredProvenance:"P4", sourceAmbiguousRoute:"SOURCE_ONLY" },
  NARRATIVE_SOURCE_FACT: { ...base, evidenceClass:"NARRATIVE_SOURCE_FACT", requiredFields:[], minimum:{...base.minimum}, requiredChecks:["SOURCE_EXISTS","SCHEMA_CONSTRAINTS"], sourceAmbiguousRoute:"SOURCE_ONLY" }
};

export const failureReasonForCheck: Partial<Record<DeterministicCheckName, TrustReasonCode>> = {
  UNIT_VALUE_SEPARATION:"UNIT_ASSOCIATION_UNCERTAIN", REFERENCE_VALUE_SEPARATION:"VALUE_REFERENCE_CONFLICT",
  DATE_EVENT_ASSOCIATION:"DATE_EVENT_UNCERTAIN", LATERALITY_SITE_ASSOCIATION:"LATERALITY_UNCERTAIN",
  LABEL_VALUE_ASSOCIATION:"AMBIGUOUS_ROW_ASSOCIATION", SOURCE_EXISTS:"MISSING_REGION_PROVENANCE",
  LAYOUT_CONTRADICTION:"AMBIGUOUS_ROW_ASSOCIATION"
};
