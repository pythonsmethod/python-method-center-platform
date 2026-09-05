import type { ClinicalEvidenceItem, ClinicalStructuredPayload } from "./types";

export type ClinicalGoldTarget = {
  targetId: string;
  documentId: string;
  page: number;
  sourceText: string;
  expected: { numericValue?: number; eventDate?: string; laterality?: ClinicalEvidenceItem["laterality"]; payload?: ClinicalStructuredPayload };
  intendedRoute: "STRUCTURED" | "NEEDS_REVIEW" | "SOURCE_ONLY";
  independentReview: { confirmed: boolean; sourceReference: string | null; method: "VISUAL_SOURCE" | "INDEPENDENT_ANNOTATION" | "UNREVIEWED"; reviewerId: string | null };
};
export type ClosureOutcome = "EXACT_VERIFIED" | "SOURCE_VERIFIED_NARRATIVE" | "NEEDS_REVIEW" | "NOT_STRUCTURABLE" | "MISSED";
const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
};

/** Truth is supplied separately, never derived from the evaluated parser output. */
export function evaluateClinicalClosure(targets: ClinicalGoldTarget[], facts: ClinicalEvidenceItem[]) {
  if (new Set(targets.map((t) => t.targetId)).size !== targets.length) throw new Error("Duplicate Gold target IDs");
  const independentlyReviewed = (t: ClinicalGoldTarget) => Boolean(t.independentReview.confirmed && t.independentReview.sourceReference && t.independentReview.reviewerId && t.independentReview.method !== "UNREVIEWED");
  const rows = targets.map((target) => {
    // Scope first; matching text in another document/page must not satisfy truth.
    const candidates = facts.filter((f) => f.sourceDocumentId === target.documentId && f.sourcePage === target.page && target.sourceText.trim() && key(f.originalText).includes(key(target.sourceText)));
    const exact = (f: ClinicalEvidenceItem) =>
      (target.expected.numericValue === undefined || f.numericValue === target.expected.numericValue) &&
      (target.expected.eventDate === undefined || f.eventDate === target.expected.eventDate) &&
      (target.expected.laterality === undefined || f.laterality === target.expected.laterality) &&
      (target.expected.payload === undefined || stable(f.structuredPayload) === stable(target.expected.payload));
    const hasExactExpectation = Object.keys(target.expected).length > 0;
    const independent = independentlyReviewed(target);
    const candidate = candidates.find(exact) ?? candidates[0];
    const falseVerified = candidates.filter((f) => f.verificationStatus === "VERIFIED" && (!independent || !exact(f) || target.intendedRoute !== "STRUCTURED" || !hasExactExpectation)).length;
    let outcome: ClosureOutcome = "MISSED";
    if (candidate) {
      if (target.intendedRoute === "SOURCE_ONLY") outcome = "NOT_STRUCTURABLE";
      else if (hasExactExpectation && exact(candidate) && independent && candidate.verificationStatus === "VERIFIED" && target.intendedRoute === "STRUCTURED") outcome = "EXACT_VERIFIED";
      else if (!hasExactExpectation && independent && target.intendedRoute !== "NEEDS_REVIEW") outcome = "SOURCE_VERIFIED_NARRATIVE";
      else outcome = "NEEDS_REVIEW";
    }
    return { targetId: target.targetId, outcome, independently_verified: independent,
      exactCandidate: candidate ? hasExactExpectation && exact(candidate) : false,
      sourceEvidenceCaptured: candidates.length > 0,
      regionProvenance: candidate ? Boolean(candidate.sourceCoordinates) : false,
      falseVerified, matchingEvidenceIds: candidates.map((f) => f.evidenceId) };
  });
  const covered = new Set(rows.flatMap((r) => r.matchingEvidenceIds));
  const unadjudicatedVerified = facts.filter((f) => f.verificationStatus === "VERIFIED" && !covered.has(f.evidenceId)).length;
  return { total: targets.length, rows, metrics: {
    auto_verified_targets: rows.filter((r) => r.outcome === "EXACT_VERIFIED").length,
    needs_review_targets: rows.filter((r) => r.outcome === "NEEDS_REVIEW").length,
    not_structurable_targets: rows.filter((r) => r.outcome === "NOT_STRUCTURABLE").length,
    source_verified_narrative_targets: rows.filter((r) => r.outcome === "SOURCE_VERIFIED_NARRATIVE").length,
    source_evidence_captured: rows.filter((r) => r.sourceEvidenceCaptured).length,
    missed_targets: rows.filter((r) => r.outcome === "MISSED").length,
    independent_verified_targets: rows.filter((r) => r.independently_verified).length,
    false_verified_targets: rows.filter((r) => r.falseVerified > 0).length,
    unadjudicated_verified_facts: unadjudicatedVerified,
    region_provenance_targets: rows.filter((r) => r.regionProvenance).length
  } };
}
