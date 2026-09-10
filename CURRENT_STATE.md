# CURRENT_STATE.md — ANKH ANALYSIS SYSTEM

Last canonical update: 2026-09-06

## 1. Current position

The Ankh document/evidence foundation is implemented through Phase 2.8.

This file records implemented repository state, benchmark evidence and explicit gates. Product aspirations in `ROADMAP.md` are not implemented state.

Current status:

- Phase 1 — Google Document AI development foundation: COMPLETE
- Phase 2 — Canonical Fact Extraction & Verification Layer: COMPLETE
- Phase 2.5 — Gold Dataset / benchmark infrastructure: COMPLETE AS INFRASTRUCTURE
- Phase 2.5B — First Real Clinical Case Validation: COMPLETE
- Phase 2.5C — Real-World Extraction Hardening / Closure Pass: CLOSED AS REVIEW-ONLY
- Phase 2.7 — Verification Trust Framework & Auto-Verification Gates: COMPLETE
- Phase 2.8 — P3 Token/Span Provenance & Verification Upgrade: COMPLETE FOR THE LOCALLY RETAINED, MINIMIZED CORPUS
- Phase 2.9 — Broader Real-World Validation: IN PROGRESS — DATA GATE OPEN
- Phase 3 production: NO-GO
- Production auto-verification: NO-GO

Conditional GO exists only for Phase 3 architecture/test-only work, provided trust states remain visible and production boundaries are preserved.

Canonical evidence for this state is maintained in `docs/ankh/`, `lib/document-extraction/`, `lib/canonical-facts/`, `lib/clinical-evidence/`, `lib/verification-trust/`, the repository-only Supabase migrations, and `output/ankh-benchmark/`.

## 2. Google Document AI

Google Cloud project:
`pythons-ankh-analysis`

Processor:
`ankh-enterprise-ocr`

Processor ID:
`2ca773b0daa15488`

Region:
`us`

Service account:
`ankh-document-ai@pythons-ankh-analysis.iam.gserviceaccount.com`

IAM:
`roles/documentai.apiUser`

Permanent service-account/API keys were not created.

Document AI has successfully processed:
- synthetic laboratory documents;
- one real clinical Case represented by 8 images.

The provider foundation is not connected to the general production upload/Case flow. The documented production authentication target is short-lived Vercel OIDC → Google Workload Identity Federation → service-account impersonation; production readiness is not claimed.

## 3. Canonical Fact Layer

Implemented over existing:
- `client_cases`
- `uploaded_documents`
- `document_processing_jobs`
- `document_extractions`

Canonical facts preserve:
- original test name;
- normalized test name;
- original/numeric value;
- comparator;
- units;
- reference interval;
- laboratory flag;
- event dates;
- source document;
- page;
- bounding region;
- confidence;
- verification state;
- normalization state;
- comparability state;
- provider/parser versioning;
- idempotency.

Original source values are not overwritten.

## 4. Clinical Evidence Layer

A generic Clinical Evidence layer was added because real client Cases contain more than laboratory tests.

Supported evidence families include:
- LAB
- RADIOLOGY
- PATHOLOGY
- PROCEDURE
- BIOMARKERS
- source/narrative evidence

The system can preserve:
- source text;
- structured/numeric representation when safe;
- site/laterality;
- event dates;
- source document/page/region;
- confidence;
- verification state;
- normalization state;
- parser/provider versions;
- deterministic timeline/linkage metadata.

Radiology/pathology/procedure evidence is NOT forced into `canonical_lab_facts`.

## 5. First real clinical Case validation

Real validation Case contained:
- 3 radiology logical documents;
- 1 pathology logical document;
- 1 procedure logical document;
- biomarkers;
- no classic lab panel.

8 images were processed successfully.

Document AI:
- 8/8 successful;
- 4,212 tokens;
- high OCR/image quality;
- returned 0 table objects on visually tabular biomarker pages.

A spatial table fallback and additional evidence mechanisms were developed.

## 6. Phase 2.5C Closure result

Gold targets:
47

Closure result:
- 47/47 targets exactly matched to visually checked source;
- missed: 0;
- False VERIFIED: 0;
- NEEDS_REVIEW: 47;
- automatically VERIFIED: 0;
- `b_path_link`: SOURCE_ONLY;
- region provenance: 47/47;
- full token provenance: 0/47.

In the Closure artifact all extracted candidates remained review-only. The later Phase 2.7 shadow policy refines the proposed route to 46 `NEEDS_REVIEW` plus one `SOURCE_ONLY`; it does not mutate the Closure artifact or stored facts.

Important:
47/47 does NOT mean 47 facts are automatically trusted.

It means the 47 selected Gold targets can be matched to source under review.

Independent verification in this phase meant visual source checking separate from parser output.

It did NOT include a second independent human reviewer.

## 7. Verification Trust Framework — Phase 2.7

Implemented:
- 8 separate confidence dimensions;
- 12 evidence classes;
- declarative class-specific trust policies;
- provenance levels P0–P4;
- deterministic checks;
- circular-cross-check protection;
- explainable trust decision;
- reason codes;
- policy versioning;
- shadow auto-verification;
- human-review calibration contract;
- append-only staging decision schema.

Current policy version:
`phase-2.7-shadow-v1`

Shadow benchmark on 47 targets:
- auto-verify coverage: 0/47;
- false auto-verified: 0;
- NEEDS_REVIEW: 46/47;
- SOURCE_ONLY: 1/47;
- precision: null because no fact passed the gate.

Common blocker:
P3/P4 token/span provenance is not yet available for most evidence classes.

Stored canonical/clinical facts were not mutated by shadow mode.

## 8. Phase 2.8 exact provenance result

Implemented:
- deterministic token IDs and exact single-segment text anchors in the normalized provider model;
- provider-neutral P3 token/span provenance;
- unique contiguous token matching with fail-closed stop rules;
- parser-native token sets for spatial evidence;
- P4 promotion only after a separate independent relation validation;
- trust adapter and nullable repository-only persistence schema.

47-target replay under unchanged `phase-2.7-shadow-v1`:
- P3: 6/47;
- P2: 41/47;
- P4: 0/47;
- auto-verified: 0/47;
- false auto-verified: 0;
- NEEDS_REVIEW: 46/47;
- SOURCE_ONLY: 1/47.

The six P3 targets are `h_mitoses`, `h_er`, `h_er_pct`, `h_pr`, `h_her2` and `h_method`. Their exact token sets are present in the minimized real regression fixture.

The remaining 41 targets were not upgraded. Their full raw OCR token payloads were deleted during the authorized PHI cleanup, and region provenance or Gold agreement was not treated as token provenance.

Artifact:
`output/ankh-benchmark/phase-2-8-provenance-benchmark.json`

## 9. Current trust boundary

No automatic fact is allowed to become production VERIFIED merely because:
- OCR confidence is high;
- region provenance exists;
- parser matches Gold;
- one Case passed review.

Current trust system is conservative by design.

## 10. Current test health

Latest Phase 2.8 closure verification:
- focused provenance/provider/real-fixture/benchmark tests: 16/16 passed;
- full suite: 752 passed;
- 2 known unrelated failures remain in `free-review-description.test.ts`;
- TypeScript: passed;
- ESLint: passed;
- `git diff --check`: passed (line-ending warnings only).

Do not treat unrelated failures as Ankh regressions, but continue reporting them honestly.

## 11. Migrations

New Ankh migrations have been created in the repository.

They have NOT been applied to production unless a later CURRENT_STATE update explicitly says otherwise.

There is no confirmed isolated Supabase staging environment yet.

The Phase 2.7 migration is `20260903182611_verification_trust_shadow_layer.sql`; it defines shadow-only, append-only trust history and was not applied.

The Phase 2.8 migration is `20260903203000_phase_2_8_token_span_provenance.sql`; it adds nullable provider-neutral token provenance and was not applied.

## 12. PHI / compliance

Production PHI/compliance gate is NOT closed.

Real Case validation was explicitly authorized for isolated processing.

Temporary PHI images/raw OCR responses used for validation were deleted after processing.

Do not enable general production PHI processing based on this Case.

## 13. Immediate next engineering target

Recommended next technical target:

PHASE 2.9 — BROADER REAL-WORLD VALIDATION

Goal:
validate extraction and unchanged trust gates across multiple Cases, layouts, document types and quality levels while capturing minimized exact token/span provenance at extraction time.

Phase 2.9 readiness audit is implemented in `lib/verification-trust/validation-readiness.ts` and recorded in `output/ankh-benchmark/phase-2-9-readiness-audit.json`.

The metadata-only intake contract is implemented in `lib/verification-trust/validation-intake.ts`. It requires a Phase 2.9 authorization reference, non-PHI aliases, deidentification/minimization status, source profile and an explicit independent-review field before document processing. It stores no document contents.

Current result under the proposed, not-yet-approved 11-gate engineering protocol:
- passed: 1/11 gates (`zero_false_auto_verified`);
- real Cases: 1/5 minimum;
- independent reviewed real Cases: 0/5;
- real logical documents: 5/15;
- exact provenance: 6/47 targets;
- English only;
- no low/medium-quality, corrected/addendum or multi-source-type real coverage.

Phase 2.9 is not closed. Additional authorized real Cases and independent review evidence are genuine source-data requirements that do not exist in the repository.

Case 003 mobile-photo hardening now includes a handwriting/source-coverage gate. New readings declare `COMPLETE`, `PARTIAL` or `UNREADABLE` before transcription; coverage rows never enter clinical evidence. Handwriting is explicitly read character by character in both independent passes, partial fragments remain uncertain, and matching text from an incomplete source cannot become agreed evidence. This is implemented and regression-tested locally, but the three historical cropped production images have not been reprocessed and missing pixels cannot be reconstructed.

The next local hardening increment distinguishes `EMPTY_TEMPLATE` from `CLINICAL_CONTENT`. Identity/header-only blank forms retain source and raw readings but persist no agreed/disputed evidence rows and bypass analysis. A nullable, deidentified content fingerprint supports duplicate detection across re-encoded photos only with matching clinical content plus compatible accession or laboratory/date metadata. The migration is repository-only and is not yet applied to production.

The current Phase 2.9 comparison hardening also separates formatting noise from clinical disagreement. Presentation punctuation may normalize, and a one-character label OCR slip may match only through a unique mutual same-section relation with identical numeric identifiers. Partial sources, uncertain readings, ambiguous labels and different clinical values continue to fail closed. Production auto-verification remains NO-GO.

The fuzzy-label boundary now also preserves short Latin analyte suffixes, all-caps clinical abbreviations and alphanumeric identifiers as semantic designators. Equal values therefore cannot merge distinct observations such as IgG/IgM, IgA/IgG, ALT/AST or T3/T4; uncertain equivalence remains two source-visible review rows.

A regression from Case 004 exposed a mixed printed/handwritten form field where the unmarked template word `норма` was copied before concrete pancreatic dimensions. New readers are instructed to exclude unselected printed options, and the deterministic comparator now holds this narrow pattern for review unless a visible selection signal is recorded. It does not remove source text or infer whether a measurement is clinically normal.

The same source also exposed a second representation: one pass isolated the
bare printed word `норма` as its own value. The evidence projection now drops
that standalone template state unless the reading records a visible selection
mark. The raw source reading remains unchanged.
This applies to both agreed stored rows and historical dispute rows whose
non-empty sides contain only that same unselected template state; a dispute
that includes any concrete alternative remains review-visible.

An audited staff-only reprocessing control now requeues every active document
inside one selected Case and drives only that Case's queue. It is limited to
admin/Karen access, leaves source uploads unchanged and records the operation
in `audit_logs`. The Case-scoped worker claim prevents an operator-triggered
run from consuming another client's older queued document. This is an
operational review tool; it does not promote trust or enable automatic
verification.

An audited identity-review path is now implemented in the repository. An
authorized admin/Karen can confirm that explicitly listed files with an
automatic name mismatch still belong in the existing Case (for example, a
former surname). The automatic `mismatch` and its reasons remain unchanged;
the separate human decision is actor/time stamped and audited. Only those
confirmed files may pass the identity stop on a later Case-scoped two-pass
reading. Production use remains pending migration and deployment.

The Case reprocessing runner now keeps page refreshes outside the per-document
loop and exposes a bilingual resume control whenever queued documents already
exist. A navigation refresh can therefore no longer cancel the batch after its
first document, and an interrupted run can continue only the remaining queue
without re-reading completed files.

### Connected in-memory harness — 2026-09-05

An isolated, persistence-free route now connects a Google-like normalized provider result to Clinical Evidence, the unchanged Phase 2.7 shadow trust policy, Evidence Package and Case Analytical Picture. It accepts only `IN_MEMORY_TEST` with external calls and persistence explicitly disabled. A development-only RU/EN screen is gated by `ANKH_HARNESS_ENABLED=true` and returns 404 outside development.

The connected synthetic integration suite now passes 16/16 tests. It covers Case identity, ambiguous document types, unresolved units/dates, incomplete sources, source contradictions, duplicate document versions, cross-Case rejection, false trust promotion, production endpoint isolation, source/candidate corruption and missing/ambiguous source anchors. Source observations are reconstructed from normalized document tokens/spans where uniquely available; candidates are no longer checked against themselves. Missing field-parse/context confidence remains null, and unavailable reference separation is explicitly not evaluated instead of passed. No Supabase environment was used because no database was proven isolated from production. No OCR/LLM/provider call or production write occurred.

Focused connected/trust/provenance regression: 64/64 passed. Full suite: 740 passed with the same 2 unrelated failures in `free-review-description.test.ts`. TypeScript and ESLint passed; `git diff --check` passed with line-ending warnings only.

This harness proves module connectivity only. It does not add a real Case, close Phase 2.9, validate a staging database, authorize PHI transmission, produce a diagnosis, or connect Karen/client decisions.

Controlled Learning / Phase 6 remains a separate open item. This hardening does not implement self-learning and does not improve or claim medical OCR accuracy.

## 14. Phase 3 status

Phase 3 architecture/test-only:
CONDITIONAL GO after/alongside stabilization of exact provenance.

Phase 3 production:
NO-GO.

Production auto-verification:
NO-GO.

The empty-form reader contract now carries an explicit provider-neutral row state (`FILLED`, `EMPTY`, `UNSELECTED_TEMPLATE`, `UNCERTAIN`). A fail-closed visual corroboration layer can distinguish coloured body handwriting from header-only coloured ink on image uploads. It may resolve an otherwise uncertain document as `EMPTY_TEMPLATE` only when both OCR passes use structured row states, neither contains a clinical `FILLED` row, and the image has header-only chromatic ink. Monochrome marks, body ink, weak signals and decoder failures remain `INCONCLUSIVE` and review-visible. Production validation on the authorized empty/filled form pair is still required before this hardening increment can be closed.

Production rollout requires broader validation, staging, human review calibration, operational controls and PHI/compliance closure.

### Karen exception-only review projection — 2026-09-06

The Karen evidence screen now has a local exception-only review projection.
Exact and complementary two-read matches are collapsed within one document and
label, while genuine value disagreements remain review-required. Matched and
technical rows stay in a closed audit archive without confirmation controls.
This reduces manual clicks but does not enable production auto-verification or
change source/extracted evidence. Production publication is not part of this
local increment.

## 2026-09-09 — Tariff release preparation

Owner authorized production publication of the full review (299 USD, fees included, until 1 December 2026 Los Angeles time) and the 100-day support link (3,855 USD). Prepared on current production main, isolated from unrelated local changes. Offer amendment uses v8 because production already used v7. See docs/RELEASE_TARIFFS_2026_09_09.md. Build, typecheck and lint passed; production URL variables configured. No schema/PHI/Ankh phase changes. Release completion and live verification will be recorded after deployment.

Validation follow-up: all 32 targeted tests passed across professor-page, review-product, review-price-deadline and offer-version. git diff --check passed. GO for publishing this scoped release; actual paid transaction remains untested.

## 2026-09-09 — Assistant history publication

Owner authorized production publication. Isolated release codex/publish-assistant-history-20260909 is based on production d9e001f and adds persistence for private founder/Karen chat, dated cross-locale history, older-page loading, explicit errors and bounded acknowledged retries. Existing assistant_messages schema/RLS reused; no migrations, clinical changes or existing-message deletion. Separate concurrent knowledge/persona work is excluded. 1019/1019 release tests pass; see docs/architecture/ASSISTANT_CONVERSATION_HISTORY.md for scope, safeguards and acceptance record.


## 2026-09-09 — Anna integrated memory and whole-archive retrieval

Owner authorized publication of the single-window founder assistant, direct save commands, and search across the complete knowledge archive. Existing assistant_knowledge remains canonical; internal notes use staff/general and authenticated created_by. Every founder question searches all active staff/both entries in pages of 200, ranks lexical matches, and adds up to 12 source-labeled notes within 24,000 characters. Latest 40 notes remain the default context. Archive failures are explicit in the answer instructions. No schema changes, PHI test data, clinical verification or client publication. Release isolated from production commit d9e001f. See docs/architecture/ANNA_DIALOGUE_MEMORY.md.

## 2026-09-09 — Assistant timestamp correction

Production acceptance exposed a NOT NULL timestamp failure in bulk history insertion. Both row timestamps are now explicit, with question arrival and answer completion preserved separately. Two-row confirmation remains mandatory; the speculative empty-response success fallback was removed before publication. Targeted checks 41/41 and full regression 1092/1092 pass, along with TypeScript and ESLint. No schema/permission/clinical change. See docs/architecture/ASSISTANT_HISTORY_TIMESTAMP_FIX.md; production reload and locale acceptance follow deployment.
