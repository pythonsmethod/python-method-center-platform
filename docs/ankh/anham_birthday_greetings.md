# Anham birthday greetings — 2026-09-14

## A. Before

The append-only health questionnaire already stored the account owner's date of birth. The existing `assistant-outreach` production cron was authenticated with `CRON_SECRET`, and scheduled outreach already had a sticky opt-out. There was no birthday delivery and profiles had no local time zone.

## B. Behavior

The daily cron calls a separate service-only, `SECURITY INVOKER` birthday RPC even while ordinary outreach remains disabled. The RPC reads only the latest immutable questionnaire version for each eligible client, compares month/day in the stored profile time zone, honors the existing outreach opt-out, and inserts one fixed bilingual message into the existing private assistant history. A unique event key permits at most one greeting per profile and local year.

The account form records the browser's IANA time zone on the next ordinary profile save. Existing profiles default to `America/Los_Angeles`. Saved translations let the same message render in the active RU/EN interface without creating another row.

## C. Files

- `supabase/migrations/20260915001735_anham_birthday_greetings.sql`
- `lib/assistant/birthday-greetings.ts`
- `app/api/cron/assistant-outreach/route.ts`
- `lib/assistant/history.ts`
- `components/cabinet/ProfileDetailsForm.tsx`
- `app/(client)/cabinet/account/page.tsx`
- `lib/profile/actions.ts`
- focused SQL, route, history and schema tests
- this record, `CURRENT_STATE.md`, `DECISIONS.md`, `ROADMAP.md`

## D. Schema

`profiles.time_zone` is the notification-calendar setting. `assistant_messages.scheduled_event_key` and `scheduled_translations` are server-written metadata. The birth date remains solely in `health_questionnaire_versions`; no parallel birthday source is created. The migration performs no backfill send.

## E. Verification

Focused verification passes 76/76 tests, including unchanged-migration PGlite execution, local-date boundaries, latest questionnaire selection, retry uniqueness, opt-out, suspended-account exclusion, browser-role denial, cron authentication and RU/EN history projection. Final full regression passes 1,807/1,807 tests with one existing intentional skip across 197 files. An earlier full run had one unrelated five-second timeout in `case-detail-cleanup`; its isolated 10/10 rerun and the final full run passed. TypeScript, ESLint, security inventory, `git diff --check`, dependency audit (0 vulnerabilities) and production build pass. The build has one existing Autoprefixer `end` compatibility warning. PR #203 passed the GitHub security/regression workflow and all three Vercel previews. Production migration `20260918142503_anham_birthday_greetings` is recorded; schema and grants were verified. Security advisors reported only pre-existing INFO findings, and performance advisors reported pre-existing INFO/WARN findings unrelated to this migration. Main `5ba27eb38405d68a14e76a5d0dca00139941b90f` deployed successfully to the primary and clinical projects. Production HTTP acceptance returned `200` for `/`, `307` to login for `/cabinet`, and `401` for the cron without its secret.

## F. Benchmark

Not applicable to functionality: no extraction, evidence, provenance or trust behavior changes. The existing synthetic benchmark remains part of the full regression.

## G. Security and PHI

The service client and birthday RPC stay server-only. `PUBLIC`, `anon` and `authenticated` cannot execute the delivery function. Existing owner-scoped history RLS controls reads. Date of birth never appears in message content, event keys, logs or an external provider request. Fixed templates make no medical statement and use no AI tokens.

## H. Known limitations

Existing accounts use Los Angeles time until they next save profile details. Users without a questionnaire birth date receive nothing. February 29 is matched only in leap years. The daily cron may run later than its nominal UTC minute. There is no push/email/SMS notification, so the message appears when history next loads.

## I. Intentionally excluded

No clinical interpretation, age calculation, Case classification, diagnosis, recommendation, external notification, historical-message rewrite or ordinary outreach activation.

## J–L. Status

Implementation and production publication are CLOSED. GO for routine observation of the scheduled run and private assistant history. No production birthday RPC was invoked manually, so no client message was created for testing. Signed-in visual acceptance was intentionally not performed without an authorized active session; RU/EN projection remains covered by automated tests. The clinical Anham phase gates are unchanged.
