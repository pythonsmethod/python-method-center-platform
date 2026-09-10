# ROADMAP.md — ANKH ANALYSIS SYSTEM

## Authorized honesty publication — 2026-09-09

The owner explicitly instructed “Публикуй”. The release candidate integrates main
66fa3bd (PR #158 response style and route-preserving locale changes), while keeping
the existing history timestamp fix, founder memory and disabled outreach.
Final merged regression: 157 files, 1,321 tests passed, zero failed or skipped.
TypeScript and ESLint passed. One old test assumed locale guidance was the last
prompt text; it now verifies selected-language presence and opposite-language
absence while allowing source-availability context. No production schema or
clinical trust change. Publication and live acceptance are in progress; final
release evidence is recorded in docs/ankh/history_recovery_and_honesty_v3.md.
This checkpoint supersedes earlier no-deploy notes for this scoped release only.


## North Star

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

# PHASE 3 — ANKH ANALYTICAL ENGINE

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

## Phase 3D — Ankh Analytical Picture

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
