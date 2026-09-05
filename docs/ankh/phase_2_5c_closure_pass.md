# Phase 2.5C Closure Pass — complete, review-only

## A. Decision
CLOSURE PASS COMPLETE. The grouped staging implementation, fresh real-source replay and source review of all 47 targets are complete. All candidates remain NEEDS_REVIEW; this result does not authorize production extraction or Phase 3 interpretation.

## B. Scope
Opt-in extraction and evaluation only; no production deployment, persistence migration, new provider, Case workflow or Phase 3 interpretation.

## C. Root-cause matrix
`phase_2_5c_root_cause_matrix.md` and the corresponding JSON contain all 31 previously unmatched targets. Root causes are hypotheses from code and visual reading. Unknown OCR/candidate/token fields remain null until replay.

## D. Grouped mechanisms
`bounded-source.ts` handles bounded narrative, contextual scalar and multidimensional measurements, explicitly labeled event dates and source BI-RADS categories. It uses section and field boundaries rather than per-target IDs.

## E. Narrative
Source wording and input-block character offsets are retained. Wrapping is bounded by recognized sections, named fields and identity barriers. No generated clinical interpretation is added. These boundaries are extraction heuristics, not a de-identification guarantee.

## F. Measurements
Dimensions and source units are separate from scalar numeric values. Mixed units remain narrative with a review issue. Anatomy and laterality are retained when supported by the span; conflicting laterality remains unresolved. No cross-document lesion matching is attempted.

## G. Dates
Date semantics come from explicit labels and inline or immediately adjacent date-only values. Slash dates require an explicit date order. Invalid or conflicting dates are retained for review without a normalized event date. Spatially separated date columns remain a replay risk.

## H. Categories
BI-RADS categories retain the source subject where explicit. The parser does not infer a diagnosis from the category.

## I. Schema
`ClinicalStructuredPayload` adds staging measurement, category, narrative and date payloads. Persistence support is not enabled; this remains an explicit integration gap rather than an applied migration.

## J. Routing
`extractClinicalClosureDocumentEvidence` is opt-in. It forces all combined legacy and new candidates to NEEDS_REVIEW and adds the independent-source-verification requirement. Existing production call sites are not switched to this path.

## K. Provenance
New candidates retain input-block offsets and region coordinates when supplied. Block coordinates are not a claim of complete supporting-token provenance. Complete token linkage remains unmeasured on the real corpus.

## L. Independent Gold
`closure-benchmark.ts` accepts separately supplied source expectations and reviewer metadata. Document, page and source span are matched before values. The evaluator cannot itself establish that an annotation was independently made. No real target is marked independently verified in this pass.

## M. Annotation correction
The previous pass observed mitotic score 2 in capture 7 where the historical predicate expected 3. The historical Gold remains unchanged. The real minimized pathology fixture preserves this discrepancy. A complete versioned correction ledger with adjudicated source anchors is still required.

## N. All 47 targets
`output/ankh-benchmark/phase-2-5c-closure-status.json` and `phase-2-5c-closure-benchmark.json` preserve every target ID. The fresh replay captured the expected source evidence for 47/47 targets. Forty-six targets are exact-source-match NEEDS_REVIEW; `b_path_link` is SOURCE_ONLY NEEDS_REVIEW because the documents do not provide a deterministic identity link. No target was promoted to VERIFIED.

## O. Metrics
Fresh Closure result: auto VERIFIED 0; NEEDS_REVIEW 47; source-only 1; source evidence captured 47; missed 0; false VERIFIED 0; independently source-reviewed 47; region provenance 47; complete token provenance 0; target regressions 0; staging schema gaps 0. “Independent” here means visual review of the source performed separately from parser output; a second human reviewer did not participate. Historical 16/47 remains a different source-pattern baseline.

## P. Cross-document linkage
The opt-in path does not infer links from co-occurring recommendations and procedures. The pathology-addendum linkage target remains source-only pending explicit source support and adjudication.

## Q. Tests
15 new synthetic tests cover extraction and evaluator behavior, including conflicting dates/units/laterality, source boundaries, wrong values, missing independent review and unmatched VERIFIED facts. The earlier two real minimized regions remain available; additional real fixtures for the new mechanisms are outstanding.

## R. Validation
Full suite: 715 passed, 2 failed; 98 passed test files and 1 failed file. Both failures are existing expectations in `tests/free-review-description.test.ts` concerning free-review copy/date, outside this extraction change. Typecheck and ESLint pass. Full output: `output/ankh-benchmark/phase25c-closure-tests.log`.

## S. Authorized replay and cleanup
After explicit user confirmation, eight images were uploaded to `/home/pythonmethodcenter/ankh-phase25c-temp` in project `pythons-ankh-analysis`. Document AI `pretrained-ocr-v2.1-2024-08-07` returned 4,212 tokens and no API errors. The upload UI placed the files in the home directory despite the selected destination; they were immediately moved to the private directory and set to mode 600.

After the benchmark, an exact pre-clean inventory was asserted. Eight JPG files, eight full Document AI responses, the full parser output and three temporary scripts/bundles were deleted. The temporary directory is absent. A recursive leak check under `/home/pythonmethodcenter` found no JPG/JPEG, `response-*`, full parser output or named temporary runner/bundles. The retained minimized benchmark is 20,157 bytes with SHA-256 `687dbc0de8b146db9b9626c185c051fce2b69a0b7a7095faf4131c8d6ce648dc`. Local temporary runner files were also deleted. Original user attachments were not deleted.

## T. Reproducibility
The extraction and evaluator are covered by local tests, the 47-row minimized benchmark is retained, and provider/parser versions are pinned in the artifact. Replaying the real corpus requires access to the original authorized images; full OCR responses are intentionally not retained.

## U. Remaining quality gates
Complete supporting-token provenance is still absent, and all real candidates require review. A second reviewer would strengthen independence. These limits prevent an automatic-accuracy or production-readiness claim, but they do not leave an unaccounted target in this Closure Pass.

## V. Go / no-go
GO to close this bounded Phase 2.5C Closure Pass as review-only. NO-GO for automatic clinical verification, production rollout or dependent Phase 3 interpretation. Region evidence and review routing are validated; token-level proof and automatic verification are not.
