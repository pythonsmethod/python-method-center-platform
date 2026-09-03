import { extractClinicalEvidence, type ClinicalEvidenceContext, type EvidenceTextBlock } from "./parsing";
import { extractSpatialEvidence } from "./spatial-evidence";
import type { SpatialOptions, SpatialToken } from "./spatial-table";
import type { ClinicalExtractionCounters } from "./types";
import { extractBoundedSourceEvidence, type SourceExtractionOptions } from "./bounded-source";
import { attachExactTokenProvenance } from "./provenance";

/** Staging entry point. No persistence, remote calls, clinical interpretation or PHI logs. */
export function extractClinicalDocumentEvidence(input: { blocks: EvidenceTextBlock[]; tokens: SpatialToken[]; layout: SpatialOptions }, context: ClinicalEvidenceContext) {
  const textual = extractClinicalEvidence(input.blocks, context);
  const spatial = extractSpatialEvidence(input.tokens, context, input.layout);
  const sourceKey = (text: string) => text.toLowerCase().replace(/[:|]/g, " ").replace(/\s+/g, " ").trim();
  // Deduplicate exact source-equivalent rows only; never discard other narrative facts.
  const facts = [...textual.filter((f) => !(f.evidenceType === "BIOMARKER" && spatial.facts.some((s) => s.sourcePage === f.sourcePage && sourceKey(s.originalText) === sourceKey(f.originalText)))), ...spatial.facts];
  const counters: ClinicalExtractionCounters = { ...spatial.counters,
    pathology_pattern_misses: textual.filter((f) => f.codedValue === "MITOTIC_SCORE" && f.numericValue === null).length,
    // Truth-dependent metrics must not be manufactured by an extraction run.
    false_verified_count: null, benchmark_regression_count: null
  };
  return { facts, tables: spatial.tables, counters };
}

/** Closure staging path: independent adjudication must follow this extraction. */
export function extractClinicalClosureDocumentEvidence(input: { blocks: EvidenceTextBlock[]; tokens: SpatialToken[]; layout: SpatialOptions }, context: ClinicalEvidenceContext, options: SourceExtractionOptions = {}) {
  const prior = extractClinicalDocumentEvidence(input, context);
  const bounded = extractBoundedSourceEvidence(input.blocks, context, options);
  const facts = [...prior.facts, ...bounded].map((fact) => ({ ...fact,
    verificationStatus: "NEEDS_REVIEW" as const,
    verificationIssues: [...new Set([...(fact.verificationIssues ?? []), "INDEPENDENT_SOURCE_VERIFICATION_REQUIRED"])]
  }));
  return { ...prior, facts: attachExactTokenProvenance([...new Map(facts.map((f) => [f.evidenceId, f])).values()], input.tokens) };
}
