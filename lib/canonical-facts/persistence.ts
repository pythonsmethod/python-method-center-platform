import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanonicalFactCounters, CanonicalLabFact } from "@/lib/canonical-facts/types";

export type CanonicalFactPersistenceInput = {
  profileId: string;
  caseId: string;
  sourceDocumentId: string;
  sourceFingerprint: string;
  extractionProvider: string;
  extractionVersion: string;
  parserVersion: string;
  rawResponseLocation?: string | null;
  counters: CanonicalFactCounters;
  facts: CanonicalLabFact[];
};

function factRow(fact: CanonicalLabFact, extractionId: string, profileId: string) {
  return {
    id: fact.factId,
    extraction_id: extractionId,
    case_id: fact.caseId,
    profile_id: profileId,
    source_document_id: fact.sourceDocumentId,
    fact_fingerprint: fact.factFingerprint,
    source_page: fact.sourcePage,
    source_coordinates: fact.sourceCoordinates,
    original_test_name: fact.originalTestName,
    normalized_test_name: fact.normalizedTestName,
    standard_code: fact.standardCode,
    value_original: fact.valueOriginal,
    value_numeric: fact.valueNumeric,
    value_comparator: fact.valueComparator,
    unit_original: fact.unitOriginal,
    unit_normalized: fact.unitNormalized,
    reference_original: fact.referenceOriginal,
    reference_low: fact.referenceLow,
    reference_high: fact.referenceHigh,
    lab_flag_original: fact.labFlagOriginal,
    order_date: fact.orderDate,
    collection_date: fact.collectionDate,
    received_date: fact.receivedDate,
    result_date: fact.resultDate,
    report_date: fact.reportDate,
    laboratory_name: fact.laboratoryName,
    method: fact.method,
    extraction_confidence: fact.extractionConfidence,
    verification_status: fact.verificationStatus,
    verification_issues: fact.verificationIssues,
    normalization_status: fact.normalizationStatus,
    comparability_status: fact.comparabilityStatus,
    extraction_provider: fact.extractionProvider,
    extraction_version: fact.extractionVersion
  };
}

/** Service-role only. The production document worker intentionally does not call this in Phase 2. */
export async function persistCanonicalFacts(supabase: SupabaseClient, input: CanonicalFactPersistenceInput) {
  const extraction = {
    source_document_id: input.sourceDocumentId,
    case_id: input.caseId,
    profile_id: input.profileId,
    source_fingerprint: input.sourceFingerprint,
    extraction_provider: input.extractionProvider,
    extraction_version: input.extractionVersion,
    parser_version: input.parserVersion,
    raw_response_location: input.rawResponseLocation ?? null,
    counters: input.counters
  };
  const { data: run, error: runError } = await supabase
    .from("canonical_fact_extractions")
    .upsert(extraction, {
      onConflict: "source_document_id,source_fingerprint,extraction_provider,extraction_version,parser_version"
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error("Canonical extraction persistence failed");

  if (input.facts.length) {
    const { error: factsError } = await supabase
      .from("canonical_lab_facts")
      .upsert(input.facts.map((fact) => factRow(fact, String(run.id), input.profileId)), {
        onConflict: "extraction_id,fact_fingerprint"
      });
    if (factsError) throw new Error("Canonical fact persistence failed");
  }
  return { extractionId: String(run.id), factCount: input.facts.length };
}
