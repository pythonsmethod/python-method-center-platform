# Phase 2.7 — Verification Trust Framework

## A. Audit of existing verification logic

Canonical lab facts currently use a compact confidence/provenance rule and can become VERIFIED at extraction time. Clinical text parsing historically treated a high-confidence region as VERIFIED, while the Phase 2.5C opt-in closure path overrides all clinical candidates to NEEDS_REVIEW. Confidence dimensions, policy version, independent cross-check and auditable failed gates were absent. The new layer does not alter those source pipelines or stored facts.

## B. Trust dimensions implemented

OCR text, layout, field parse, source provenance, normalization, cross-check, document quality and context association remain separate nullable dimensions in every decision.

## C. Evidence classes

Twelve classes are defined: lab numeric, lab reference range, structured biomarker, radiology measurement, radiology coded category, pathology structured score, pathology narrative, procedure structured fact, date event, laterality/site, document relation and narrative source fact.

## D. Gate policies

`TRUST_POLICIES` defines required fields, per-dimension thresholds, provenance, deterministic checks, cross-check requirements, normalization and failure routing per class. There are no target-specific thresholds.

## E. Provenance levels

P0–P4 are implemented as ordered explicit levels. P2 never satisfies a P3/P4 requirement. Current 47-target evidence remains P2.

## F. Deterministic checks

The decision engine verifies presence and success of every class-required deterministic result. Competing candidates and source ambiguity are evaluated separately.

## G. Second-pass design

Cross-check records include method, result and whether the signal is independent. Circular checks cannot satisfy a required cross-check. Spatial reevaluation and exact-span verification are supported now; a second-provider interface is represented without connecting a provider.

## H. Trust decision object

The object contains fact/class/input state, all dimensions, provenance, deterministic and cross-check results, failed gates, final shadow state, reasons, policy version, `wouldAutoVerify`, and evaluation time. Inputs are copied into the decision to preserve the historical snapshot.

## I. Reason codes

All codes requested by the Phase 2.7 specification are typed and tested. Unknown/missing required checks use `POLICY_REQUIREMENT_NOT_MET` rather than silently passing.

## J. Policy versioning

Version `phase-2.7-shadow-v1` is explicit. Decision IDs include fact, policy and evaluation time. The repository-only migration stores immutable policy versions and append-only decisions.

## K. Shadow mode implementation

`evaluateShadow` returns the unchanged stored verification state plus a proposed trust decision. It has no persistence side effect and never edits the candidate.

## L. 47-target shadow result

All 47 Phase 2.5C targets were evaluated from the minimized Closure artifact. None passes because all have P2 region provenance while policies require P3/P4. Forty-six route to NEEDS_REVIEW; the ambiguous cross-document `b_path_link` routes to SOURCE_ONLY. Stored states remain NEEDS_REVIEW.

## M. Auto-verify coverage

0/47 (0%). Needs-review rate is 46/47; source-only rate is 1/47; rejected rate is 0.

## N. Shadow precision / false auto-verified

False auto-verified count is exactly 0. Precision is null because there are zero proposed auto-verifications; it is not presented as 100%. A test with corrected human truth proves false-auto-verified detection.

## O. Blocked-gate distribution

`MISSING_TOKEN_PROVENANCE`: 47. Provenance distribution: P2=47. Cross-check disagreement rate: 0. Per-class totals and coverage are recorded in `output/ankh-benchmark/phase-2-7-shadow-benchmark.json`.

## P. Tests and exact results

The Phase 2.7 suite covers every policy class, missing signals, low OCR/layout, good OCR with bad layout, normalization, second-pass disagreement, circular validation, provenance, ambiguity routing, shadow immutability, version snapshots, migration isolation, all 47 targets and false-auto detection. Focused run: 27/27 passed. Full repository run: 741 passed and 2 pre-existing failures in `tests/free-review-description.test.ts`; 100 test files passed and one failed. TypeScript, ESLint and `git diff --check` pass.

## Q. Files created/changed

`lib/verification-trust/*`, two Phase 2.7 tests, the shadow benchmark, this document, `auto_verification_policy.md`, and repository migration `20260903182611_verification_trust_shadow_layer.sql`.

## R. Known limitations

The current Case has no complete token provenance, no second-human calibration and no staging persistence exercise. Confidence inputs must come from future extraction adapters; the framework does not manufacture missing signals. Broader validation must cover multiple lab, pathology and radiology formats, mobile photos, original PDFs, languages, low-quality scans, multipage reports and corrected/addendum documents.

Human calibration records reviewer ID/role, timestamp, source-confirmed value, outcome, disagreement and adjudication separately from model decisions. Current single-executor visual review is not second-human review.

## S. GO / NO-GO for Phase 3 architecture

Conditional GO for non-production/test-only Phase 3 architecture if it consumes VERIFIED or explicitly review-marked evidence and preserves these trust decisions. No interpretation implementation is included here.

## T. GO / NO-GO for production auto-verification

NO-GO. Required prerequisites are broader multi-case validation, calibrated risk thresholds, second-human review data, staging persistence validation, PHI/compliance closure, monitoring and rollback.

## U. Exact next action

Add P3 token/span provenance adapters to the extraction outputs, then run the unchanged shadow policy on a broader multi-format calibration set with independent human review. Do not lower the P3/P4 requirements to increase coverage.
