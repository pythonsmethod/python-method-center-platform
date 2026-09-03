# DECISIONS.md — ANKH ANALYSIS SYSTEM

This file records architectural decisions that must survive chat/thread changes.

Last canonical update: 2026-09-03. New decisions are appended with a new ID; historical decisions are not silently rewritten. If a decision is superseded, record the replacement and reference the prior ID.

---

## D-001 — Google Document AI is the initial primary OCR provider

Decision:
Use Google Document AI Enterprise OCR as the first production-oriented extraction provider.

Why:
- successful initial benchmark;
- good OCR quality on current materials;
- page/layout/token information;
- provider adapter already implemented.

Constraint:
Architecture remains provider-independent.

Do not hard-wire the entire platform to Google.

---

## D-002 — Do not trust one OCR output blindly

Decision:
OCR output is not automatically truth.

A fact moves through:
SOURCE → EXTRACTED → VERIFIED → NORMALIZED.

Why:
OCR can misread numbers, units, columns or dates even with high confidence.

---

## D-003 — Double OCR is selective, not mandatory

Decision:
Do not run two OCR providers for every field.

Second-pass verification is reserved for:
- low confidence;
- critical facts;
- layout ambiguity;
- conflicting evidence;
- quality-control sampling.

Why:
Two OCR systems can agree on the same wrong image; consensus is not proof.

---

## D-004 — Primary evidence is the source document

Decision:
The strongest evidence for an extracted fact is the original source region/span, not AI agreement.

The system must preserve source provenance.

---

## D-005 — Canonical facts do not overwrite originals

Decision:
Store original and normalized representations separately.

Why:
International units, languages and mappings can be wrong or revised later.

---

## D-006 — LOINC/UCUM are future standardization layers, not forced mappings

Decision:
Do not assign a standard code when mapping is uncertain.

Prefer unresolved over incorrect.

---

## D-007 — Lab reference flag is not clinical significance

Decision:
`HIGH/LOW` is stored as a laboratory/source fact.

It does not automatically mean:
- disease;
- importance;
- severity.

Trend/context will be evaluated separately.

---

## D-008 — Trend can matter even inside reference range

Decision:
Future analytical logic must detect meaningful change over time, not only red flags.

---

## D-009 — Do not model the body as rigid organ boxes internally

Decision:
UI may use familiar groups such as liver/kidney/hematology.

Internal reasoning should allow one fact to participate in multiple physiological processes.

---

## D-010 — Association is not causality

Decision:
Ankh may identify:
- sequence;
- temporal association;
- co-occurring change.

It must not automatically claim:
“X caused Y”.

---

## D-011 — Non-lab clinical evidence gets its own layer

Decision:
Radiology, pathology, procedures and biomarkers must not be forced into `canonical_lab_facts`.

Clinical Evidence layer exists for source-grounded non-lab facts.

---

## D-012 — Generic extraction mechanisms over Case-specific patches

Decision:
Do not create one rule per missing benchmark target.

Failures must be grouped by root cause/mechanism:
- table;
- key-value;
- narrative;
- measurement;
- date;
- layout;
- schema gap;
- linkage.

---

## D-013 — Safe review routing is a correct result

Decision:
`NEEDS_REVIEW` is not failure.

If evidence cannot be safely auto-verified, correct behavior is review routing.

---

## D-014 — SOURCE_ONLY is allowed

Decision:
Some evidence should remain source-only rather than being forced into a structured relation.

Example from real Case:
`b_path_link` remained source-only.

---

## D-015 — 47/47 source match does not mean 47/47 automatic trust

Decision:
Phase 2.5C achieved exact source match for 47 selected targets under visual review.

All 47 remained review-only.

This must not be presented as production auto-verification accuracy.

---

## D-016 — Region provenance is not token provenance

Decision:
The current system can have region provenance without exact P3 token/span provenance.

Never claim full token provenance unless exact source span/tokens are actually linked.

---

## D-017 — Verification policy is conservative by design

Decision:
Phase 2.7 shadow policy `phase-2.7-shadow-v1` yielded:
- 0/47 auto-verified;
- 0 false auto-verified.

This is acceptable.

Do not weaken the policy merely to increase coverage.

---

## D-018 — Confidence is multidimensional

Decision:
Do not collapse trust into one opaque OCR score.

Keep separate:
- OCR text confidence;
- layout confidence;
- field parse confidence;
- provenance confidence;
- normalization confidence;
- cross-check confidence;
- document quality;
- context association confidence.

---

## D-019 — Trust decisions are a separate auditable layer

Decision:
Trust decisions do not rewrite source or canonical facts.

They are:
- explainable;
- policy-versioned;
- append-only/auditable.

---

## D-020 — Shadow mode before production auto-verification

Decision:
Auto-verification logic must first run in shadow mode.

Shadow mode:
- predicts whether a fact would be auto-verified;
- does not change stored verification state;
- is compared with reviewed Gold/human outcomes.

---

## D-021 — One Case is not enough for production claims

Decision:
No universal accuracy or production-readiness claim can be based on one Case.

Broader multi-layout, multi-document validation is required.

---

## D-022 — Human review calibration must be independent

Decision:
Visual checking by the same workflow/implementer is useful source verification but is not called “second independent human review”.

Future calibration dataset should record reviewer identity/role and disagreements.

---

## D-023 — Production PHI processing remains gated

Decision:
Explicit real-Case validation authorization does not automatically enable general production PHI processing.

Production requires separate compliance/security/operational readiness.

---

## D-024 — Temporary PHI artifacts are cleaned up after isolated validation

Decision:
Do not leave temporary client images/raw OCR responses in Cloud Shell or Git after authorized benchmark tasks when they are no longer required.

Retain only minimized/deidentified benchmark artifacts where appropriate.

---

## D-025 — Current next blocker is P3 token/span provenance

Decision:
Do not tune Phase 2.7 thresholds next.

First improve provenance:

fact
→ document
→ page
→ region
→ exact token/span
→ parser
→ trust decision

Then rerun the unchanged shadow policy.

---

## D-026 — Phase 3 may start only as conditional test architecture

Decision:
Phase 3 architecture may begin on non-production/test data only if it:
- preserves trust states;
- does not flatten NEEDS_REVIEW into fact;
- carries evidence/provenance forward.

Phase 3 production remains NO-GO.

---

## D-027 — Karen interface must become simpler as backend becomes more complex

Decision:
The system may have many validation layers internally.

Karen should see:
- main picture;
- changes;
- unresolved issues;
- missing data;
- evidence when requested.

Do not expose every internal confidence value by default.

---

## D-028 — Client output is a separate presentation layer

Decision:
The client does not receive the technical Karen screen.

Client communication focuses on:
- what was reviewed;
- what changed;
- what appears stable;
- what cannot be concluded;
- next approved step.

---

## D-029 — Karen corrections do not automatically become methodology

Decision:
Classify corrections:
- Case-only;
- extraction error;
- mapping/unit/timeline error;
- methodology proposal;
- existing-rule refinement;
- client-language correction.

Methodology changes require controlled approval and scope.

---

## D-030 — Project memory belongs in the repository

Decision:
The persistent project context must live in:
- `AGENTS.md`;
- `CURRENT_STATE.md`;
- `ROADMAP.md`;
- `DECISIONS.md`;
- canonical docs.

Do not rely on a ChatGPT/Codex thread as the only memory of the project.

After meaningful work, Codex must update these files.

---

## D-031 — Existing Case architecture remains canonical

Decision:
Ankh extends the existing `client_cases`, uploaded-document and processing foundations. It must not create a parallel Case record, processing state machine, role system or competing source of truth.

The retired client processing classification must not be reintroduced through Ankh.

---

## D-032 — Layer boundaries remain explicit

Decision:
Keep `SOURCE`, `EXTRACTED`, `VERIFIED`, `NORMALIZED`, `INTERPRETATION`, `KAREN DECISION` and `CLIENT RESPONSE` separate.

A value moving between layers requires an explicit transformation or decision record. Later layers never overwrite source evidence.

---

## D-033 — Exact provenance matching fails closed

Decision:
P3 is assigned only when a fact maps to one unique contiguous source token sequence or to a parser-native exact token set.

Missing, repeated, non-contiguous or geometrically invalid candidates remain P2 with an explicit reason.

Gold agreement and region coordinates do not substitute for exact tokens.

---

## D-034 — P4 requires independent relation validation

Decision:
Parser success, high OCR confidence and an exact P3 token set do not by themselves establish P4.

P4 requires a separate relation validation that is both independent of the originating parser signal and passed.

---

## D-035 — Minimized benchmarks retain exact provenance at extraction time

Decision:
Future authorized real-world validation should retain the minimum token IDs/spans, hashes, geometry and confidence needed for regression testing while deleting full raw OCR responses and temporary PHI artifacts.

Do not reconstruct missing token provenance after cleanup or retain a full raw provider response merely for convenience.

---

## D-036 — Synthetic fixtures do not count as real-world validation

Decision:
Synthetic and authored deidentified fixtures may test mechanisms and regressions, but they never increase the real Case, real document or independent-review counts in Phase 2.9.

---

## D-037 — Broader validation requires cohort diversity

Decision:
Do not close Phase 2.9 by repeatedly processing the existing eight images from one Case.

A release-decision audit requires multiple authorized real Cases, independent source review, varied layouts, languages, source types and quality bands, corrected/addendum coverage, exact provenance and controlled false-auto-verification risk under the unchanged policy.

Numeric cohort thresholds remain a proposed protocol until explicitly approved; they are not an architectural fact.
