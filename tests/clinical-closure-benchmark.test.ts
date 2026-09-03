import { expect, it } from "vitest";
import { evaluateClinicalClosure, type ClinicalGoldTarget } from "@/lib/clinical-evidence/closure-benchmark";
import { extractBoundedSourceEvidence } from "@/lib/clinical-evidence/bounded-source";

const source = "Left breast mass measures 7 mm.";
const facts = extractBoundedSourceEvidence([{ text: source, page: 1 }], { caseId: "fixture", sourceDocumentId: "doc", providerVersion: "fixture", parserVersion: "fixture" });
const measurement = facts.find((f) => f.evidenceType === "MEASUREMENT")!;
const truth: ClinicalGoldTarget = { targetId: "size", documentId: "doc", page: 1, sourceText: source, expected: { numericValue: 7 }, intendedRoute: "STRUCTURED", independentReview: { confirmed: true, sourceReference: "synthetic-authored-gold", reviewerId: "synthetic-author", method: "INDEPENDENT_ANNOTATION" } };

it("does not count a source-only match as exact structured extraction", () => {
  const result = evaluateClinicalClosure([truth], [facts.find((f) => f.evidenceType !== "MEASUREMENT")!]);
  expect(result.rows[0]).toMatchObject({ outcome: "NEEDS_REVIEW", exactCandidate: false });
});
it("detects a false verified numeric value even when the source text matches", () => {
  const result = evaluateClinicalClosure([truth], [{ ...measurement, numericValue: 70, verificationStatus: "VERIFIED" }]);
  expect(result.metrics.false_verified_targets).toBe(1);
  expect(result.metrics.auto_verified_targets).toBe(0);
});
it("requires source-backed adjudication and never adopts parser output as Gold", () => {
  const target = { ...truth, independentReview: { ...truth.independentReview, confirmed: false } };
  const result = evaluateClinicalClosure([target], [{ ...measurement, verificationStatus: "VERIFIED" }]);
  expect(result.metrics.independent_verified_targets).toBe(0);
  expect(result.metrics.false_verified_targets).toBe(1);
});
it("keeps review, intentional source-only and missed targets separate", () => {
  const targets: ClinicalGoldTarget[] = [truth, { ...truth, targetId: "source-only", intendedRoute: "SOURCE_ONLY" }, { ...truth, targetId: "missing", page: 2 }];
  const result = evaluateClinicalClosure(targets, [measurement]);
  expect(result.metrics).toMatchObject({ needs_review_targets: 1, not_structurable_targets: 1, missed_targets: 1, auto_verified_targets: 0 });
});
it("rejects duplicate target IDs and flags unadjudicated auto-verified extras", () => {
  expect(() => evaluateClinicalClosure([truth, truth], [])).toThrow("Duplicate");
  expect(evaluateClinicalClosure([], [{ ...measurement, verificationStatus: "VERIFIED" }]).metrics.unadjudicated_verified_facts).toBe(1);
});
