# Product analytics — staging acceptance, 2026-09-09

This owner-authorized checkpoint supersedes the staging-not-applied statements in `PRODUCT_ANALYTICS_ANHAM_2026-09-09.md`.

## A. Before

Analytics existed locally with 29 focused tests. The existing `ankh-staging` branch (`atdmzkciqxdgblusbhtr`, parent `zdrfttgwnyorifmpqgwe`) was healthy and contained other tasks' fixtures, but no client documents. Its metadata already reported `MIGRATIONS_FAILED`; that was not caused by this migration.

## B–D. Changes, files and schema

Applied only `supabase/migrations/20260909210803_product_analytics.sql` to **staging**. Production was not mutated. The connector assigned version `20260909215712`; the exact staging history row was aligned to canonical local version `20260909210803` to avoid future duplicate application.

Added `scripts/product-analytics-staging.mjs`, `output/product-analytics-staging.txt`, this report, and canonical state/roadmap/decision updates. The harness pins the staging URL, creates four uniquely named synthetic Auth users, scrubs provider environment, runs local Next and a deterministic local model responder, verifies APIs, and cleans up by exact IDs. It does not deploy or change Auth settings. Existing verified staging-only credentials from another checkout of the same allowed repository were reused in ignored temporary files; the source configuration was untouched.

## E. Tests and exact results

**Staging API: PASS, six logged check groups plus final PASS** in `output/product-analytics-staging.txt`. Real Supabase Auth, database, PostgREST gateway and application routes were used. The local model responder does not establish real model quality or external connectivity.

1. No consent: 202 without recording. Foreign origin: 403. Same-minute duplicates collapse. Forged registration completion and extra text fields: 400. Anonymous protected view: 403.
2. Real signed-in allowlisted active admin: summary 200 with no-store; anonymous, client, Karen and unlisted admin: 403. Four operational sources and funnel ready. No journey IDs in output. PostHog honestly reports not connected.
3. Signed-in views and the actual client chat route record events; `chat_completed` is observed after the local test response.
4. A separate service-written synthetic journey reaches all seven ordered SQL steps. **This fixture is not proof of public registration.** Anonymous table/RPC access is denied through the real gateway. Initial failure at the time-window boundary was workstation/database clock skew; the fixture now uses the observed database timestamp plus 1 ms, without altering application logic.
5. The real founder assistant route passes fresh aggregates into the captured local model system prompt; caller-forged analytics and journey IDs are absent.
6. Withdrawal deletes the journey and prevents further recording.

**Browser:** localhost:3187 backed by real staging. Home rendered with controls and no blocking overlay. A confirmed synthetic account was provisioned via Auth admin without email, then authenticated through real Auth. The actual contact/consent form was filled with fictional details and submitted in English. Redirect: `/cabinet/health?onboarding=submitted`. Database evidence: `onboarding_completed` and `cabinet_view` in EN, and onboarding views in RU/EN. RU → EN on onboarding and EN → RU → EN in cabinet preserve the path. The existing locale switch cleared the transient query parameter; query preservation is not claimed. The script's public signup/onboarding end-to-end field remains untested; this browser check was separate.

Browser console reported an existing `HomeJourney` hydration warning: CSS coordinate precision differed (`20.5551%` vs `20.555136271329097%`). The two blank browser-error entries corresponded to these console reports. No analytics component was named; submission succeeded. This is not reported as a clean console.

**Repeated local checks: 29/29 tests, six files, 2.59 s; TypeScript, repository ESLint and `git diff --check` passed.** Earlier full regression: 1007/1007 in 131 files. Application code did not change in this staging increment. Initial 127.0.0.1-origin requests were rejected because Next normalizes its internal loopback URL to localhost; the harness was corrected without weakening origin validation.

## F. Benchmark

No clinical extraction/trust changes or additional clinical benchmark claim. Prior synthetic tests do not establish broader real-Case validation.

## G. Security, PHI and cleanup

Live ACL: RLS on; anon/authenticated SELECT denied; anon record RPC denied; service summary RPC allowed. Analytics functions retain fixed search paths and SECURITY INVOKER.

Advisors include the expected informational [RLS-without-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) for the service-only table. Existing unrelated warnings concern three [mutable-search-path functions](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and two publicly executable security-definer functions ([anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). Those functions were not changed.

No real person, medical document, paid model call or email message was used. Consent checkboxes were synthetic fixtures, not human legal acceptance. Cleanup removed all four created Auth users and tracked analytics journeys, including retries. Post-cleanup SQL: **0 analytics fixture Auth users, 0 product events, 0 synthetic cases, 0 matching synthetic audit records**. Other work was active in staging; unrelated totals changed, so global snapshot restoration is not claimed. Local credential/browser fixture files were removed and local servers stopped.

## H–I. Limitations and exclusions

- Public signup and email confirmation are not tested end-to-end. Staging has email signup enabled, automatic confirmation disabled. Admin-provisioned users do not validate the registration-completed action or email delivery; local tests are separate evidence.
- No hosted Vercel preview: both CLIs are logged out. Connector access enabled staging migration but did not establish a CLI deployment context. No unclaimed project, production-backed preview or protection bypass was created.
- PostHog remains disabled/unconnected. No provider account, region/terms acceptance, heatmap ingestion or replay.
- Retention removes records older than 90 days on ingestion; scheduled cleanup while ingestion is stopped remains open.
- General application rate-limit counters are separate from product events and can remain under their existing retention; no broad deletion of shared counters was performed.
- No production mutation, clinical migration, PHI processing, auto-verification or clinical-phase advancement.

## J–L. Closure and next action

**Staging DB/API/authorized onboarding checkpoint: CLOSED. Full hosted signup-to-chat acceptance: NOT CLOSED. Production collection: NO-GO.**

GO for remaining isolated acceptance: establish a controlled staging confirmation-email path and authenticated preview explicitly pinned to this database, run public signup through chat, then configure/prove retention maintenance. An owner-approved PostHog project/region/terms and public token are needed before external heatmap verification. These gates are distinct from working first-party metrics.

## Registration continuation — prepared, not submitted

The owner authorized testing public signup with an owner-supplied email and password. `scripts/product-analytics-registration.mjs` runs the application on localhost:3187 against the same pinned staging database, with a deterministic loopback model responder and PostHog disabled. The privileged staging key is transferred through a one-use loopback form and retained only in the launcher/child environment; it is not written to a credential file. `.env.analytics-staging.local` is absent. No password is saved in repository files or application logs by this launcher.

Staging Auth's redirect allowlist now additionally contains exactly `http://localhost:3187/auth/callback?next=%2Fcabinet`. Existing redirects, Site URL and SMTP settings were preserved. Email confirmation remains required. This is a staging Auth configuration change, not a production change or schema change.

The Russian public signup form is open with the owner-supplied email/password prepared. The mandatory phone has no owner-provided value; permission to use a fictional test number was requested. The analytics consent control was not activated: automatic review rejected doing so without separate explicit consent. The owner was asked whether to allow first-party staging test events with PostHog disabled. No signup was submitted and no confirmation email was sent. A narrow read-only staging Auth query confirmed **0 matching users** for the supplied email.

Continuation checks: `node --check` passed; launcher ESLint had **0 errors, 1 unused-variable warning**; `git diff --check` passed (line-ending notices only). No application implementation changed in this continuation, and the earlier full regression was not rerun. A local EN homepage request with an existing EN locale cookie looped with 307 responses; RU signup works. Current continuation does not claim a clean RU/EN homepage acceptance. Earlier browser evidence above remains scoped to its separate checkpoint.

Security/limitations: no PHI upload, no real provider inference, no PostHog collection, no production mutation. The local server remains available for the registration callback. Public signup-to-chat acceptance is **NOT CLOSED**, production collection remains **NO-GO**.

The owner then supplied the required phone and explicitly confirmed final account creation. The public form was submitted with the owner-provided email, phone and password, while analytics and PostHog remained disabled. Supabase Auth returned HTTP 422: `Password is known to be weak and easy to guess, please choose a different one.` A narrow database check confirmed that no matching Auth user was created; therefore no profile, product event or confirmation email was produced.

The previously generic error mapping was corrected in `lib/auth/error-messages.ts`: known weak, easy-to-guess and compromised-password provider responses now produce actionable RU/EN copy. `tests/auth-error-messages.test.ts` includes the exact observed provider response. Verification: focused auth-message tests **19/19 passed**; focused ESLint and `git diff --check` passed (line-ending notices only). Next action: obtain a different owner-selected password, resubmit the still-prepared registration, and verify the confirmation email and callback.

### Public signup result

The owner supplied a different password and confirmed a retry. The password passed, but the next Auth log showed SMTP status 500 with `535 "Authentication credentials invalid"`; the account transaction was rolled back. The project contained no RESEND/SMTP credential in Vercel environment variables that could be safely reused. With explicit owner confirmation of Supabase's warning, custom SMTP was disabled **only on ankh-staging**. Supabase stated that staging custom email templates would reset and the built-in email limit would become two per hour. Production configuration was not changed.

The same owner-authorized public form was then submitted with analytics/PostHog still disabled. Browser result: `/check-email`, reporting that an email was sent. Database evidence: one unconfirmed Auth user; matching `profiles` row with role `client`, status `registered`; owner-provided phone present in Auth metadata and profile. No password is stored in repository artifacts or logs. Product events occurring from immediately before the successful registration onward: **0**, consistent with analytics consent remaining absent.

Public registration creation/email-dispatch checkpoint: **CLOSED**. Confirmation-link callback, onboarding and chat for this account: **NOT CLOSED** until the owner opens the received email link on the same computer while localhost:3187 remains available. Production collection remains **NO-GO**. Exact next action: owner opens the Python Method confirmation email (including Spam/Promotions if needed) and clicks the confirmation link; Codex then verifies confirmation, onboarding, cabinet and chat.

### Confirmation and owner consent continuation — 2026-09-10

The owner opened the confirmation email on a phone. Supabase confirmed the email, but the redirect to localhost could not open on that device. Authorized password sign-in on the computer then reached the cabinet and contact/consent questionnaire. The owner supplied contact/address details and explicitly accepted the offer, confirmed age 21+, and consented to personal/medical data processing for the case. The prepared questionnaire describes a website workflow test, not a medical history. No personal address, password, or medical information is retained in this report.

Before final submission, the prior in-app browser and local application processes became unavailable. A fresh narrow staging query confirmed: email confirmed, profile still registered, no case, and zero onboarding submissions for this account. Thus submission has not happened. The one-use loopback launcher was restarted, but its process-only staging key must be restored. Supabase dashboard session expired. Automatic approval review rejected the proposed GitHub OAuth sign-in because that specific sign-in method/account was not explicitly authorized. No OAuth retry, new API key, database mutation, production change, or consented analytics event was performed. Existing owner approvals for the questionnaire remain valid; only the dashboard sign-in is pending.

Exact next action: obtain approval to restore the existing Supabase dashboard session through GitHub, verify the selected identity and staging project, restore the existing staging key to the local launcher's memory, then submit the approved questionnaire through the real UI and check cabinet/chat. This account's signup-to-chat acceptance remains **NOT CLOSED**; production collection remains **NO-GO**.

### Recovery attempt — 2026-09-11

The owner approved the Supabase GitHub sign-in. The dashboard session recovered and visibly opened `python-method-center-platform (ankh-staging)`. The existing secret key was copied without creating a new key. The local launcher first failed because its sandboxed process could not reach Supabase (`EACCES` on port 443); an escalated retry was rejected by the automatic approval review because the Codex account had reached 100% usage. The staging setup page consequently returned `ERR_CONNECTION_RESET`. No questionnaire submission, new key, OAuth key, production mutation, or analytics consent occurred. The account remains email-confirmed with a registered profile, no case, and zero onboarding submissions.

The Codex account currently reports one available free rate-limit reset. Consuming it is an account-level action and requires explicit owner authorization. Until the reset is authorized or the usage window resets, the approved browser questionnaire remains prepared but cannot be submitted through the local app.
