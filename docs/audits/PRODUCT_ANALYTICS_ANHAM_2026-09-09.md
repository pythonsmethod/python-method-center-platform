# Product analytics for the founder's Anham — 2026-09-09

Historical local-implementation checkpoint. For the subsequent owner-authorized staging migration, real API/browser evidence and remaining gates, see [staging acceptance](PRODUCT_ANALYTICS_STAGING_2026-09-09.md).

## Outcome / Результат

Repository implementation is ready for isolated integration acceptance. Production was not deployed, no migration was applied remotely, no analytics account was created, and no provider settings or commercial terms were changed.

Реализованы защищённая серверная сводка, передача агрегатов рабочему Анхаму Анны, измерение пути после согласия посетителя и отключённая по умолчанию интеграция PostHog для тепловых карт публичного лендинга. Продакшен, внешние настройки и аккаунты не изменялись. Реальные тепловые карты или записи сессий не заявляются.

## A. What existed before

- Verified Git origin: `pythonsmethod/python-method-center-platform`. The archived legacy repository was not accessed.
- No product analytics SDK, collector, funnel event store, GA, Vercel Analytics, PostHog, Clarity, Hotjar or Plausible integration was found in the source/package manifest before this change. The existing RU/EN privacy policy explicitly said third-party analytics was not connected.
- A read-only fetch of the public production home HTML found no matching PostHog/Clarity/Hotjar/GA/Plausible/Vercel Analytics markers. This HTML inspection does not prove absence of every asynchronously loaded or externally configured integration. Provider account settings and Vercel environment values were not independently confirmed.
- The existing founder overview counts operational records and displays a timeline. It is not a visitor-cohort funnel; it was not reused as evidence of conversion. `assistant_usage` is an abuse/rate-limit counter, not landing traffic or successful conversations.
- Connected Supabase project `python-method-center-platform` (`zdrfttgwnyorifmpqgwe`) was inspected with SELECT only: table/column metadata and aggregate counts. No names, emails, document contents, questionnaires or message text were read.
- At **2026-09-09 21:01:40 UTC**, a rolling 30-day aggregate query returned:

| Existing source | Count | Meaning |
| --- | ---: | --- |
| `profiles`, role client | 54 total; 41 created in 30 days | Profile rows, not confirmed signups or visitors |
| `onboarding_submissions.submitted_at` | 23 total; 14 in 30 days | Submission rows, potentially repeated |
| `case_messages`, sender_role client | 10 in 30 days | Messages, not unique clients |
| `assistant_messages`, role user | 27 in 30 days | Stored user-message rows, not guest sessions |
| `assistant_usage`, `v:` buckets today | 1 | Abuse-control bucket, not a measured landing visitor |

These counts have different denominators. **14/41 is not a measured conversion rate.** No historical landing views or cabinet views were available to reconstruct the requested funnel.

The referenced `docs/architecture/CLIENT_PROCESSING_WITHOUT_CLASSIFICATION.md` and Master Concept DOCX are absent from this checkout. Repository-wide retirement instructions were followed directly, with `docs/ankh/` used as the canonical implementation record. No client classification was introduced.

## B. What changed

### Protected aggregate access

`GET /api/analytics/summary` returns current and preceding equal-length windows plus the last 7 days. Optional `start` and `end` are ISO dates/timestamps: 1–31 days per selected window, no future end, bounded historical access. Intervals are **UTC [start, end)**. The default is 30 days compared with the prior 30 days.

Authorization is inside `getProductAnalytics`, before service-role access: the existing `getFounderState` requires an authorized, non-suspended/non-closed admin on the founder allowlist. No new role or service credential exposed to an assistant was created. Both the HTTP route and founder assistant use this same boundary. Anonymous users, clients, support and other admins receive no aggregates. Karen's prompt does not load them.

Operational queries use exact `head: true` counts, selecting no raw payload. Missing configuration, failed counts or missing RPC/schema produce `unavailable`/`null`, never invented zero. The SQL RPC returns aggregate counts, daily event series, ordered cohort steps, denominators and conversion fractions. No sample/session/account identifiers leave the RPC. HTTP responses are private/no-store.

The founder's staff route appends a fresh server-generated `PRODUCT_ANALYTICS` block to each request, including 7-day and 30-day windows. Caller-supplied `analytics` properties are ignored. Daily rows remain on the HTTP endpoint and are omitted from model context to bound token use. The prompt separates facts, observations, causal hypotheses and proposed checks, and prohibits claims about unqueried periods or unseen recordings.

### Instrumentation and definitions

| Event | Trigger | Trust boundary |
| --- | --- | --- |
| `landing_view` | Consenting browser renders `/`, `/en` | Browser observation |
| `registration_started` | Sign-up tab displayed | Browser observation |
| `registration_completed` | Successful new Supabase account result, excluding decoy existing-account result | Server completion; email may still be unconfirmed |
| `onboarding_view` | Authenticated client opens contact/consent onboarding | Browser observation plus server authentication |
| `onboarding_completed` | Contact/consent onboarding action reaches successful redirect | Server completion; separate health questionnaire is not implied |
| `cabinet_view` | Authenticated client renders a cabinet route, including health questionnaire | Browser observation plus server authentication |
| `chat_completed` | Successful, non-transient Anham response to a signed-in client | Server completion; not Karen chat |

The SQL cohort starts with a landing event within the selected interval and requires each following step on the **same random browser journey**, in order, before the interval ends. Repeated later events may satisfy a step that occurred out of order earlier. Events are deduplicated per journey/event/minute. The denominator is consenting browser journeys, not unique people or all site visitors. Recent journeys are right-censored; absent next steps do not establish a cause of loss.

Consent creates an HttpOnly, SameSite=Lax, signed 30-day random browser journey. No account identity stitching is performed. Before consent/when disabled, the browser emits no collector requests. Withdrawal immediately writes a denial-only cookie, stops capture and attempts to delete that journey's rows; even if the consent endpoint fails, the denial overrides the older signed grant for future server events and page loads. Consent changes propagate across open tabs; the external outbound filter also checks the shared denial cookie. RU/EN controls and privacy disclosures are updated together.

### Optional heatmaps

Pinned PostHog JS **1.428.11** is dynamically imported only when all conditions hold: first-party analytics enabled, visitor consent, explicit public heatmap flag, project token, approved US/EU ingest host, and public home route.

- Autocapture, page-leave capture, session replay, error/performance capture, person profiles, surveys, conversations, product tours and remote configuration/dependency loading are disabled.
- The last outbound filter accepts only `$pageview` and `$$heatmap`, rebuilds allowed properties, removes query/hash/referrer/person fields, and accepts only bounded numeric pointer coordinates from same-origin public-home URLs.
- Private routes and every replay/identify/arbitrary event fail closed. Cleanup stops heatmap listeners, discards buffered points and opts out. A pending import is cancelled if the user leaves first.
- No first-party journey ID is passed to PostHog; provider identity is memory-only. The SDK may store its consent preference. A direct browser connection necessarily exposes the transport IP to the provider; event IP/geolocation are disabled and this distinction is disclosed.
- Dashboard link adapters allow configured HTTPS PostHog/Clarity URLs without credentials, query or fragment. They are explicitly **`configured_link_only`**, not evidence that an integration is connected or has recordings. The LLM does not browse these links or pretend to have seen their content.
- This integration **never records sessions**. An existing approved recordings dashboard may be linked, but recording private pages is not enabled by this work.

## C. Files created/changed

- `lib/product-analytics/{contract,session,record,request,browser,heatmaps,summary}.ts`
- `app/api/analytics/{consent,events,summary}/route.ts`
- `components/analytics/ProductAnalytics.tsx`, `app/layout.tsx`, `app/globals.css`
- `app/(auth)/login/AuthForm.tsx`, `lib/auth/actions.ts`, `lib/onboarding/actions.ts`
- `app/api/assistant/{client,staff}/route.ts`, `lib/assistant/prompts.ts`, `app/(admin)/admin/assistant/page.tsx`
- `lib/legal/policy-content.ts`, `.env.example`, `package.json`, `package-lock.json`
- `supabase/migrations/20260909210803_product_analytics.sql`
- Six `tests/product-analytics*.test.ts` suites; this audit, `CURRENT_STATE.md`, `DECISIONS.md`, `ROADMAP.md`.

## D. Data/schema changes

One new independent product telemetry table: `product_events` (generated ID, random journey UUID, fixed event, RU/EN locale, server timestamp, dedupe minute). Indexed by time and journey/event/time. No PHI fields, arbitrary JSON, URLs, names, emails, account IDs, Case IDs, IPs, user agents or text payloads.

RLS enabled; PUBLIC/anon/authenticated grants revoked. Only `service_role` receives table and RPC access. Both RPCs are SECURITY INVOKER with fixed search path and statement timeout. Existing clinical, Case, trust and decision schemas are unchanged.

Indexed ingestion cleanup deletes events older than 90 days. **If collection stops, cleanup will not run**; a scheduled retention job or equivalent maintenance is required before rollout. The new migration was generated using Supabase CLI, and executed only in isolated in-memory PostgreSQL tests. It was not applied to the connected project.

## E. Tests and exact results

Final checks: **1007/1007 tests passed in 131 files** (`npm test -- --maxWorkers=2`); **29/29 focused analytics tests passed in six files**; TypeScript passed; repository-wide ESLint passed; `git diff --check` passed (line-ending warnings only). No known unrelated test failure reproduced. Full-suite output is retained in `output/product-analytics-regression.txt`.

- PostgreSQL integration runs the actual migration in PGlite **0.5.8**, creates Supabase-like roles, checks real permission denial, retries/deduplication, event constraints, empty denominators, ordered cohorts, later retries and bounded periods.
- Service/API tests cover founder/admin allowlist restrictions, no privileged reads before authorization, cache headers, count failures vs zero, safe dashboard links, foreign origin, oversized/untrusted payloads and rejection of forged completion events.
- Staff integration tests prove that the actual route passes fresh aggregates to the model, ignores forged request analytics and does not read analytics for Karen/other staff.
- SDK tests cover disabled/private-route gating, delayed-load cancellation, immutable privacy configuration and cleanup. Sanitizer tests include PHI-like strings, nested heatmap URL queries, private paths, replay events and person properties.
- Local browser acceptance: home loads with meaningful content; consent and withdrawal work; RU → EN → RU preserves home and consent; EN → RU → EN also preserves `/legal/privacy`; mobile controls render at 390×844. Browser error collection returned no JavaScript exceptions. No provider key or database service key was used in browser QA. Full authenticated signup-to-chat and live PostHog ingestion still require an isolated configured environment.

## F. Benchmarks

Clinical extraction/trust code was not changed; no new clinical benchmark claim is made. The full regression suite ran the existing synthetic benchmark tests (100% synthetic critical numeric exact match, zero critical false VERIFIED). Automatically regenerated unrelated benchmark files were restored; this does not increase real-Case coverage or close Phase 2.9.

## G. Security/PHI implications

The assistant receives product aggregates only. New telemetry has no medical content or personal identity linkage. Public collector requests have strict size/vocabulary/origin checks and bounded per-instance burst protection; authenticated views require an active client profile. The signed journey prevents arbitrary session substitution, but public/browser events remain observational and potentially spoofable. This is not a distributed anti-bot system.

No credentials were committed. No external PHI processing was authorized or enabled. Production clinical boundaries and retired classification rules are unchanged.

## H. Known limitations

- No historical traffic reconstruction, cross-device attribution, consent-free coverage or verified unique-person counts.
- Browser observations can be blocked, delayed, repeated or spoofed. Consent granted after landing cannot reconstruct that earlier visit. Shared browsers are not reliably separable into people.
- Counts alone cannot identify why visitors leave. A missing next event can indicate delayed completion, a different browser, a blocker or actual abandonment.
- Account creation and email confirmation are distinct; the event says account creation. Contact onboarding and the separate health questionnaire are also distinct.
- Capture reliability and real PostHog heatmap ingestion have not been validated against an approved project. Dashboard links are unverified configuration, not fetched data.
- In-memory PostgreSQL validates the migration and privileges, not Supabase gateway behavior, staging deployment or production load. Small samples require cautious interpretation.
- Cleanup while ingestion is disabled and distributed abuse controls remain rollout gates.
- Local browser QA used the existing fallback font because the sandbox blocked the Google Fonts download (`EACCES`). This existing external-font dependency did not block pages, consent controls or language navigation; no font/configuration change was made.

## I. Intentionally not implemented

No production deployment/migration, external account creation, paid acceptance, remote project configuration, automatic session replay, private-page recording, PHI export, medical interpretation, new Case/role model, attribution fingerprinting, arbitrary model SQL or autonomous provider-admin tools.

## J–L. Closure and exact next action

- **Repository implementation: CLOSED after final local checks. External connection / production acceptance: NOT CLOSED.**
- **GO:** review and isolated staging acceptance. **NO-GO:** production collection until the gates below are explicitly resolved. Ankh Phase 2.9/production clinical gates are unchanged.
- Next action: authorize/use an isolated test deployment and database; apply this single migration there, configure a new separate analytics signing secret and test the complete synthetic consenting journey with founder authorization. Then, if the owner chooses PostHog, confirm an existing or owner-created project, region and terms, supply its public project token and actual dashboard URL, enable heatmaps only in staging, and verify only allowlisted landing payloads arrive. Configure retention maintenance and validate withdrawal before a separately authorized production rollout. No owner-only click-through is needed until project ownership, terms, credentials or deployment authorization is genuinely required.

## Technical references checked

- [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostHog JavaScript configuration](https://posthog.com/docs/libraries/js/config)
- [PostHog replay privacy controls](https://posthog.com/docs/session-replay/privacy)
- The pinned SDK's shipped `heatmaps`, `capture` and `remote-config` source/types were inspected to verify event shape and disable behavior. Supabase changelog Markdown could not be parsed by the web tool; this task used existing client APIs and standard PostgreSQL primitives, validated against the local SQL engine.
