/** Terminology lookup results are reference data, never patient findings or accepted mappings. */
export type CatalogSystem = "LOINC" | "GTR" | "PMC_FAMILY";
export type CatalogTerm = {
  system: CatalogSystem;
  code: string;
  display: string;
  version: string;
  method?: string;
  property?: string;
  laboratory?: string;
  testType?: string;
  copyrightNotice?: string;
};
export type CatalogLookup = {
  version: string;
  state: "declared_code_found" | "declared_code_unknown" | "conflicting_codes" | "candidates" | "unknown" | "unavailable" | "input_too_long";
  query: string;
  queryBasis: "source_name" | "source_linked_test" | "pmc_name_alias";
  totalCandidates: number;
  candidates: CatalogTerm[];
  truncated: boolean;
  assignedStandardCode: null;
  clinicalFactVerified: false;
  requiresHumanReview: true;
  unit: { original: string; listedCaseSensitiveCode: boolean; conversionPerformed: false } | null;
};
export type CatalogInput = { name: string; unit?: string | null };
export interface DiagnosticCatalog {
  version: string;
  resolve(input: CatalogInput): CatalogLookup;
}
