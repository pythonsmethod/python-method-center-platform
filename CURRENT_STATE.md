# CURRENT_STATE.md — ANKH ANALYSIS SYSTEM

## Complete client Anham tool pilot — 2026-09-09

Owner requested the complete client Anham feature set for the selected account.
The same confirmed pilot now receives own-record tools and public web search
in text and voice, alongside conversation memory and attachments. A reviewed
17-section client surface binds every query to its authenticated owner; no
staff catalog, internal drafts, other clients, write commands or new extraction.
RU/EN feature list and voice disclosure updated. Existing production columns
were checked read-only. Release evidence: docs/ankh/client_complete_tools.md.

## Full client assistant preview — 2026-09-09

Owner expanded Elena's pilot to all existing client assistant capabilities.
Confirmed users on ANHAM_CLIENT_VOICE_TEST_EMAILS receive the client assistant
tier consistently in text, voice and UI attachments. Actual service periods,
payments and platform roles are unchanged. This supersedes the pilot's earlier
registered-tier restriction; own-Case and staff denials remain. Publication and
validation are tracked in docs/ankh/elena_full_client_assistant.md.

## Published honesty release — 2026-09-09 local

Owner-authorized PR #161 is published: main 2e56cbf, Vercel production
 dpl_GWncSoocGxmNS4iPad2hJnFCjez5 READY on pythonmethodcenter.com.
Remote preview and production builds passed. Four RU/EN semantic acceptance
answers retained payment attribution and unverified-versus-fabricated distinctions.
All four exchanges survived reopen and RU → EN → RU on /cabinet; database readback
confirmed eight timestamped chat rows and the retained recovered archive. The old
open tab required one reload before locale switching worked. Replies remain too
verbose; RU team-confirmation wording could be more conditional.
1,321 full tests passed; 116 focused tests after the Unicode-sign integration;
final TypeScript, ESLint and diff checks passed. Separate mobile-project build
failure predates this release. No schema or clinical gate change. Scoped release
CLOSED / GO; historical pending/no-deploy notes below are superseded for this
release only. Exact evidence and next action:
docs/ankh/history_recovery_and_honesty_v3.md.

## History recovery and honesty V3 — 2026-09-09

Owner-authorized recovery completed. Existing production PR #157 corrected the
missing answer timestamp during the prior browser run. The first thirteen test
questions were absent from the account's database history; captured UI text survived.
One labeled archive with all 26 quotations and an audit event were inserted
atomically. It uses actual recovery time, retaining original displayed minute times
inside the copy. Exact text readback passed; no old rows were rewritten.

Production acceptance: new RU and EN pairs each stored two timestamped rows without
warnings and survived reopening and RU → EN → RU with the archive on `/cabinet`.
This task did not author or deploy the existing #157 correction.

Local semantic candidate integrated current main `27edbd5`. Whole-answer/template
attribution, unverified-versus-fabricated evidence and context scope strengthened.
26-scenario corpus; 72 real-provider replies reviewed (26/provider, then 10/provider).
No transport failures or guard replacements; not an accuracy percentage. Residual
verbosity/irrelevant figures and broad explanations are documented. Keys stayed in
memory; direct model tests used synthetic context. No migration/trust/deploy change.

Full regression: 150 files / 1,203 tests passed; final focused: 4 files / 14 tests.
TypeScript, ESLint and diff checks passed. Recovery and bounded evaluation CLOSED;
GO for candidate review, publication NOT PERFORMED. Clinical gates unchanged.
Final build passed with temporary no-cache/single-worker settings after local
network/memory/disk failures; original configuration restored. No deployment.
See `docs/ankh/history_recovery_and_honesty_v3.md`, D-060. Earlier pending evaluation
notes below retain their historical status and are superseded by this checkpoint.

## Published client browser baseline — 2026-09-09

Owner-authorized in-app browser run completed: 18 synthetic prompts and 18
delivered answers, nine mechanisms in RU and EN, on the published `/cabinet`.
RU → EN → RU preserved the route; the browser was left in Russian. This does
not validate the unpublished V2 worktree or identify the production build/model.

Findings: RU payment reply refused confirmation but then offered wording claiming
payment was made; draft replies partly equated unverified with invented. The UI
repeatedly warned that message storage could not be confirmed. After switching
back to Russian and reloading chat history, only the last five English test pairs
were visible; nine Russian and the first four English pairs were absent while
older history remained. This proves incomplete visible history restoration,
not database deletion or a known root cause. Other sampled action, calculation,
medical-pressure, clarification and citation boundaries held as documented.

No application code/schema/deployment change. Synthetic chat writes were attempted
through the normal UI; no documents were opened/uploaded, no human was messaged,
and no keys were reused. Production assistant context was not inspected and is
not certified PHI-free. Retained report contains minimized synthetic findings.

Baseline run CLOSED; V2 behavior validation remains NOT CLOSED and rollout remains
NO-GO. Next: diagnose history persistence/retrieval with synthetic messages and
an identified published revision, then evaluate the V2 candidate and regression
cases for these wording failures. Full report:
`docs/ankh/factual_honesty_browser_live_2026_09_09.md`.

## Source-bound honesty follow-up — 2026-09-09

This checkpoint supersedes the V1 response-screen design below. Client/staff
context and center knowledge now use request-only source records with explicit
origin, kind, availability, timestamps, review metadata and scope. Voice history
preserves user-report versus AI-draft provenance. Human-approved wording stays
separate from the AI summary; unknown review/time is not manufactured. No new
Case model, persistent fact store or clinical trust state was introduced.

The URL/percentage coincidence gate was removed: correct derived calculations
and citations are not rejected merely for missing verbatim text. Grounding is
instruction-governed, not proven by the new source wrapper. Scoped successful
server action receipts can render exact localized confirmations; current chat
routes expose no action tools and ignore browser-supplied receipts. A narrow
prose backstop remains and can miss paraphrases. Quotations, negation and valid
calculations no longer trigger the previous broad action-word screen. Ambiguous
questions receive clarification instead of automatic team escalation. Contradictory
promises of forwarding and bans on saying “cannot confirm” were removed.

Validation:
- Full offline regression checkpoint: 133 files, 1034 tests passed, 0 failed.
- Final focused regression after source-citation scenario and voice-test syntax
  additions: 5 files, 45 tests passed, 0 failed.
- TypeScript, ESLint and `git diff --check`: passed on the final state.
- Existing synthetic Ankh benchmark ran in regression: 3 documents/4 pages,
  zero critical extraction and false VERIFIED critical errors; no live-model or
  medical accuracy inference. Generated artifact churn was restored.

The isolated behavioral harness has 18 RU/EN scenarios and keeps raw versus
delivered output separate. Its real-provider runner is excluded from ordinary
tests and requires explicit live authorization and a selected provider. No live
direct-provider harness requests have been sent: owner confirmation to reuse existing project keys is
pending. No key value was exposed, copied or changed. No PHI transfer, database
mutation, migration, deployment or trust-threshold change occurred.

Offline implementation complete; live behavior-validation phase NOT CLOSED.
Next: after key-reuse confirmation, collect one synthetic run from each configured
provider and review the answers against the rubrics. Production rollout remains
NO-GO based on this work; Phase 2.9 and clinical gates are unchanged. Details:
`docs/ankh/factual_honesty_v2.md`, D-059.

## Historical V1 assistant factual-honesty checkpoint — 2026-09-09

Implemented: one provider-wide policy for all assistant roles, direct file/OCR
calls, continuation, synthesis and Realtime; bounded final client/staff text
screening for unsupported actions, URLs and percentages; honest unknown/error
handling and sample scope in client context. Prior AI reviews remain drafts,
active support is not a payment receipt, and retired Case processing status/
urgency are excluded from the snapshots touched by this change.

No new schema, production deployment, external PHI transfer, source-data mutation
or trust-threshold change. Escalation text names the appropriate human but does
not claim or promise transmission without a real action. Emergency instructions
remain immediate when a false notification draft is withheld.

Validation on this worktree:
- Full regression checkpoint: 129 files, 1010 tests passed, 0 failed. Previously
  documented unrelated failures did not reproduce in this checkout.
- Final focused suite after emergency/routing additions: 4 files, 35 tests
  passed, 0 failed (includes 3 cases added after the full checkpoint).
- TypeScript and ESLint: passed at the full checkpoint and on the final rerun.
- `git diff --check`: passed (line-ending warnings only).
- Existing synthetic Ankh benchmark ran in the full suite: 3 documents/4 pages,
  zero critical extraction errors and zero false VERIFIED critical errors.
  This is synthetic regression evidence, not a live-model or medical benchmark.

Details, limits and next action: `docs/ankh/factual_honesty.md`, decision D-058.
This increment does not prove universal hallucination prevention. The text screen
is pattern-based, and Realtime audio has policy-only enforcement. Phase 2.9 stays
OPEN, production auto-verification and Phase 3 production remain NO-GO.

## 1. Current position

### Correction: Elena tests the CLIENT experience — latest

Owner clarified that Elena must use her own client Case, not founder-equivalent
assistant access. The former delegate grant is revoked in configuration and code,
including stale delegate environment values. The account remains a client.
ANHAM_CLIENT_VOICE_TEST_EMAILS enables only the named client's preview through
/cabinet/assistant, linked from her cabinet; /assistant redirects there.
Voice uses existing registered/paid client context resolution and checks both
profile and Case IDs before supplying context. No staff tools, global data or
knowledge-write access. Staff Anna/Karen behavior remains unchanged. See
docs/ankh/elena_client_voice_pilot.md; prior delegate notes are superseded.

### Owner-approved assistant delegate — 2026-09-09

Published: PR #162 merged, production dpl_7mHMy7LdutJkvxRVX9UKATHYrTf5 READY.
Confirmed account retains client role; /assistant redirects unsigned-in visitors
to login with its return path. Delegate's actual login/microphone test is pending.

Owner confirmed Elena's existing account and explicitly granted assistant access
equivalent to the founder assistant. A separate server-managed delegate allowlist
enables /assistant, private text/history and staff voice for that account while
retaining its client profile role. Admin routes and founder privileges remain
unchanged. History is scoped to the delegate's own profile. See
`docs/ankh/assistant_delegate_access.md` for checks and publication status.

### Authorized voice production rollout — 2026-09-09 (latest)

Owner explicitly approved the two production voice-history migrations and enabling
the site update. Both migrations applied successfully to zdrfttgwnyorifmpqgwe:
five columns and two indexes verified; assistant_messages RLS remains enabled.
Vercel production/preview now has the signing secret and enabled staff-only,
built-ins-only voice plus public web search; custom voices remain disabled.
Current main was integrated, preserving source-tagged history and factual-honesty
rules in the unified WebRTC handshake. PR #159 merged as cf96d8c; production
dpl_BzdAZzdwGRLqyoyVNfze5BPYAhb9 reached READY. The actual founder account loaded
its history and the avatar dialog with exactly five voices. The fixed-phrase
preview completed without a displayed error. Live microphone acceptance still
requires the user's browser microphone permission; no live speech was captured.
1527 tests / 166 files, TypeScript, ESLint and diff checks passed.
Earlier blocked-approval entries below are historical and superseded for these
two migrations only; no clinical migration/automatic verification is authorized.

### Voice/text permission parity — 2026-09-09 (latest)

Owner requested voice to have the same powers as text. Staff voice now delegates
methodology/reasoning/archive and explicit memory commands to the existing staff
text POST handler with its own authorization rechecked. The actual turn-bound
browser transcript is used, not a model-supplied command. Private/Case history is
loaded; one execution per signed session/turn prevents duplicate memory writes.
Karen destination confirmations remain in the existing chat controls. Source
queries and internet tools remain available under their existing flags. Policy
receipts advance to v4; old sessions must restart. No schema or production change
in this increment. Production rollout still awaits the exact migration approval
recorded below. See `docs/ankh/voice_text_permissions.md`.

### Built-in staff voice launch preparation — 2026-09-09 (latest)

The owner deferred personal voice cloning and authorized built-in voices only.
Five built-ins can now be enforced server-side; a staff-only rollout accepts
verified founder/Karen accounts and denies clients. Voice history integrates with
the latest private history, timestamps, pagination and shared safety rules from main.
All 1336 tests / 150 files pass with one worker; TypeScript and ESLint pass.
Live fixed-phrase TTS returned HTTP 200 and valid WAV for all five voices.
Both additive voice-history migrations passed on isolated staging; a rolled-back
synthetic insert/retry verified two rows without duplicates and RLS stayed enabled.
Production schema changes were rejected by automatic approval review under the
dedicated-production-task rule. Production voice is NOT launched. Next action:
explicit approval for the two exact voice migrations, then scoped configuration,
deployment and authenticated live acceptance. No personal recordings are needed.
See `docs/ankh/builtin_voice_launch_2026_09_09.md`; this entry supersedes the
personal-recording prerequisite below.

### Five selectable voices and personal-voice preparation — 2026-09-09

The avatar call now offers Marin, Cedar, Coral, Sage and Verse, authenticated
fixed-phrase previews, and account/persona-specific browser preference storage.
Voice selection ends/saves the old session; the next session uses the selected
voice. Staff-only founder/Karen custom aliases remain unavailable until server
voice and matching consent references are configured. They never change identity,
permissions or clinical authority. A guarded, dry-run-first operator helper can
create consent-linked voices from the owners' supplied recordings.

1163 tests / 133 files pass; TypeScript, ESLint and diff checks pass. Browser
verification covers five choices, preview, Cedar in the actual session request,
RU–EN–RU preference retention and 390px layout. A protected Vercel preview was
deployed from the validated branch; no real voice creation, provider call or
schema apply occurred. Personal voices are NOT created: recordings
and confirmed account eligibility remain missing. See
`docs/ankh/voice_choices_and_personal_voices.md` (D-061).

### Avatar voice launcher and full-screen call — 2026-09-09

Anham's existing artwork is now the small voice launcher beside dictation and
attachments. One click opens a full-screen native dialog with the large avatar,
live state animation, latest transcript and source links. Close/End/Escape stops
media and restores focus; history persists as before. RU/EN, 390px layout,
permission failure and retry are browser-verified with synthetic audio only.
Full suite: 1133/1133 in 132 files; TypeScript, ESLint and diff checks pass.
No production enablement, schema change or paid call. Local UI increment CLOSED;
production gates remain unchanged. See docs/ankh/voice_avatar_interface.md (D-060).

### Staff voice internet search — 2026-09-09

Public web search is implemented locally for founder and Karen through a
server-authenticated Responses web_search tool. The spoken answer and a distinct
cited excerpt appear in the existing chat. Session-attested excerpts, timestamps
and clickable citations persist in scoped history, including interrupted turns.
RU/EN disclosure/search state and history restoration are verified. Policy version
3 supersedes version 2 for newly started sessions. A second, unapplied migration
adds assistant_messages.web_results; admission checks it before paid audio starts.

OFF by default (ANHAM_WEB_SEARCH_ENABLED=false). The protected Vercel preview
does not change migration state, provider flags, data-policy version or
production PHI boundaries. Search sends only a bounded
public query; common identifier checks are not a complete free-form PHI detector.
Full local regression: 1133 tests / 132 files pass; TypeScript, ESLint and diff
checks pass. Production remains NO-GO pending authorized staging/privacy/audio
acceptance. See docs/ankh/voice_web_search.md (D-059) for limits and exact next action.

### Realtime Anham voice pilot — 2026-09-09

Local WebRTC voice integration now exists in registered-client and private
founder/Karen chats. Roles are resolved server-side; microphone/connection/
listening/speaking/error/end states and transcript labels follow RU/EN locale.
Recognized speech and streaming reply text appear in the same open chat. The
existing assistant history stores completed turns and explicitly interrupted
turns, including recognized user-only utterances, with persona isolation,
signed session binding, atomic/idempotent writes and visible save failures.
Staff can load earlier history beyond the first 60 messages. No raw audio is stored.

The owner explicitly expanded the requirement to all site/client business data
for BOTH founder and Karen. Voice now exposes a reviewed catalog of 46 datasets,
generic filtered/paginated reads, full field chunks with revision checks, grouped
counts/decimal sums, and actual localized site/legal/shop/pricing content. It
covers every current public business table except retired escalation records and
internal abuse-counter buckets. The catalog/schema regression requires review of
new tables. Credentials, raw provider/notification/audit payloads, private storage
links and retired Case/support classification fields are excluded.

Both personas can read both Professor and support correspondence through voice;
their default inbox and automatically restored conversation remain persona-specific.
This owner-authorized assistant read policy supersedes D-057's channel restriction;
existing direct UI access rules remain unchanged. Clients get no site tools.
Reads recheck current identity/access, signed policy version, kill switch and a
60-read/session cap; sensitive record releases require a successful minimal audit
entry. Older session receipts cannot silently acquire the expanded data access.
No messages are marked read or sent; no file/audio reprocessing is triggered.

The pilot is disabled by default and requires an explicit test-account allowlist.
No saved history, documents or clinical Case snapshot are automatically sent to
voice. Requested relevant business/clinical source records may be sent as untrusted
tool data under the expanded RU/EN disclosure. Real sensitive use still requires
the approved workflow and PHI gate; no real PHI was used for this implementation.
Migration `20260909211728_assistant_voice_transcripts.sql` is repository-only;
no database changes, key creation, paid provider requests or deployment occurred.
The feature does not close any Ankh clinical/PHI gate.

Implementation and synthetic validation details, required environment settings,
remaining live acceptance gates and exact next action: `docs/ankh/realtime_voice.md`
and the latest `docs/ankh/voice_site_data_access.md` (D-058).
Production voice/PHI release remains NO-GO; isolated synthetic-speech staging
validation is the next step after separate authorization and configuration.

Final verification: full suite 1,096/1,096 across 131 files; focused voice/site
regression 118/118. TypeScript, ESLint and diff checks passed. Synthetic browser
checks cover actual chat + questionnaire tool read + reply persistence in RU/EN,
RU→EN→RU at the same route and 390px layout without overflow, extending the prior
live text, interruption and older-history checks.
No actual microphone/provider or staging DB validation.

### Clinical document foundation


Non-medical chat increment (2026-09-09): saved Anham registration welcome and
72-hour-minimum follow-ups are implemented locally, with atomic service-only
delivery, sticky opt-outs and RU/EN history projection. Authorized synthetic
acceptance on `ankh-staging` is CLOSED: concurrent cron/opt-out and browser
RU → EN → RU in cabinet/admin passed. Staging exposed and verified fixes for
busy-preference timeouts and the admin's hardcoded history locale. An optional
profile UUID allowlist bounds rollout. Daily Hobby-compatible cron is configured;
`ASSISTANT_OUTREACH_ENABLED` defaults off. Synthetic fixtures and local keys
were removed. After explicit owner confirmation, both outreach migrations were
applied to production `zdrfttgwnyorifmpqgwe`; server-only grants and zero sends
were verified. Vercel production now explicitly has the enable flag set to
`false`. PR #156 integrates current main through `d810dd8`, preserving history,
Anna memory, tariffs and safety changes. Vercel preview build is READY.
Automatic approval review rejected merging PR #156 into main because the
publication confirmation did not explicitly name merge-to-main. Production
deployment is pending that authorization; no sends occurred.
Ordinary history retains all original languages and private/client isolation;
only stored outreach templates are projected into the active locale.
Full suite after integration: 1,143/1,143 tests in 141 files;
TypeScript and ESLint passed. Details and staging gates:
[`docs/ankh/assistant_outreach.md`](docs/ankh/assistant_outreach.md).
This increment does not change any clinical phase or production trust gate.

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

### Unified Anham response style — 2026-09-09

A central RU/EN prose policy and a server-side presentation normalizer now
cover public/registered/paid chats, Anna/Karen, Case drafts and verification
text, sleep/timing advice, chess and medical digest narrative fields.
Existing AI history is normalized on read without rewriting old records.
Source/OCR, structured extraction, protocol envelopes and human-approved
decisions remain unchanged. Realtime inherits the policy but its direct audio
stream has no server-side prose transformation.

This is a local implementation with no deployment, migration, production
write or PHI processing. Full inventory, validation and limits are recorded in
`docs/ankh/anham_response_style.md`. Phase 2.9 remains open; production
auto-verification and Phase 3 production remain NO-GO.

Local style increment and isolated synthetic public-chat acceptance: CLOSED.
After owner authorization, the real Next server and browser were exercised
with a loopback-only synthetic provider in RU and EN. Values, dates, links
and plain paragraphs were preserved. A stale-layout language-switch defect
was fixed: the current browser pathname, query and fragment now survive
RU → EN → RU, including navigation from home to the plans page.
Final verification: 1055/1055 tests in 129 files passed; TypeScript, ESLint
and `git diff --check` passed. Live models and authenticated browser flows
were not exercised: no isolated credentials or test accounts were available.
Existing HomeJourney hydration/image warnings and a local Google Fonts
download failure are recorded separately in the acceptance report.
Code review is now CLOSED after fixing numeric-sign/decimal preservation,
explicit annotation locales, provider-comparison formatting and empty advice
responses. Final regression: 1096/1096 tests in 132 files; TypeScript, ESLint
and `git diff --check` passed. Approval matching still uses raw AI drafts;
human decisions are unchanged. Details: `docs/ankh/anham_response_style_review.md`.
GO for isolated live-model/authenticated acceptance with test accounts;
production deployment remains outside this task.

Live account check (2026-09-09): the owner supplied an authenticated test
account in the in-app browser and authorized testing on the published site.
Three synthetic client exchanges passed arithmetic, missing-data handling,
RU → EN → RU route preservation and history reload checks. Published replies
still contain Markdown/bullets/em dashes, so the new-style production
acceptance remains NOT CLOSED. No deployment or configuration change was
performed; only the authorized synthetic conversation was saved by the app.
This does not validate the local candidate build or paid/Anna/Karen flows.
Evidence: `docs/ankh/anham_live_account_check.md`.

### Anham prose publication — 2026-09-09

Owner requested resolution of the published formatting mismatch after the live
account check. Scoped publication of the prepared prose change is now authorized.
Candidate integrates production/main 27edbd5, retaining durable history, timestamps,
founder archive, tariffs and outreach configuration. No migrations or clinical
processing gates change. Release validation and live acceptance are tracked in
`docs/ankh/anham_response_style_release.md`; completion is pending.

## 2026-09-09 — Voice conversation continuity

Isolated fix based on main 77258dc: retain recognized user turns after voice interruption, cancellation or failed output; correct instructions denying supplied history; label restored interrupted AI replies. Five new behavioral tests reproduced the loss before correction. No schema, PHI test data or clinical phase changes. Production acceptance remains open; see docs/ankh/voice_conversation_memory.md for validation and exact release step.

Validation: 1540/1540 tests (167 files), TypeScript, ESLint and diff check PASS. Local correction CLOSED; production release/microphone acceptance pending.

## 2026-09-09 — Server conversation recall

Client and private text generation now retrieve own stored conversation server-side: 60 recent rows plus up to 12 older lexical matches, constrained by authenticated profile, tier family and exact personal/Case scope, without locale filtering. Existing staff voice text-bridge calls inherit this context. Bounded, source-tagged excerpts remain unverified conversation; no schema or clinical gate changes. 1550/1550 tests across 168 files PASS; TypeScript, ESLint PASS. Isolated implementation CLOSED / GO for release; production recall acceptance NOT CLOSED. See docs/ankh/server_conversation_recall.md. Retains voice interruption correction 59e9306.

## 2026-09-09 — Lifetime text and voice conversation archive

Owner requires no age-based expiry for saved conversations with clients, Karen and Anna. Existing assistant_messages remains canonical. Native text and realtime tools now search/page/read full own messages of any age and language, including voice transcripts; authenticated owner/tier isolation and original Case labels remain. Do not add a rolling retention purge or replace originals with summaries. Request context/tool budgets do not limit archive age. Existing explicit deletion workflows remain. OpenAI archive calls use Responses store:false with unchanged model/reasoning; Claude uses native tools. Synthetic 2001-record live checks passed for both providers. No schema or clinical-gate change. See docs/ankh/lifetime_conversation_memory.md for limits, final checks and release status.

Lifetime archive final local regression: 169 files / 1562 tests PASS; TypeScript,
ESLint and diff check PASS; 2/2 synthetic live native provider tests PASS.
No migrations or production data changes. Release/voice acceptance is tracked in
`docs/ankh/lifetime_conversation_memory.md`.

PR #163 / commit 5beab7e: Vercel platform preview READY and browser homepage
verified. Production merge blocked by automatic approval review pending explicit
owner authorization. No production release claimed. Authenticated voice acceptance
remains outstanding because the browser is signed out. Full evidence and the
separate mobile preview configuration failure: lifetime_conversation_memory.md.

## 2026-09-10 — Memory production publication authorized

Owner explicitly approved publication of PR #163. Integrated main 46f80a6 and
preserved the client-only voice pilot and revoked delegation. Prior approval
blocker is resolved. Integrated verification and deployment evidence are tracked
in docs/ankh/lifetime_conversation_memory.md.

## 2026-09-09 — Publish dangerous-assistance restrictions
Owner explicitly authorized publication. Scoped release from b18a898 expands shared RU/EN dangerous-assistance rules in text and existing voice without disabling voice or changing access/data. Full regression 1573/1573; added voice/safety checks 69/69; TS/lint/diff pass. See docs/security/DANGEROUS_ASSISTANCE_RELEASE_2026_09_09.md. Remote release verification pending; broader cost-dashboard/security branch remains separate.

## 2026-09-10 — Anham's introduction

Owner corrected the live voice wording: Anham is the AI assistant at Python
Method Center; Professor Python is the human founder/expert. The shared RU/EN
prompt now fixes the introduction in text and voice, with Russian pronunciation.
No permissions, schema, clinical changes or historical message rewrites.
Release evidence: docs/ankh/anham_center_introduction.md.

## 2026-09-10 — Warm voice delivery and diction
Shared RU/EN live/sample delivery instructions add natural warmth, context-sensitive
support, varied brief welcomes/goodbyes and complete word endings at speed 0.95.
Browser now forwards the pilot's own-case/web tools to existing server authorization.
No role/schema/clinical changes. 107 relevant tests pass; TS/ESLint/diff pass.
Acoustic validation remains a live listening task; see docs/ankh/anham_voice_delivery.md.
## 2026-09-10 — Approved Anham authorship
Owner approved Anna as developer of the platform and Anham, and Professor Python
as author of the Center methodology. Shared text/voice instructions provide RU/EN
wording and require the exact Latin spelling Professor Python in every language.
No roles, schema, clinical logic or historical/source text changes.
See docs/ankh/anham_approved_authorship.md for validation and release evidence.
Approved authorship published: PR #170, 849d120, production dpl_4D7C8zSB9kcsVo5r3iuhJsgb879c READY.
