# History recovery and factual honesty V3 — 2026-09-09

## A. Before and confirmed cause

The owner authorized recovery and correction after the 18-scenario client browser
baseline. This worktree was behind production. Main contains PR #157 (`dbf7c9d`),
which fixes a bulk insert's missing answer timestamp: PostgREST supplied NULL
while `created_at` is NOT NULL, rejecting both rows. See
`../architecture/ASSISTANT_HISTORY_TIMESTAMP_FIX.md`.

Vercel listed the production deployment for `dbf7c9d` as READY, created during
the baseline run. The first five retained baseline pairs start at 00:38 UTC on
September 10 (17:38 September 9 in the browser). Account-scoped read-only checks
found none of the earlier thirteen exact test questions. These findings explain
the split observed in the baseline; no per-request deployment trace was collected.
This task did not author or deploy PR #157.

## B. Recovery and changes

The captured browser transcript still contained the missing 26 visible messages.
The transferred representation matched the capture: 26 entries, 9,413 serialized
characters, comparison fingerprint `3ffb6078`. This is UI-normalized text, not a
claim to reproduce the original byte-level formatting.

With owner authorization, one explicitly labeled bilingual archive message was
appended to the same account/Case's existing `assistant_messages`. It contains all
13 missing exchanges, original wording (including model errors), author labels
and the original displayed minute-level times. Its database timestamp is the
actual recovery time. No invented seconds, backdated native rows, sequence
rewriting or replacement of existing messages. The insert and one `audit_logs`
recovery event were atomic and used a stable archive ID to avoid duplication.
Readback confirmed one archive row and exact archive text equality. This is an
archival recovery, not 26 recreated native chat bubbles.

The worktree advanced from `369733f` to main `27edbd5` on
`codex/history-recovery-honesty-20260909`. Prior changes were saved and reapplied;
the named stash remains as a recovery copy. Merge resolution retains published
history acknowledgement, private/client separation, multilingual pagination,
provider refusals, founder memory and disabled outreach. Guarded model replies
use the current acknowledged persistence path; actual server-owned memory and
outreach confirmations retain their execution paths.

Canonical provider-wide policy and source instructions now require:

- Attribution throughout the whole answer, including proposed client text:
  reported payment is not a system observation of payment.
- Unavailable records establish neither pending payment, synchronization delay,
  eventual activation nor a deadline.
- Unverified AI text is not automatically fabricated/false. An author's explicit
  admission can support an attributed conclusion of fabrication.
- Missing assistant context does not establish what the entire organization
  knows, publishes or possesses; a route does not verify its live contents.
- Medical limitations describe this assistant's evidence/role, not a universal
  claim that clinicians cannot diagnose without laboratory tests.

No number/URL coincidence regex or universal semantic verifier was introduced.
The policy remains instruction-based; the narrow action backstop is not a proof
of truth. Original erroneous baseline answers were retained as history.

## C–D. Files and data

Policy/source/evaluation: `lib/assistant/factual-honesty.ts`, `source-context.ts`,
`honesty-evaluation.ts`, `scripts/assistant-honesty.eval.ts`,
`vitest.honesty-eval.config.ts` and its test. V2 source projections/provider/route
integrations remain in the candidate. Memory: CURRENT_STATE, ROADMAP, DECISIONS
and the factual-honesty reports.

The corpus now has 26 scenarios (13 mechanisms × RU/EN). Eight added samples
cover payment templates, invented pending-state explanations, unverified versus
fabricated claims, and explicit evidence of invention. Runs support validated
scenario selection, named artifacts and incremental results. A config bug was
fixed: `mergeConfig` concatenated include arrays and reran offline tests. The
isolated config now replaces include; `vitest list --filesOnly` returns only
`scripts/assistant-honesty.eval.ts`.

Production writes here: one archive + one audit event, then four normal chat rows
from two synthetic acceptance exchanges. No schema, grants, RLS, clinical state
or extraction/trust-threshold change.

## E–F. Verification

- Initial focused integration: **83/83 tests, 11 files**.
- Full merged offline regression: **1,203/1,203 tests, 150 files**, zero failed.
- Final focused check after scope/runner changes: **14/14 tests, 4 files**.
- Final TypeScript and ESLint: passed. Diff checks passed. Build result below.
- Existing synthetic Ankh benchmark: 3 documents / 4 pages; zero critical
  extraction errors, false VERIFIED critical errors and security issues.
  Generated artifact churn restored. No clinical accuracy inference.

Build: **passed**, including compile, type/lint checks, 51/51 static pages and
traces. Initial attempts failed on blocked Google Fonts networking, cache-read
memory allocation, then ENOSPC (14 MiB free). Only this worktree's generated
`.next` output was removed after path/link checks. Final build temporarily disabled
webpack disk cache and used one worker/memory optimizations to fit available space.
The original `next.config.mjs` was restored byte-for-byte; no build-setting change
is included in the candidate. A normal deployment build still needs adequate
resources; successful local no-cache build is not a production deployment.

Live evaluation used synthetic fixtures/static personas with database knowledge
mocked out. Existing project keys were used in memory under the owner's permission
to perform corrections and verification; no key was printed, written to a new env
file or changed.

**72 raw/delivered answers collected and reviewed by Codex:** initial 26/provider
(Claude and GPT), then 10/provider after context-scope clarification. All 72
transports completed; zero replies replaced by the action screen. This is not a
100% factual-accuracy score. The initial runs also redundantly ran 1,203 offline
tests due to the include bug; their 1,229 totals are not 1,229 live samples. Final
targeted runs each executed only ten live scenarios.

Both providers kept attribution in payment-template cases, refused invented
pending/synchronization states, and separated unverified figures from fabrication.
They allowed attribution to an author's admission. Final citation replies limited
missing confirmation to available context. Arithmetic, quotations, action-refusal
and medical boundaries held in the sampled candidate replies. Raw text and
Codex review notes are retained locally in `output/assistant-evaluation/live-*.json`;
owner review is separate.

Signed-in production acceptance after the existing timestamp fix:

- New RU and EN exchanges received replies without storage warnings.
- Database readback found one user and one assistant row per locale, each with a
  non-null timestamp.
- Reopening and RU → EN → RU preserved `/cabinet`, the archive and both new pairs.
  All 26 archived quotations were visible. Browser left in Russian, chat open.

## G–I. Security, limitations and exclusions

Only the identified test account/Case was used for restoration. No client documents,
screenshots, credentials or account identifiers are retained in this report.
Direct model tests loaded no real account context. Production browser acceptance
used the existing context pipeline; this does not certify that pipeline PHI-free.
No human was messaged. No new PHI processing, provider or clinical workflow.

Residual limitations:

- Some Claude replies remain verbose, describe typical page behavior, or add
  irrelevant tariff numbers when clarification alone would suffice. Those numbers
  exist in the persona; they are not invented analytics, but the desired minimal
  clarification behavior is not fully met.
- No diagnosis/treatment was delivered. Some explanations of medical limitations
  remain broader than necessary; no clinical accuracy is established.
- These samples do not guarantee universal hallucination prevention. One sample
  per scenario/run is not statistical validation.
- The timestamp fix is not an offline outbox. Prolonged storage outages can leave
  an explicitly unsaved reply; recovery needs a retained copy.
- The recovered archive is one labeled message. Old native identities, exact line
  breaks and second-level timestamps were not recreated by guessing.

No unrelated UI redesign, processing classification, outreach activation, medical
interpretation, production migration or code deployment by this task.

## J–L. Closure and exact next action

History recovery and production persistence acceptance: **CLOSED** for the tested
account/scenarios. Targeted semantic correction and bounded live evaluation:
**CLOSED**, with residual quality notes above. No universal truthfulness or clinical
readiness claim; existing Ankh production NO-GO gates remain.

**GO for scoped publication: the owner explicitly instructed “Публикуй”.**
Publication is in progress. Before merging, integrate current main (including the
published response-style and locale changes), rerun regression and verify the
remote build. After deployment, repeat payment attribution and unverified-evidence
regressions in RU/EN and verify persistence on the identified production revision.
Earlier no-deploy notes above are historical; clinical production gates are unchanged.

## Authorized release integration

Integrated published main 66fa3bd / PR #158. The response normalizer and source
honesty guard both precede persisted client/staff replies. Existing founder memory
and outreach execution paths are preserved. Final full regression: **157 files,
1,321/1,321 tests passed, zero skipped**; TypeScript and ESLint passed. The first
merged run had one assertion failure because the language test assumed its text
was last; the revised assertion checks correct language and rejects the opposite
language without coupling the test to source-context ordering. No runtime defect
was hidden and no production schema changes are included.

Release follow-up: integrated main ae210e9 (PR #160 numeric-sign preservation
with Unicode spacing). All 116 focused tests in six affected response-style,
persistence and honesty suites passed. This integration changes no clinical gate.
