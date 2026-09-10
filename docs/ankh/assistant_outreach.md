# Сохранённые сообщения Анхама / Saved Anham outreach

Date: 2026-09-09. Scope: implementation, local regression, authorized synthetic
staging acceptance and final release preparation. Production untouched; the
production migration attempt was rejected by automatic approval review.

## A. Before

Registration created `profiles` through `createRegistrationProfile`. Signed-in
conversations were stored in `assistant_messages`, ordered by `message_sequence`
and filtered by locale. Cabinet and staff both read through
`getOwnAssistantHistory` / `getAssistantHistoryForCase`. There was no outgoing
welcome/check-in scheduler or explicit outreach preference. Two daily Vercel
jobs already handled document processing and the medical digest.

## B. Implemented behavior

- After a successful registration profile write, attempt one saved welcome.
- Daily cron retries missing welcomes and inserts at most one due check-in per
  eligible profile. A check-in requires at least **72 elapsed hours** since the
  previous automatic message, including the welcome. Missed intervals never
  produce catch-up bursts. Ordinary user-requested replies are unaffected.
- Only `profiles.role = client` with account status `registered` or `active`
  qualifies. No Case, payment or upload is required. Staff, suspended and closed
  accounts do not qualify. These are existing account access fields, not Case
  processing classifications.
- Store one row per delivery in **the existing `assistant_messages` history**,
  with immutable RU/EN template copies. The reader chooses the active language
  without making another delivery or exposing the other-language conversation.
- The client chat has an authenticated stop button. Recognized explicit RU/EN
  refusal commands stop outreach before AI provider/quota checks. A DB trigger
  also catches saved user refusals from other paths, including voice transcripts.
  The worker checks older saved user messages before delivering. Once recorded,
  an opt-out is never automatically reset.
- All automatic copy is fixed, gentle and organizational. No medical inference,
  document analysis, diagnosis, treatment or outcome promise is generated.

## C. Files

New:

- `supabase/migrations/20260909210136_assistant_outreach.sql`
- `supabase/migrations/20260909221034_assistant_outreach_skip_busy_preferences.sql`
- `scripts/staging-outreach-acceptance.mjs`
- `lib/assistant/outreach.ts`
- `app/api/cron/assistant-outreach/route.ts`
- `app/api/assistant/outreach/route.ts`
- `components/assistant/AssistantOutreachPreference.tsx`
- `tests/assistant-outreach-sql.test.ts`
- `tests/assistant-outreach.test.ts`
- `tests/assistant-outreach-refusal-route.test.ts`
- this document

Updated: `lib/profile/registration.ts`, `lib/assistant/history.ts`,
`app/api/assistant/client/route.ts`, `components/assistant/AssistantChat.tsx`,
`app/(admin)/admin/cases/[caseId]/page.tsx`,
`vercel.json`, `.env.example`, `package.json`, `package-lock.json`,
`CURRENT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`.

## D. Schema and concurrency

`assistant_outreach_state` stores the profile FK, sticky opt-out, actual last
delivery timestamp and delivery count. It has RLS enabled, no client grants or
client policies; the service role alone can read/write it. `assistant_messages`
gains `outreach_number`, `outreach_translations`, a payload constraint and a
unique partial index on `(profile_id, outreach_number)`.

The service-only `SECURITY INVOKER` RPC owns one transaction containing profile
eligibility, locks, preference recheck, message insertion and cursor advancement.
`FOR NO KEY UPDATE ... SKIP LOCKED` claims profiles; `FOR UPDATE SKIP LOCKED`
claims existing state rows without waiting on a concurrent preference write.
State initialization has a 500 ms lock timeout and skips a busy profile.
A committed opt-out is observed
before the next insert. An opt-out cannot remove a message whose delivery
transaction already committed. Unique message numbers are a second duplicate
barrier. All functions have an empty search path and explicit execute grants;
`PUBLIC`, `anon` and `authenticated` cannot call the worker.

An HTTP timeout after commit is safe to retry. A failed insert rolls the cursor
back with the message. The migration itself does not send messages, enroll
profiles or contact external services.

## E. Verification

- `npm test` after integration with current main: **132 files passed, 1,058 tests passed, 0 failures**.
- New outreach coverage: **54 tests**, including 21 SQL integration cases,
  30 cron/preferences/registration/history cases and 3 refusal-route cases.
- `npm run typecheck`: passed, exit 0.
- `npm run lint`: passed, exit 0; no warnings.
- `git diff --check`: passed (Git may print Windows line-ending notices).

The SQL tests execute both new migrations unchanged in PGlite 0.5.8, using
the repository profile/history definitions plus synthetic auth/Case scaffolding.
They cover real inserts, 72-hour boundaries, retries, no catch-up burst, opt-out,
historical/voice-path refusals, role/account exclusions, bounded batches, atomic
rollback, uniqueness, permissions and existing history RLS. API tests exercise
actual handlers with mocked service/auth clients; none connect to Supabase.

RU → EN → RU history projection is tested for the same message ID in both
cabinet and staff readers; both routes remain unchanged. UI code was reviewed
for localized button/error/status text, pending state and asynchronous fetch
races. PGlite serializes its query connection; the separate real staging
concurrency/browser acceptance below closes that earlier validation gap.

During implementation, TypeScript exposed an untyped SQL-test row and an
existing schema-text test could not parse a multi-column ALTER statement. Both
were fixed before the final full run. No unresolved test failures remain.

## F. Benchmarks

No extraction/trust code changed. The full suite also ran its synthetic Ankh
benchmark: critical numeric match, verified precision, needs-review recall and
provenance availability all 100%; critical extraction errors, false VERIFIED
critical errors and security issues all 0. This is synthetic regression evidence,
not a claim of clinical generalization or production readiness.

## G. Security / PHI

No PHI documents, real client messages, credentials or raw provider errors are
used in tests, logs or committed artifacts. The worker reads existing saved
user text inside the DB solely for refusal detection and sends no text to an AI
provider. No email, push, Telegram or external AI call is made by outreach.
Cron requires a non-empty `CRON_SECRET` bearer match. The opt-out endpoint derives
identity only from `auth.getUser()`, ignores payload profile IDs and returns no
other user's preference. State writes cannot reset message numbering.

## H. Limitations / operation

- `ASSISTANT_OUTREACH_ENABLED` defaults off and requires exact value `true`.
  It was enabled only in the temporary local staging process, then that process
  was stopped. No production environment was changed.
- Optional `ASSISTANT_OUTREACH_PROFILE_IDS` restricts both registration welcomes
  and cron to a comma-separated UUID allowlist. An empty/malformed/oversized
  configured list fails closed; unset means the usual eligible population.
  The staging run was scoped to exactly one newly created synthetic client.
- Apply the migration **before** deploying code that reads the new history
  columns. Keep sending disabled during deployment/rollback verification.
- Cron processes at most 100 eligible profiles per invocation, oldest due first.
  A larger backlog is deferred to later daily runs; capacity is not unbounded.
- Vercel Hobby was confirmed for the connected team. The added schedule is
  `20 15 * * *` (15:20 UTC daily), retaining both existing jobs. Actual delivery
  may be later than 72 hours because eligibility is checked daily and Hobby
  execution time is imprecise. It is never intentionally earlier.
- Current official Vercel documentation allows 100 cron jobs per project and
  daily jobs on Hobby. The bundled skill's older two-job limit is superseded by
  the [current usage documentation](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- Free-text refusal matching is conservative and covers explicit command
  patterns, not arbitrary natural-language intent. It may stop on a narrower
  request such as “не пиши ...”; the explicit button is the unambiguous control.
  Refusals in other channels or never saved in this platform are not visible.
- Existing eligible profiles inside the configured scope without a refusal will
  receive a welcome after future authorized enablement. No global backfill ran.
- A deleted history row is not recreated while its delivery cursor remains.
  Messages arrive in the saved history and appear on its next load; no new
  realtime/push subscription was added.

## I. Intentionally excluded

Real-user sends, external notifications,
medical generation, auto-verification, new Case/status models, automatic
re-enrollment and self-learning. Existing document/clinical production gates
are unchanged. Production migration/deployment remain pending the explicit
authorization required by automatic approval review.

## J. Phase

**CLOSED for implementation and the authorized synthetic staging acceptance.** This is a separate
non-medical chat feature, not closure of Ankh clinical Phase 2.9 or Phase 3.
Final release review and integration are complete. Production rollout is
**NOT CLOSED**: automatic approval review rejected the migration attempt and
requires explicit production schema authorization.

## K. GO / NO-GO

**GO** for the prepared release after explicit production schema authorization.
**NO-GO** for production activation or real-client delivery in this task.

## L. Exact next action

Obtain explicit authorization to apply the two named outreach migrations to
production project `zdrfttgwnyorifmpqgwe`, then merge/deploy the prepared release
with outreach disabled. Apply both migrations before the new history reader
is deployed. Real-client activation and its initial scope remain separate
owner decisions.

## Final release preparation — 2026-09-09

Reviewed the complete feature diff and merged published tariff changes from
`origin/main` (`addefd6`, including the published Anna memory/archive update) into `codex/assistant-outreach-disabled-release`.
The only merge conflict was in `DECISIONS.md`; both decision records were kept.
All 1,058 tests, TypeScript, ESLint and diff whitespace checks passed afterward.
Generated benchmark timestamps were restored; no raw client data or secrets
were added to the release.

Production read-only checks confirmed history prerequisites (`locale`,
`message_sequence`) and the existing document identity review field. No
outreach state table existed. Vercel project
`prj_Lym5X8Vru64nF1iuoW57BGTgtLpE` belongs to the expected platform; its variable
list showed no `ASSISTANT_OUTREACH_ENABLED` in any environment. Missing is
disabled in code. The attempted dashboard interaction to add explicit false
timed out without changing settings. CLI was logged out; no credentials were
created or modified.

Automatic approval review rejected `assistant_outreach` against production
`zdrfttgwnyorifmpqgwe` before execution, stating that a general "next step"
authorization is insufficient for this production schema change. The second
migration was not attempted. No workaround, production deployment, real-user
send or clinical gate change occurred. The release must remain unmerged until
both migration prerequisites are satisfied.

## Authorized staging acceptance — 2026-09-09

Target: existing `ankh-staging`, project ref `atdmzkciqxdgblusbhtr`, parent
`zdrfttgwnyorifmpqgwe`. Branch metadata confirms `is_default=false`,
`with_data=false`; its old `MIGRATIONS_FAILED` orchestration flag remains, but
the database and Auth are usable. Other tasks were using this branch, so this
run used separate marked synthetic client/admin accounts, one synthetic Case,
a one-profile delivery allowlist and separate local ports/loopback cookies.

Applied only to staging:

- `assistant_outreach`;
- `assistant_outreach_skip_busy_preferences`;
- existing prerequisite `document_identity_manual_review`, whose missing
  `uploaded_documents.identity_review_status` prevented the real Case page
  from loading. Its existing repository SQL was not changed.

The local Next.js application ran against real staging Supabase Auth/PostgREST.
The loopback-only helper used real password authentication for its synthetic
accounts and set normal Supabase session cookies. It did not bypass application
authorization, modify production settings, send email or invoke model providers.

| Acceptance scenario | Observed result |
| --- | --- |
| Two simultaneous authenticated cron HTTP requests, empty history | HTTP 200/200, sent 1/0; exactly one `assistant_messages` row, outreach number 0 |
| Original worker while opt-out transaction held its row lock for 20 seconds | One request hit the PostgREST timeout: HTTP 503 after 8,234 ms; second returned 200/0. No extra message. This failure prompted the corrective migration. |
| Corrected worker while the opt-out transaction was still uncommitted | Both HTTP 200/0, 282 and 374 ms. The independent read still saw old opted-out=false during the held transaction, proving overlap; after commit opted-out=true, count remained 1. |
| Real cabinet saved history, RU → EN → RU | Same route `/cabinet/chat`, one saved welcome translated in both directions |
| Real admin Case history, RU → EN → RU | Same Case route and same saved welcome; fixed previously hardcoded Russian locale and localized the history block |
| Client stop button | PATCH 200; persisted opted-out=true; Russian success text |
| Reopen chat after switching to English | Persisted state displayed as “Anham’s automatic messages are off.” |
| Two further cron requests after UI opt-out, with synthetic cursor deliberately older than 72h | Both HTTP 200/0; one message and delivery count 1 remained |
| Browser errors after final client flow | No captured console errors; visual chat inspection passed |
| Cleanup | Both owned auth users, profile, Case, messages and state removed; SQL counts all 0; local credential/fixture files removed; local server and tab closed |

The first attempt to apply the correction was rejected for an escaped SQL
dollar delimiter; it made no schema change. The delimiter was corrected,
both migrations passed local SQL tests, then the corrected migration applied
and the real race was repeated successfully.

Security advisors show no outreach WARN/ERROR. Their INFO that
`assistant_outreach_state` has RLS with no policies is intentional: all client
grants are revoked and service access is explicit. The
[Supabase RLS-no-policy explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
describes this finding. Existing mutable-search-path and public-definer warnings
were present before this task and are not caused by outreach.

Remaining bounds: this acceptance uses the actual application against hosted
staging, but not a Vercel preview deployment. Older unrelated parts of the admin
page still contain Russian-only copy; the changed history block follows locale.
No production clinical/PHI gate changes and no real-client sends occurred.
