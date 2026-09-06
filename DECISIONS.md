# DECISIONS.md — ANKH ANALYSIS SYSTEM

This file records architectural decisions that must survive chat/thread changes.

Last canonical update: 2026-09-05. New decisions are appended with a new ID; historical decisions are not silently rewritten. If a decision is superseded, record the replacement and reference the prior ID.

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

---

## D-039 — Evidence Package is a projection, not a new fact store

Decision:
Use one provider-neutral Evidence Package to compose references and snapshots from the existing immutable source, Canonical/Clinical fact, provenance and Trust Decision layers. Do not add a parallel Case, fact, workflow or trust table.

---

## D-040 — Trust promotion is monotonic and evidence-bound

Decision:
A downstream stage may preserve or lower trust. It may raise trust only after a new independent source/OCR signal or a predefined deterministic gate passes, with all integrity checks passing and no unresolved source contradiction. Rephrasing, confidence, repeated summaries, LLM consensus and AI critique are not promotion evidence.

---

## D-041 — AI critique is a one-way safety mechanism

Decision:
AI critique may find problems and lower trust. It cannot independently produce VERIFIED evidence or satisfy an independent cross-check. A selective second-OCR plan is not authorization to transmit PHI.

---

## D-042 — The whole-client picture is a projection over Evidence Packages

Decision:
The Case picture orders evidence, compares only like with like, surfaces contradictions and missing context, and carries source/trust references. It does not infer diagnosis or causality and never promotes trust during aggregation.

---

## D-043 — Connected development harness is in-memory and fail-closed

Decision:
Until a database is independently proven non-production, the connected Ankh harness runs only in memory, with external calls and persistence disabled by contract. Its development screen is unavailable outside `NODE_ENV=development` plus an explicit local enable flag. Synthetic connectivity does not count as real-world validation.

---

## D-044 — Connected integrity compares candidates with immutable normalized source

Decision:
The connected harness reconstructs a source observation from normalized page
tokens/spans when a unique anchor exists. Candidate value, unit, reference,
date and row signals are checked against that separate observation, never a
copy of the candidate. Missing or ambiguous anchors are `NOT_EVALUATED` and
fail closed.

Text presence and anatomical context do not manufacture confidence. This check
validates extraction/transformation behavior only; it is not an independent
reread of the original image and cannot prove OCR correctness.

---

## D-045 — Handwriting recognition is source-coverage gated

Decision:
Handwritten medical content is read in two independent character-level passes. Each pass must first declare the source image `COMPLETE`, `PARTIAL` or `UNREADABLE`. Coverage metadata is not a clinical fact. If either pass reports a partial or unreadable source, matching visible text remains review-only; agreement cannot reconstruct content hidden by cropping, folds or uniform image regions. Printed option lists without one explicit selection are also review-only.

---

## D-046 — Empty templates and content duplicates are different relations

Decision:
An identity/header-only medical form with no filled clinical field is retained as an immutable source but classified `EMPTY_TEMPLATE`; it produces no clinical facts and no Karen review queue. A filled copy of the same template is a separate clinical document and is never merged with the empty copy. Byte-identical files remain duplicates. Differently encoded photographs may be content duplicates only when their deidentified agreed clinical fingerprints match and accession or laboratory/date metadata also match.

---

## D-047 — Structured OCR row state is authoritative

Decision:
New transcription passes emit `FILLED`, `EMPTY`, `UNSELECTED_TEMPLATE` or `UNCERTAIN` for every row. Empty-form classification uses this enum instead of free-form provider notes. Historical readings remain replayable through the conservative fallback; `UNCERTAIN` remains reviewable.

---

## D-048 — Visual fill evidence may only lower an empty-form false positive

Decision:
A provider-neutral visual detector may corroborate an empty printed form by locating chromatic ink in the identity/header area and proving its absence from the clinical body. It runs only after two structured OCR passes disagree with empty-form classification because of `UNCERTAIN` clinical rows. It must not suppress any clinical row marked `FILLED`, must not treat monochrome or weak visual evidence as absence, and must fail closed as `INCONCLUSIVE` on decoding errors. Visual evidence changes whole-document routing only; it never creates, edits or verifies a clinical fact.

---

## D-049 — Comparison normalization is bounded and mutually unique

Decision:
Independent readings may ignore presentation-only punctuation and may align a one-character OCR variant of a sufficiently descriptive label only when the relation is unique in both directions, remains inside the same section, and preserves every numeric identifier. Cyrillic/Latin `pH` is an explicit orthographic equivalent.

The comparator must not fuzzy-match across sections, repeated labels, different dates/indices, protected clinical designators (for example IgG/IgM, ALT/AST or T3/T4), partial sources or uncertain readings. Value comparison still runs after label alignment, and clinically meaningful operators remain significant.

Why:
Formatting and harmless label OCR differences should not inflate Karen's queue, but reducing review load must never manufacture agreement between different medical observations.

---

## D-050 — Bare printed state words require a visible selection signal

Decision:
When a mixed ultrasound/form field contains a bare printed state such as `норма`, `увеличен`, `повышена` or `понижена` before entered dimensions, that state is not an agreed fact unless the reading records a visible selection signal (underline, circle, check mark or equivalent). If selection cannot be distinguished from the printed template, the whole observation remains review-visible.

Concrete measurements followed by an assessment, and explicitly marked choices, remain eligible for comparison. The source wording is never deleted or rewritten by this gate.

---

## D-051 — Operator-triggered reprocessing is Case-scoped and audited

Decision:
Karen/admin may explicitly requeue all active documents in one existing Case
for a new two-pass reading. The source uploads remain unchanged, the operation
is written to the audit log and every interactive worker request may claim
work only from that Case.

Why:
A global “process next” call can consume another client's older queued job and
makes a controlled validation replay impossible to attribute. Case scope keeps
the authorized PHI operation bounded without creating a second queue or Case
model.

Constraint:
Reprocessing replaces derived extraction/analysis rows through the existing
idempotent pipeline. It does not promote evidence trust, approve Karen
decisions or enable production auto-verification.

---

## D-052 — Case reprocessing resumes the existing queue

Decision:
The interactive runner refreshes the Case only after its bounded queue pass.
If navigation, connectivity or a provider call interrupts the pass, staff may
resume the documents that are still queued without requeueing completed files.

Why:
A refresh after every document can unmount the client runner and cancel the
remaining loop. Requeueing the whole Case to recover would duplicate provider
work and make operational progress misleading.

Constraint:
Resume claims only already queued documents in the selected Case through the
same staff-authorized endpoint. It does not create new source data or alter
the trust state of extracted evidence.

---

## D-053 — Unselected standalone template states are not evidence

Decision:
A bare printed form option such as `норма` in a dimensions, echogenicity,
structure or contour field is excluded from Clinical Evidence unless the
reader records an unambiguous visible selection mark.

Why:
Independent readers can segment the same mixed printed/handwritten field
differently: one may attach the template word to entered measurements while
another emits it as a standalone value. Neither representation proves that
the printed option was selected.

Constraint:
The raw transcription remains immutable. Concrete measurements, trailing
assessments and visibly selected options remain eligible for review; this
rule does not infer clinical normality.
