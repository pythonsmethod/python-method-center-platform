# ROADMAP.md — NEXORA CORE / PMC APPLICATION

## NEXORA capability ownership and migration — 2026-09-23

Owner-approved target: NEXORA core → reusable capabilities → ANHAM/PMC and future
external consumers. Retire ANKH as a standalone system name. Technical aliases
remain until the compatible migration is verified.

- [x] NX-00: Record the decision, NEXORA master and subordinate ANHAM/PMC profile in the architecture work branch.
- [ ] NX-01: Map each current component to shared capability, PMC domain adapter or user interface, with callers and data ownership.
- [ ] NX-02: Introduce the document-analysis contract and thin PMC adapter without copying the engine or source history.
- [ ] NX-03: Continue Phase 2.9 and isolated persistence/source/authorization acceptance.
- [ ] NX-04: Accept ANHAM's complete document → Karen → saved client response flow through the shared boundary.
- [ ] NX-05: Accept a versioned external NEXORA API with organization isolation, access control, limits, usage accounting and documentation.
- [ ] NX-06: Expand capabilities and products only after their individual acceptance.

Keep existing PMC payment/access work and clinical gates distinct. A new name does
not require a new repository, database or deployed service at this step.
Master: [NEXORA](docs/architecture/NEXORA_MASTER_ARCHITECTURE.md).


## Staff email notifications — 2026-09-17

- [x] Notify Anna about new registered-client Support messages.
- [x] Notify Karen about new typed and confirmed-voice Professor messages.
- [x] Exclude message content, client identity, Case data and medical data.
- [ ] Complete Resend owner setup, deploy and verify synthetic delivery.

## Chess master level — 2026-09-17

- [x] Add bilingual `Мастер / Master` between Expert and Grandmaster in the shared Karen/client interface.
- [x] Give Master a bounded Stockfish configuration distinct from maximum-strength Grandmaster.
- [x] Extend API validation, coaching context, persistence schema and focused tests.
- [ ] Pass full CI, apply and verify the production migration, merge, deploy and verify production status.

## Case support conversation — 2026-09-17

- [x] Add a distinct Anna/Support ↔ Client window to every authorized staff Case view.
- [x] Reuse the existing client support inbox and append-only message store.
- [x] Keep support messages separate from Anham and Professor Python channels.
- [x] Add RU/EN staff copy, server-side authorization/ownership resolution, audit, and duplicate-thread prevention.
- [ ] Apply the reviewed migration, pass full CI, merge, publish, and verify production.

## Chess expert level — 2026-09-16

Deployed to production through PR #194: bilingual shared UI, three-ply intermediate opponent, API/coaching support and additive account-preference migration. The production constraint was applied and verified. Next: observe Karen and client play, verify RU↔EN selection during routine authenticated use, and tune only from play evidence.

## Represented-patient identity — 2026-09-14

Implemented in an isolated release branch; the additive production table and Case #483 correction are applied. Next: CI verification, deployment, then RU↔EN browser acceptance of self, represented-adult and guardian paths. This does not enable automatic identity verification or trust promotion.

## Consent-gated product analytics — 2026-09-13 — PUBLISHED

Staging account completion, seven-step synthetic funnel acceptance, exact cleanup,
ninety-day scheduled retention and hosted RU/EN acceptance are complete. PR #190
merged as main `1ac83f1`; production deployment
`dpl_5sbQNHQ3dHZutp6WN8yBWysERvMZ` is READY and the main CI passes. This code line
is closed. Any production collection is a separate future task: do not apply
`20260909210803_product_analytics.sql` to production or enable collection without
explicit owner approval. External PostHog heatmaps additionally require an
owner-approved account, terms, region and activation task. See
`docs/audits/PRODUCT_ANALYTICS_STAGING_2026-09-09.md`.

## Founder knowledge-gap centre and Case detail cleanup — 2026-09-11 — PUBLISHED

Published as main `8f23316`, production `dpl_AK3TkxyR3fi7yz1tHYMm8WQvBxJs`
READY. Production migrations `20260911194351` and `20260911195108` applied
after a read-only ledger check; no data change. Next for this line: a signed-in
founder RU/EN acceptance of `/admin/notifications` and of the Case detail with
`?view=today`, plus one real gap recorded end to end. The topic taxonomy stays
enumerated; do not add a text classifier. Clinical gates unchanged: Phase 3
production and production auto-verification remain NO-GO. See
docs/ankh/founder_gap_notifications.md and
docs/ankh/case_detail_without_classification.md.

## Client payment and support-period visibility — 2026-09-11 — IMPLEMENTED

Payment and service-period visibility for the signed-in client assistant is
implemented: Anham reads its own profile's payment records and recorded support
periods, names recorded `starts_at`/`ends_at` only, never calculates an end
date, never treats a paid status as an opened period, and routes absent or
unreadable records to /support in RU and EN. Processor references, transaction
identifiers, payment metadata, card and bank data stay out of the assistant
context, and other profiles remain unreadable.

Published: PR #177 merged as 892f4cd, Vercel production deployment
dpl_FBK7mNa8FsCmRLHoR7MgKsjJq4Fc READY on pythonmethodcenter.com and
www.pythonmethodcenter.com.

Remaining for this item: signed-in RU/EN acceptance on /cabinet — a recorded
payment with a period, a client with no payment, RU → EN → RU, and close and
reopen the chat. It was not executed in the publishing session, which had no
client credentials and no egress to the production domain, so it stays open.
No schema, RLS or clinical gate change is implied; existing Ankh clinical NO-GO
gates are unchanged.

## GPT-Live pilot — next acceptance gate

Review the implemented Live adapter, approve the specific scoped release, configure
the existing host for the three pilot accounts, then execute authenticated RU/EN
voice/memory/tool/interruption/recovery acceptance. Compare voice duration cost and
separate backend cost before any wider rollout. See docs/ankh/gpt_live_pilot.md.

## Complete client tool pilot — 2026-09-09

Publish and validate own-Case source retrieval plus public web search for the
confirmed selected client in text and voice. This supersedes prior pilot web
and existing-reading exclusions, not clinical/public rollout gates. Next is
the selected client's own authenticated acceptance. See docs/ankh/client_complete_tools.md.

## Full client assistant pilot — 2026-09-09

Enable all existing client assistant features for the confirmed pilot account,
including attachments and client-tier text/voice. Keep clinical and public
rollout gates unchanged. See docs/ankh/elena_full_client_assistant.md.

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

## North Star

Latest correction: Elena's preview is CLIENT-only, on her own Case/account.
Former internal delegation is revoked. The rollout remains a single-account
client pilot, not a public release or a paid-service entitlement. The owner later
authorized the full assistant tier for this pilot. Validate own-context
voice and client chat history through /cabinet/assistant.

Assistant-only delegation: confirmed owner-approved accounts use /assistant
without a platform role promotion. Delegate history remains private; suspended,
closed, anonymous and unlisted accounts are denied. Release verification follows
in docs/ankh/assistant_delegate_access.md.

Latest voice rollout: owner approved the two production history migrations;
applied and verified with RLS intact. PR #159 is merged, production is READY,
staff-only built-in voices and web search enabled. Founder browser checks pass
for history/avatar/five options and fixed-phrase preview. Next user-facing
acceptance is the first real conversation after granting browser microphone
permission. Earlier migration-approval blockers below are historical.

Voice/text parity: reuse the text assistant handler for private reasoning,
archive retrieval and explicit memory commands, with transcript-bound inputs
and existing confirmation controls. No new role or unrestricted write API.
Production launch remains gated by the two previously rejected migrations.

Current voice priority: built-in voices only for founder/Karen. Personal voice
cloning is deferred by the owner, and recordings are not a release prerequisite.
Code/regression and staging persistence checks pass. Production launch is pending
explicit approval of the two additive voice-history migrations; automatic review
rejected applying them under the current authorization. See
`docs/ankh/builtin_voice_launch_2026_09_09.md` for exact scope and rollout gates.

Five-voice selection (D-061): local selector/preview complete. Personal founder/
Karen voice support is prepared, not activated. Next owner-only inputs: each
person's consent recording and separate sample, plus confirmed provider eligibility.
Codex can then perform authorized provisioning and staging acceptance. Existing
production/no-PHI gates remain unchanged; see
`docs/ankh/voice_choices_and_personal_voices.md`.

Avatar voice UI (D-060): local composer launcher and full-screen call view complete.
Include one-click opening, Escape/End cleanup, focus restoration, mobile layout
and transcript/source continuity in the pending authorized staging voice acceptance.
See docs/ankh/voice_avatar_interface.md. A protected Vercel preview is available
for UI testing; no production enablement in this increment.

Staff voice public internet search (D-059, 2026-09-09): local code and synthetic
browser/API tests are complete, with signed source persistence and RU/EN inline
links. Next: authorized staging application of the two voice migrations, history
RLS checks, founder/Karen public-search audio continuation and mixed-data privacy
acceptance. No production enablement or paid/live test performed. See
`docs/ankh/voice_web_search.md`. Clinical phase sequence is unchanged.

Realtime Anham conversation increment (2026-09-09): local WebRTC UI/API and scoped
live text, interrupted-turn persistence, paginated staff history and broad
founder/Karen business-data read tools are implemented for a disabled-by-default,
non-sensitive account-allowlisted pilot. Next: isolated staging schema/auth/audio
acceptance with authorized credentials and synthetic speech. No production
deployment or PHI processing is authorized by this increment; see
`docs/ankh/realtime_voice.md`. Clinical phase ordering below remains unchanged.

The owner broadened access for both personas to all catalogued site/client data
(D-058, `docs/ankh/voice_site_data_access.md`). Local coverage is 46 datasets plus
published site content, with source-specific retrieval and minimal read auditing.
Staging acceptance must verify both staff personas versus denied client/guest
access, the new signed data-policy version, audit failure, absent staging tables,
device-local dates, real tool/audio continuation, long-field reads, client
disambiguation, history and interruption/save retry in both languages. No raw
SQL, secret access, business-record writes or bulk document preloading is included.

Current recovery/honesty checkpoint (2026-09-09): missing dialogue restored as a
labeled archive; production RU/EN save/reopen verified after existing PR #157.
Semantic candidate integrated current main; 72 synthetic live replies reviewed,
1,203 offline tests passed. GO for scoped candidate review; publication not performed.
See `docs/ankh/history_recovery_and_honesty_v3.md`. Older pending notes are historical.

Separate non-medical chat increment — 2026-09-09: local implementation and tests
for saved Anham welcome/check-ins and authorized synthetic staging acceptance
are CLOSED (concurrent cron/opt-out and RU/EN cabinet/admin UI). Final diff review
and integration with current main are complete. Owner explicitly authorized
the two production migrations and disabled rollout; migrations are applied and
production enable flag is `false`. Preview build is READY. Next: explicit
authorization to merge PR #156 into main (required by automatic approval review),
then verify the resulting production deployment.
Production activation remains separate.
See `docs/ankh/assistant_outreach.md`.

Published client browser baseline (2026-09-09): 18 RU/EN synthetic answers reviewed.
Incomplete history restoration and payment/uncertainty wording issues observed.
Next: diagnose persistence/retrieval, then validate the identified V2 candidate;
the production baseline does not close unpublished V2 behavior validation. See
`docs/ankh/factual_honesty_browser_live_2026_09_09.md`. No rollout authorized.

Follow-up to the local honesty checkpoint (2026-09-09): typed source projections,
scoped action receipts, less intrusive fallback behavior and an isolated 18-scenario
RU/EN live-evaluation harness are implemented. Behavior validation remains OPEN:
key reuse confirmation, real model samples and semantic review are pending. See
`docs/ankh/factual_honesty_v2.md`; no production rollout is authorized.

Local assistant hardening checkpoint (2026-09-09): centralized factual-honesty
policy, bounded client/staff reply screening and honest context failure handling
implemented. See `docs/ankh/factual_honesty.md`. Next validation for this increment
is an isolated RU/EN adversarial model evaluation; no production rollout is
authorized. This does not close Phase 2.9 or advance clinical trust readiness.

Build a system that turns heterogeneous client medical documents into a traceable, longitudinal, reviewable evidence model that allows Ankh to prepare the Case and Karen to understand and decide quickly.

Accuracy, explainability, safety and workflow efficiency are more important than maximizing automation percentage.

---

## COMPLETED FOUNDATION

### Phase 1 — Document AI Foundation
Status: COMPLETE

Delivered:
- Google Cloud project;
- Enterprise Document OCR;
- server authentication foundation;
- provider adapter;
- successful smoke tests.

### Phase 2 — Canonical Fact Extraction & Verification
Status: COMPLETE

Delivered:
- canonical lab fact model;
- parsing;
- deterministic verification;
- source provenance;
- confidence routing;
- normalization;
- idempotency;
- safe persistence design.

### Phase 2.5 — Gold Dataset & Benchmark Infrastructure
Status: COMPLETE AS INFRASTRUCTURE

Delivered:
- Gold Dataset contract;
- benchmark runner;
- error library;
- regression reporting;
- synthetic baseline;
- layout registry.

### Phase 2.5B — First Real Clinical Case
Status: COMPLETE

Delivered:
- real document classification;
- Clinical Evidence layer;
- radiology/pathology/procedure/biomarker extraction audit;
- timeline and deterministic linkage utilities;
- real Gold subset;
- security cleanup.

### Phase 2.5C — Extraction Hardening / Closure
Status: CLOSED AS REVIEW-ONLY

Delivered:
- spatial table fallback;
- pathology regression work;
- root-cause mechanisms;
- 47-target closure benchmark;
- safe `NEEDS_REVIEW`/`SOURCE_ONLY` routing.

Result:
47/47 source matches under visual review, but 0 automatic VERIFIED.

### Phase 2.7 — Verification Trust Framework
Status: COMPLETE

Delivered:
- separate trust/confidence dimensions;
- evidence classes;
- declarative gate policies;
- P0–P4 provenance levels;
- explainable trust decisions;
- reason codes;
- policy versioning;
- shadow mode;
- human calibration contract.

Result:
0/47 auto-verify under unchanged conservative policy because P3/P4 exact provenance is missing.

---

# NEXT

## Phase 2.8 — P3 Token/Span Provenance & Verification Upgrade

Status: COMPLETE FOR THE LOCALLY RETAINED, MINIMIZED CORPUS

Goal:
add exact source-span/token provenance without weakening trust policy.

Target chain:

fact
→ document
→ page
→ region
→ exact source span/tokens
→ parser
→ trust decision

Required outcomes:
- exact span/token mapping where technically available;
- provenance confidence;
- no false provenance claims;
- immutable source/canonical data;
- rerun unchanged `phase-2.7-shadow-v1`;
- report new shadow coverage and precision;
- no tuning policy thresholds to this Case.

Expected decision:
determine which evidence classes can safely approach automatic verification.

Result:
- exact P3 token provenance recovered for 6/47 targets with retained token sets;
- 41/47 remained P2 because exact raw token sets were not retained;
- P4 remained 0/47;
- unchanged shadow policy remained at 0/47 auto-verified and 0 false auto-verified;
- no source fact or production state was mutated.

---

## Phase 2.9 — Broader Real-World Validation

Status: IN PROGRESS — DATA GATE OPEN

Connected-harness checkpoint (2026-09-05): a local in-memory adapter now proves the bounded path `Google normalized result -> Clinical Evidence -> shadow Trust Decision -> Evidence Package -> Case Picture` on synthetic input. It performs no provider call or persistence and fails closed on identity, provenance, ambiguity, conflict, unit/date/reference/row and duplicate-version errors. It reconstructs an immutable source observation from normalized token/span data and checks the extracted candidate against that observation instead of against itself. Missing signals remain unknown. This validates the transformation boundary, not the correctness of OCR against the original image. A real staging database exercise and any new real-Case run remain open gates; this checkpoint does not increase Phase 2.9 coverage.

Handwriting checkpoint (2026-09-05): the existing two-pass transcription now requires source-coverage classification and character-level handwriting review. Partial/cropped sources fail closed even when visible text agrees. Remaining work is a non-production replay on authorized handwritten Cases, source-region provenance capture and human adjudication of uncertain fragments; missing image pixels are not an OCR problem and cannot be inferred safely.

Empty-form/duplicate checkpoint (2026-09-05): repository code classifies header-only untouched forms separately from clinical documents and adds a conservative content fingerprint for re-encoded duplicate photographs. Empty and filled copies of one template remain separate. Production schema/application and real replay remain pending explicit deployment authorization.

Case-scoped replay checkpoint (2026-09-06): the Karen/admin Case workspace can
now requeue active documents for a new two-pass reading without touching the
source upload. Each operator-triggered processing request claims only the
selected Case and is audited. This supports controlled validation runs but
does not itself count a Case as independently reviewed or change any trust
gate.

Identity-review checkpoint (2026-09-06): a repository implementation preserves
automatic name mismatches while allowing an authorized, audited,
document-scoped human confirmation to resume the existing two-pass Case
pipeline. Production rollout and real-Case validation are still pending.

Goal:
validate extraction + trust gates on multiple Cases/layouts.

Coverage should eventually include:
- multiple labs;
- multiple pathology formats;
- multiple radiology formats;
- PDF originals;
- mobile photos;
- multiple languages;
- low-quality scans;
- corrected/addendum documents;
- multi-page reports.

Required:
- independent human review dataset;
- false VERIFIED tracking;
- per-evidence-class precision;
- release thresholds based on risk, not marketing goals.

Current readiness:
- configurable 11-gate audit implemented; current numeric thresholds are proposed and not yet approved;
- 1/11 gates passes;
- existing evidence contains only one real Case and cannot support broader conclusions;
- synthetic fixtures remain regression-only and are not counted as real Cases.

Phase closure requires additional authorized real source material and independent review; repeating the existing Case does not satisfy this requirement.

---

# PHASE 3 — NEXORA DOCUMENT ANALYSIS / PMC DOMAIN INTEGRATION

## Phase 3A — Longitudinal Evidence Model
Status: CONDITIONAL FUTURE / TEST-ONLY

Build:
- event timeline;
- collection/exam/procedure/pathology dates;
- cross-document temporal structure;
- "SINCE KAREN LAST REVIEW";
- change detection.

Must preserve:
VERIFIED / NEEDS_REVIEW / SOURCE_ONLY status.

Phase 3 must never flatten review-only evidence into fact.

## Phase 3B — Trend Engine

Build:
- longitudinal lab trends;
- comparability;
- within-reference but meaningful change detection;
- explicit lab/reference distinction;
- no false trend across non-comparable units/methods.

## Phase 3C — Evidence Relationship Layer

Build:
- co-occurring changes;
- temporal associations;
- deterministic document relations;
- explicit separation between association and causality.

## Phase 3D — PMC Analytical Picture from NEXORA Evidence

Build:
- concise Case picture for Karen;
- major changes;
- stable areas;
- contradictions;
- missing data;
- evidence links;
- confidence/review markers.

No automatic diagnosis.

## Phase 3E — Automated Analytical QA

Build:
- deterministic checks;
- policy checks;
- AI critique;
- unsupported-statement detection;
- evidence coverage checks.

---

# PHASE 4 — KAREN WORKSPACE

Goal:
Karen understands a prepared Case in ~30–90 seconds where feasible.

Current increment: an exception-only review projection is implemented locally.
Matched/source-only and technical evidence stays available for audit without
becoming a mandatory checklist; unresolved discrepancies remain routed to
Karen. Production acceptance and workload calibration remain open.

Core UI:
- Case summary;
- data quality badge;
- major changes;
- timeline;
- all indicators;
- evidence drill-down;
- source snippets;
- unresolved contradictions;
- missing data;
- Ask Ankh;
- Karen Decision.

Internal complexity must not leak into the primary Karen view.

---

# PHASE 5 — CLIENT RESPONSE

Presentation checkpoint (2026-09-09): a shared RU/EN natural-prose rule and
server-side Markdown normalization are implemented locally across Anham's
client and staff output surfaces. Machine/source evidence and human decisions
are excluded. See `docs/ankh/anham_response_style.md`. This closes only the
local style increment, not Phase 5 or any clinical/production gate.
Isolated synthetic public-chat browser acceptance is complete in RU/EN;
language switching also preserves the current route, query and fragment.
Code review is complete, with numeric-preservation and response-boundary
regressions fixed (1096 tests passed). Next is isolated live-model and
authenticated-browser acceptance, requiring authorized keys and test accounts.
An owner-provided client account was subsequently checked on the published
site: dialogue/history and RU/EN switching pass, but published formatting
still violates the new style. A known candidate build in preview/staging
and the remaining role-specific checks are still required.

Goal:
turn Karen-approved analysis into clear client communication.

Client output should answer:
1. what was reviewed;
2. what was found;
3. what changed;
4. what appears stable;
5. what cannot be determined;
6. what data are still missing;
7. what next step was approved.

Client response must not simply copy the technical Karen interface.

---

# PHASE 6 — CONTROLLED LEARNING

Status: OPEN — not implemented by the connected-harness hardening.

Build:
- Case-only corrections;
- extraction-error library;
- methodology proposal workflow;
- rule scope;
- approval before methodology changes;
- no uncontrolled self-learning.

---

# PHASE 7 — SCALE

Targets:
- 100 cases/day;
- later 1,000 cases/day.

Required:
- queues/workers;
- idempotency;
- retries;
- provider rate-limit handling;
- observability;
- cost per Case;
- quality metrics;
- load testing;
- routing by complexity/risk;
- minimized Karen manual effort.

Do not assume 1,000 cases/day means 1,000 full manual Karen reviews.

---

# PRODUCTION GATES

Production auto-verification remains NO-GO until:
- broader real-world validation;
- validated thresholds;
- independent human calibration;
- staging persistence;
- PHI/compliance closure;
- operational monitoring;
- rollback path.

Phase 3 production remains NO-GO until these requirements are appropriately closed.

---

# ROADMAP RULE

Do not skip phases because a later feature is exciting.

Do not keep adding phases merely to create architecture.

Immediate empty-form gate: validate the structured OCR row-state contract plus fail-closed visual fill corroboration on the Case 003 empty/filled form pair. Close only after production stores `EMPTY_TEMPLATE` with zero evidence rows for the blank source, preserves the filled source as clinical content, and leaves monochrome or otherwise inconclusive marks review-visible.

Each new phase must solve a demonstrated gap in:
- accuracy;
- safety;
- explainability;
- workflow;
- scalability;
- maintainability.

- 2026-09-09: Publish approved full-review and 100-day payment links; preserve Ankh production boundaries. Retire the 299 USD Stripe link at the 1 December cutoff and verify the 500 USD replacement before that date.

## 2026-09-09 — Assistant history release

Owner-authorized isolated production publication in progress. Scope: private and client chat persistence, dated multilingual history, pagination and acknowledged retries. 1019/1019 release tests pass. No Ankh phase progression or production data-processing enablement. Final step: deployment readiness and authenticated browser reload verification.


## 2026-09-09 — Anna integrated memory and whole-archive retrieval

Owner authorized publication of the single-window founder assistant, direct save commands, and search across the complete knowledge archive. Existing assistant_knowledge remains canonical; internal notes use staff/general and authenticated created_by. Every founder question searches all active staff/both entries in pages of 200, ranks lexical matches, and adds up to 12 source-labeled notes within 24,000 characters. Latest 40 notes remain the default context. Archive failures are explicit in the answer instructions. No schema changes, PHI test data, clinical verification or client publication. Release isolated from production commit d9e001f. See docs/architecture/ANNA_DIALOGUE_MEMORY.md.

## 2026-09-09 — Complete assistant history acceptance

Fix the confirmed bulk-insert timestamp failure, retain strict storage acknowledgement, and publish the isolated change from main. Local regression passes 1092/1092. Close after production reload and RU↔EN checks confirm the dated conversation. No Ankh phase advancement or clinical processing enablement.

### Anham prose release follow-up — 2026-09-09
Owner-authorized publication is in progress; integrate current main, pass regression
and deployment checks, then verify RU/EN replies and reload on the supplied test account.
See `docs/ankh/anham_response_style_release.md`. Clinical phase gates remain unchanged.

## 2026-09-09 — Voice conversation continuity

Isolated fix based on main 77258dc: retain recognized user turns after voice interruption, cancellation or failed output; correct instructions denying supplied history; label restored interrupted AI replies. Five new behavioral tests reproduced the loss before correction. No schema, PHI test data or clinical phase changes. Production acceptance remains open; see docs/ankh/voice_conversation_memory.md for validation and exact release step.

## 2026-09-09 — Server conversation recall

Client and private text generation now retrieve own stored conversation server-side: 60 recent rows plus up to 12 older lexical matches, constrained by authenticated profile, tier family and exact personal/Case scope, without locale filtering. Existing staff voice text-bridge calls inherit this context. Bounded, source-tagged excerpts remain unverified conversation; no schema or clinical gate changes. 1550/1550 tests across 168 files PASS; TypeScript, ESLint PASS. Isolated implementation CLOSED / GO for release; production recall acceptance NOT CLOSED. See docs/ankh/server_conversation_recall.md. Retains voice interruption correction 59e9306.

## 2026-09-09 — Lifetime text and voice conversation archive

Owner requires no age-based expiry for saved conversations with clients, Karen and Anna. Existing assistant_messages remains canonical. Native text and realtime tools now search/page/read full own messages of any age and language, including voice transcripts; authenticated owner/tier isolation and original Case labels remain. Do not add a rolling retention purge or replace originals with summaries. Request context/tool budgets do not limit archive age. Existing explicit deletion workflows remain. OpenAI archive calls use Responses store:false with unchanged model/reasoning; Claude uses native tools. Synthetic 2001-record live checks passed for both providers. No schema or clinical-gate change. See docs/ankh/lifetime_conversation_memory.md for limits, final checks and release status.

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
## 2026-09-10 — More built-in voice choices
Owner requested more voices while retaining Marin. Added Alloy, Ash, Ballad, Echo
and Shimmer to the existing five, using the official Realtime supported set.
Existing selected voice and preference key preserved; no custom voice activation.
Same localized picker/preview and shared diction apply. Details: docs/ankh/more_voice_choices.md.
## 2026-09-10 — Voice connection recovery and failure diagnostics
Screenshot shows interrupted Echo call; exact past failure cannot be reconstructed.
Production logs around 20:08 UTC show tools 503 and successful transcript saves,
but no provider data-channel error details. Browser previously ended on transient
disconnected and mislabeled every provider error as network failure.
Now waits up to 8 seconds for the existing peer, with RU/EN status, and distinguishes
service failures. Authenticated, receipt-bound, quota-limited diagnostics retain only
enumerated code/voice/locale, no speech or provider message. See docs/ankh/voice_connection_recovery.md.

## 2026-09-10 — Patient voice and thinking-partner behavior
Release low-eagerness semantic turn detection and the shared RU/EN thinking-partner
dialogue policy. Implementation and focused regression are closed. Next acceptance:
one natural Russian microphone conversation with reflective pauses, an unfinished-
thought correction and a request to test an assumption. See
docs/ankh/anham_thinking_partner.md.

## 2026-09-10 — Confirmed client cabinet actions in voice
Release the owner-scoped prepare-confirm-execute path for the existing client voice
preview. The isolated confirmation-ledger migration is applied. Publish the website
code, then accept with a synthetic supplement schedule and Professor message;
do not broaden to payment, documents, Case state or clinical decisions. See
docs/ankh/client_confirmed_voice_actions.md.

## 2026-09-10 — Published numeric sign acceptance
The mathematical-sign loss before numbers is fixed, published and accepted.
PR #158 and PR #160 are merged; merge commit ae210e9 is an ancestor of
origin/main and production deployment dpl_44jRTzEbgABPovMjcgK5TrXSvuwP was READY
on pythonmethodcenter.com and www.pythonmethodcenter.com. Synthetic test-account
acceptance covered RU, EN, RU → EN → RU, reload and signs, decimals and units
after no-break, narrow no-break and thin spaces; no runtime errors were found for
the client and history assistant routes. This closes the scoped prose and
numeric-sign release only. The fix stays general Unicode-whitespace handling,
never a rule for a single value. No raw provider response was recovered, the
defect is reproduced only synthetically, and the link to the original live
omission is unproven. The separate mobile-project build failure is unrelated and
not attributed here. No schema, migration, role, payment or authorization change,
and no clinical, PHI or auto-verification gate closed: Phase 2.9 stays open and
Phase 3 production and production auto-verification remain NO-GO. Next work on
this line is ordinary regression coverage only, not a new sign rule. See
docs/ankh/anham_response_style_release.md and
docs/ankh/anham_unicode_numeric_signs.md.

## 2026-09-11 — Anna-only voice pilot costs

Voice pilot price and billing copy are private to the primary founder Anna.
The voices endpoint derives visibility from the authenticated email using the
existing primary-founder identity; query/body claims and additional founder
accounts cannot grant it. Live SSE omits monetary fields for everyone else;
server audit retains accounting. RU/EN voice UI keeps duration and privacy
disclosure for all users. No schema, clinical, memory or audio-flow changes.
Validation and release status: docs/ankh/live_cost_visibility.md.

## 2026-09-11 — Retired classification and operational repairs

Close the remaining active Case classification surfaces, make founder gap
recording atomic, repair the live WebSocket server bundle and restore the
mobile project's root build. This operational release does not advance an Ankh
clinical phase or relax any production trust gate. Evidence:
`docs/ankh/retired_classification_atomic_gaps_voice_release.md`.

## 2026-09-12 — Operational repair acceptance CLOSED

PRs #182–#185 are merged and the final main deployment is READY. Signed-in
RU/EN Case acceptance and the non-PHI refusal → event → inactive draft →
founder unread notification path pass in production. The mobile preview builds
from the corrected root. No clinical phase advances: Phase 2.9 stays open and
Phase 3 production and automatic production verification remain NO-GO. The
next action on this line is routine monitoring of `/api/assistant/live` and
gap-event quality; any change to mixed clinical/payment routing requires its
own product decision and fixtures.

## 2026-09-11 — Voice-to-text background handoff

Release the bounded continuation path: ending voice during a current delegation
must close WebRTC immediately, continue the authenticated backend call, save one
idempotent answer in the same conversation and refresh it into text chat. No new
memory store or route. After publication, Anna accepts the Russian payments-count
scenario and one English scenario. Work beyond the 300-second function lifetime
requires a separately reviewed durable workflow. See
docs/ankh/voice_background_continuation.md.

## 2026-09-13 — Platform cost observability

Publish the Anna-only `/admin/costs` inventory and GPT-Live 30-day audit total.
Keep unconnected vendor invoices visibly unknown. Next accounting phase: add
first-party usage/billing feeds for text AI, web search, Google Cloud, Vercel,
Supabase and Stripe fees before claiming a complete platform total. See
docs/architecture/ANNA_PLATFORM_COSTS.md.
# Client communication channels — 2026-09-17

- [x] Separate Anham, Professor Python and Support in the client cabinet.
- [x] Add independent Professor and Support unread badges to navigation and home.
- [x] Preserve the existing message stores and read boundaries.
- [x] Complete release verification, merge and production acceptance.
# Support conversation chronology — 2026-09-17

- [x] Keep every support reply in the existing append-only message store.
- [x] Show Today/Yesterday/date separators and each message's local time.
- [ ] Complete release verification and production acceptance.
# Client email notifications — 2026-09-17

- [x] Notify the registered account owner about new Support messages.
- [x] Notify the registered account owner about new Professor Python messages.
- [x] Keep email neutral, bilingual, deduplicated and free of Case/medical text.
- [ ] Complete full release verification and production acceptance.

# 2026-09-18 — Anham birthday greetings

- [x] Complete implementation, regression, security/build checks and preview validation.
- [x] Apply and verify the production migration and least-privilege function grants.
- [x] Merge PR #203 and complete primary/clinical production deployments.
- [x] Verify the public site, cabinet login gate and unauthenticated cron denial without sending a real greeting.

Published as main `5ba27eb38405d68a14e76a5d0dca00139941b90f`. Routine next action: observe the next scheduled run and client history; do not manually invoke the production birthday RPC. No Anham clinical phase gate changes.

# Personal Support staging acceptance — 2026-09-19

- [x] Harden checkout and recurring-invoice amount/term validation.
- [x] Make webhook processing retryable and service-period issuance idempotent.
- [x] Add focused regression tests for 1–12 month amounts and duplicate access.
- [ ] Apply and verify `20260919123000_personal_support_billing.sql` on the
  confirmed `ankh-staging` project only.
- [ ] Configure 12 prepaid and 12 auto-renew Stripe Test Mode links with exact
  metadata, amount, 30-day interval and trial durations.
- [ ] Verify success, failure, redelivery, renewal, cancellation and Customer
  Portal against staging without real charges.
- [ ] Run the full clean dependency/build/regression gate and publish a new PR
  preview. Production and merge remain HOLD.

## 2026-09-22 — Stripe Checkout automation follow-up to PR #215

- [x] Replace the 24-link requirement with dynamic authenticated RU/EN Checkout.
- [x] Automate localized catalog/Portal configuration and validate 1–12 terms.
- [x] Preserve signed-webhook entitlement contract and record renewal consent.
- [x] Finish Stripe Sandbox authorization; create/verify four localized products,
      six prices and two Portal configurations.
- [x] Apply/verify PR #215 billing migration on isolated `anham-staging`
      (`thylrayzjczsxlyqhtfc`); production unchanged.
- [x] Create actual Sandbox Checkout Sessions for assessment and boundary terms;
      inspect correct RU/EN copy, upfront totals and deferred renewal pricing.
- [x] Owner completed the prepared RU one-period Sandbox payment; verify paid
      invoice, subscription and exact 30-day deferral from Test Clock start.
- [x] Inspect actual RU Portal invoice/card and cancellation preview end date.
- [x] Advance a Stripe Sandbox Test Clock and collect the first 1,300 USD
      automatic renewal; verify paid invoice, next access period, delivery task
      and idempotent webhook resend in staging.
- [x] Execute final Portal cancellation for the owner's approved synthetic
      12-period Sandbox subscription; verify renewal off and paid access
      preserved through 19 September 2027.
- [x] Verify a READY Vercel Preview for the latest revision (`ae9e6d3`);
      protected success page returns HTTP 200 through authorized connector access.
- [x] Sign in as a synthetic staging client and open authenticated RU/EN
      Sandbox Checkout Sessions; verify `oferta-v10` consent rows and totals.
- [ ] Complete an authenticated paid return from Stripe to the Preview app.
- [x] Connect isolated Preview secrets and signed Stripe Sandbox webhook with
      a separate revocable bypass secret approved by the owner.
- [x] Resolve Stripe's "free trial" labeling with a paid initial subscription
      period; hosted Sandbox Checkout showed no free-trial language.
- [ ] Resolve a remaining hosted Checkout disclosure conflict: its prominent
      EN summary says `$7,800 every 180 days` for a six-period initial term,
      while the scheduled subsequent billing is `$1,300 every 30 days`.
      An unpaid $0-recurring-plus-one-time pilot retained the same headline.
      The draft branch now uses Checkout Elements for renewal-selected 2–12
      terms. Preview exposed a disabled Pay button because the required full
      billing address was not collected. The branch now mounts Stripe's
      BillingAddressElement; READY Preview `8c75ba6` enabled Pay and the owner
      completed the EN six-period Sandbox payment. The paid return, invoice,
      subscription and gift task pass. A pre-onboarding buyer has no Case, so
      no paid service period was created: resolve and retest this access gap
      before treating the full paid flow as accepted.
- [ ] Verify actual Stripe payments, renewal clock, failure/retry/cancellation and
      RU/EN customer pages; local tests alone do not close these gates.
- [ ] Publish only after the existing release gate; deactivate retired sales
      links at launch while preserving subscription/history objects.

### 2026-09-22 — Authorized production preparation

- [x] Apply and verify the additive production billing migration; preserve all
      existing service-period rows and owner-only billing reads.
- [x] Inventory the Live catalog and webhook; prepare exact environment values
      and record missing recurring events.
- [x] Obtain official Live Stripe `product_write` expansion and create/read
      all four localized products through the approved connection.
- [x] Obtain official Live Stripe `plan_write` and `customer_portal_write`
      expansion after the first Price and Portal writes were denied. The
      authorized connection created/read back 30 Prices and two Portal configs.
- [x] Authenticate Vercel and stage the Production configuration with
      `STRIPE_CHECKOUT_ENABLED=false`; sales remain disabled.
- [ ] Finish the open acceptance/UX gates and publish the approved model.

Evidence: `docs/validation/stripe-production-readiness-2026-09-22.json`.
Production schema is prepared; commercial publication remains HOLD.
# Payment launch checkpoint — 2026-09-22

- [x] Replace misleading trial-based prepaid deferral with a paid initial
  subscription period and scheduled 30-day renewal phase.
- [x] Prove 1–12 amount/duration contracts and webhook schedule idempotency in
  automated tests; run full regression, type, lint, security and build gates.
- [x] Verify revised invoice-period anchoring on the READY Preview with a
  fresh paid 12-period Sandbox subscription: Stripe and staging share the
  exact 360-day dates, one paid period and one gift-delivery task.
- [x] Verify a 6-period prepaid-only Sandbox payment: 7,800 USD, no renewal,
  exactly one active 180-day staging period and one assigned gift-delivery task
  with quantity 6. This Checkout used the earlier v9 offer.
- [ ] Verify failed renewal and authenticated paid return in the isolated
  Stripe Sandbox + staging Preview. Final Portal cancellation passed; app Checkout/v10
  consent is verified with unpaid RU 1-period and EN 6-period Sessions. The
  owner deferred the failed-renewal simulation; do not run it until newly
  authorized.
- [x] Obtain official Live Stripe `product_write` and create the four RU/EN
  Products.
- [x] Obtain official `plan_write` and `customer_portal_write`; create and
  read back 30 Live Prices and two localized Portal configurations.
- [x] Verify Production Vercel mode/origin/tax/disabled-sales settings without
  revealing Stripe secrets; remove false tax-at-Checkout copy in RU/EN and
  advance the offer fingerprint to v10. Local regression/build, GitHub CI and
  READY Preview pass; RU/EN route switching and 390×844 mobile tariff rendering
  pass.
- [ ] Add the four recurring events to the existing Live webhook after the
  handler is deployed, then verify Production runtime.
- [ ] Merge PR #215 then #216, publish, retire old offers for new sales and run
  RU/EN production smoke. Until all unchecked items pass: NO-GO.
