# CURRENT_STATE.md — NEXORA CORE / PMC IMPLEMENTATION

## Payment-to-access chain follow-up — 2026-09-24 — PREVIEW VERIFIED, RELEASE HOLD

The authenticated six-period EN Sandbox charge exposed a general issue:
fulfillment skipped `service_periods` when a newly registered purchaser had
not completed onboarding and thus had no Case. The branch now creates or
reuses the existing empty Case shell only after verified paid Checkout,
links payment/subscription/gift and opens the paid period. Intake subsequently
updates the same Case. The paid return page checks the owned Stripe Session
and distinguishes actual database entitlement from a pending webhook, with
RU/EN dates and questionnaire/address next steps. The cabinet shows the
recorded access end and no longer treats a blank Case as completed intake.
Late address entry now preserves the paid gift quantity; the delivery page
shows the pending-address obligation even before a task can be created.

One synthetic staging payment was repaired without another charge. Stripe
Sandbox confirmed the $7,800 invoice and its exact 2026-09-24 19:29:45 UTC
to 2027-03-23 19:29:45 UTC period. Post-repair staging readback shows one
Case, one linked payment, one exact paid period, one linked subscription and
one linked six-period gift task. No production database or Live Stripe charge
was changed. Focused webhook, Case, return and delayed-delivery tests pass;
the full local suite passed 2,080 tests (one existing skip), TypeScript,
ESLint and security check pass. A local build passed after disabling only the
disk build cache for that run and allowing the official font fetch; this
temporary config was reverted. Preview `dpl_4ukBRUCrChuCnjm4mc9ME1hVNCf8`
is READY. On the authenticated EN return, the repaired six-period charge shows
the exact paid dates; the English questionnaire, linked Case, cabinet access
end, subscription management and preparing gift shipment are visible. A direct
EN return originally left the single-address questionnaire in Russian; the
branch now persists the EN preference on the public return response, and a
new READY Preview verifies the questionnaire in English. The questionnaire
text now accounts for a Case created by payment before intake.

The Preview also exposed a staging/production lifecycle-schema difference:
staging has removed retired `from_status` and `to_status` fields while
production retains nullable archived fields. Common Case history reads and
new event writes now omit those fields, without deleting or migrating archived
rows. Preview `dpl_96BXibANiutHozREbMCpdLBrkL9X` is READY: the same
account page now shows “No events yet” instead of a database error, with
the payment, paid-through date and Portal button intact. RU → EN switching
on that private route preserves the route and localizes both states. The
final full local run passed 2,083 tests with one existing skip; TypeScript,
ESLint, security check and diff check pass. A fresh no-Case paid webhook on
this revision and publication gates remain pending. Production is NO-GO.

## Personal Support billing launch — 2026-09-24 — RELEASE HOLD

PR #215 and PR #216 are open, mergeable and have passing CI/READY Preview
deployments; neither is published. PR #216 replaces misleading Stripe trial
semantics with a paid `N×30`-day initial subscription period followed by a
scheduled 1,300 USD / 30-day renewal phase. Latest local regression passes
2,057 tests with one existing skip; typecheck, lint, security checks and build
pass. Commit `f39e4e0` has passing GitHub CI and READY Vercel Preview.

Sandbox assessment payment of 299 USD was delivered through a protected Preview
webhook after the owner approved a separate revocable Vercel bypass secret for
Stripe Sandbox. Stripe returned HTTP 200 twice for the same event; staging has
exactly one paid assessment row. The existing project-wide bypass secret was
not used. RU/EN pricing and all 1–12 displayed totals passed desktop/mobile
checks. A new RU 1-period auto-renew Checkout displayed 1,300 USD / 30 days as
paid, not a free trial. The owner completed its Sandbox card payment; its first
automatic renewal was charged on a Stripe Test Clock for another 1,300 USD.
Both invoices are paid. Staging has exactly one payment, access period and
gift-delivery task for each charge; repeated invoice webhook delivery produced
no duplicates. A fresh EN 12-period renewal-selected Checkout on the corrected
READY Preview then charged 15,600 USD in Sandbox. Its paid invoice and staging
access both run from 2026-09-24 02:15:10 UTC to 2027-09-19 02:15:10 UTC,
exactly 360 days despite later webhook arrival. Stripe scheduled 1,300 USD
renewals every 30 days thereafter, without a trial. The new webhook delivery
returned HTTP 200 and staging created one paid period and one gift-delivery
task. A separate RU 6-period prepaid-only Checkout charged 7,800 USD in
Sandbox after the owner submitted the test card. Stripe confirms `complete` /
`paid`, with no subscription or automatic tax. Staging has exactly one paid
payment, one active 180-day period and one assigned gift-delivery task with
quantity 6; no real client data or shipment is involved.

Staging had an older delivery schema than production. The missing historical
delivery workflow migration and two additive parity migrations were applied
to staging, preserving existing rows. A synthetic case/address and volunteer
assignment verified paid entitlement and both gift-delivery tasks; no real
client data or shipment is involved. Sandbox exposed a 22-minute difference
between Stripe's frozen Test Clock and webhook wall time. The code now anchors
subscription access to the exact paid invoice period and blocks overlapping
auto-renew purchases; the 12-period payment above verifies this on the deployed
revision. The owner declined a proposed failed-renewal simulation, so no test
card was changed or clock advanced for that scenario. Failed renewal, the
authenticated paid return flow and truthful payment-page disclosure remain
unverified; final Sandbox Portal cancellation passed as recorded below. The
6-period payment used the earlier v9 offer before the tax-copy correction.
The 12-period synthetic fixture was created directly in staging
and its Checkout through Stripe API, so it does not prove app authentication or
consent persistence. After the owner updated the official Live Stripe
connection, all four deterministic RU/EN Live products, 30 Prices and two
localized Portal configurations were created and read back. The Live webhook
still lacks four recurring-billing events, and the new Checkout remains
disabled in Production. Authenticated consent passed; paid return, declined
renewal (owner deferred), payment-page disclosure, webhook expansion,
merges and publication remain open. Commercial launch is NO-GO.

Later authenticated Preview check: a separate confirmed synthetic staging
client signed in through the deployed RU login page. Its minimal client profile
was added in staging because Dashboard-created Auth users bypass the app's
registration-profile hook. RU 1-period prepaid-only and EN 6-period
renewal-selected Checkout Sessions opened in Stripe Sandbox without payment.
Each produced two `oferta-v10` consent rows with the exact locale, term and
renewal choice; Stripe confirmed totals of 1,300 USD and 7,800 USD, respectively.
The EN return URL is the branch Preview alias, verified by Vercel to resolve to
the latest READY commit. These unpaid sessions do not prove authenticated
post-payment return or delivery.

The EN six-period Checkout exposed a remaining disclosure defect: Stripe's
prominent summary says `7,800 USD every 180 days`, while the lower custom text
correctly says the next charge is 1,300 USD every 30 days. A Sandbox pilot using
a one-time 7,800 USD line plus a zero-price 180-day recurring line still showed
`7,800 USD every 180 days`; it was not paid or deployed. This replaces the
earlier free-trial wording but does not yet satisfy the requirement that the
hosted payment page unambiguously state the one-time initial term and different
future renewal cadence. Commercial launch remains NO-GO pending an acceptable
payment-page design and the other release gates above.

An unmerged branch change now selects Stripe Checkout Elements for
renewal-selected 2–12-period terms. Its PMC-owned RU/EN summary separates the
initial paid term from subsequent 30-day charges; the server still creates a
Checkout Session and keeps the webhook/Portal schedule model. The paid return
page now checks the Stripe Session and authenticated owner before saying
payment succeeded. The matching Sandbox publishable key is configured only in
the isolated Preview. Browser rendering exposed a disabled Pay button in an
unpaid 7,800 USD EN Elements Session: Stripe required a full billing address,
but the form mounted only the Payment Element. The branch now mounts Stripe's
BillingAddressElement with RU/EN headings. Focused tests, 2,069 full-suite
tests (one skip), typecheck, lint, security check and build pass locally.
Commit `8c75ba6` passed GitHub CI and deployed as READY Preview
`dpl_BAWrG3RtFWCJwFFaiHwwn9BM6Wi6`. The owner completed its EN
six-period Elements payment on the authenticated Preview. Stripe Sandbox
confirms Checkout `complete` / `paid`, a 7,800 USD paid invoice, an active
subscription and a schedule changing from the paid 180-day term ending
2027-03-23 19:29:45 UTC to 1,300 USD every 30 days. The authenticated EN
return page displayed `Payment received`. Staging has exactly one 7,800 USD
paid payment, one active billing-subscription row, and one preparing gift
delivery task with quantity six. It has **no service-period row for this
payment**: this synthetic profile had no Case before Checkout, and the
webhook only opens a service period when a Case exists. The paid return and
payment/delivery linkage are verified; immediate paid entitlement for a
pre-onboarding buyer is not. Commercial release stays NO-GO until that gap is
resolved and retested. No Live charge or Production change was made.

With the owner's action-time approval, the synthetic 12-period Sandbox
subscription was canceled through the Russian Customer Portal. Portal now
shows cancellation scheduled for 19 September 2027 and still offers a card
update form (opened but no payment method was changed). Stripe readback shows
the subscription remains `active`, `cancel_at` equals the paid 360-day period
end, and the transition schedule has been detached. Staging retains an active
personal-support service period through the same timestamp. This validates
turning off renewal without shortening paid access; it does not test a failed
renewal or actual card replacement.

## NEXORA core / ANHAM application — 2026-09-23 — ARCHITECTURE RECORDED

Owner decision NEXORA-2026-09-23-01 makes NEXORA the shared ecosystem core.
Document analysis is a NEXORA capability. ANHAM is the AI system within PMC
and consumes the core through application authorization and domain adapters.
External technology commercialization belongs to NEXORA / NEXORA API.
ANKH is retired as a standalone system/product name.

Canonical direction: [NEXORA MASTER ARCHITECTURE](docs/architecture/NEXORA_MASTER_ARCHITECTURE.md).
ANHAM is scoped by [its PMC application profile](docs/architecture/ANHAM_PMC_APPLICATION_ARCHITECTURE.md).

This increment changes architecture and working documentation. It does not
establish a separate deployed core, connect a new runtime, enable public API sales,
migrate schemas, or change providers or clinical trust. Existing implementation
remains in PMC. Phase 2.9 remains IN PROGRESS; production auto-verification and
Phase 3 production remain NO-GO. Historical ANKH names below identify their
original evidence and compatible technical paths, not another active system.

Next: NX-01 ownership/dependency inventory, then NX-02 capability contract and PMC
adapter, alongside existing PMC acceptance and the unchanged quality gates.


## Mobile site aligned with the desktop site — 2026-09-22 — PUBLISHED

Phones and touch-first devices now get the same site as a wide screen instead
of a reduced variant. The public header keeps its full row of sections, the
guest sign-in and sign-up doors and the language switch at every width (the
separate bottom dock and the header account chip are removed). The homepage
journey is the same six numbered cards with their explanations on every
screen; the phone-only ring of step titles without text is removed, and the
retained app promotion block stays on narrow screens. The team workspace on a
phone keeps the site header with the language switch, the footer, the top
navigation row including the founder overview link, and one bilingual home
page with the session panel, today's queue, the assistant and the knowledge
base. Client cards in the staff list now carry the contacts and creation date
the table shows. The client cabinet keeps sign-out in the narrow sidebar and
the token balance in the phone top bar. No schema, data, payment or PHI
change. Validation: typecheck, ESLint and the full test suite pass; production
build passes; phone and tablet screenshots of the public pages reviewed
locally in RU and EN with no horizontal overflow.
PR #219 merged as `08195bb3feaf09e037d9586e7c996d2e5ce5c0b1`; the Vercel
production deployment of `python-method-center-platform` reached READY and is
aliased to pythonmethodcenter.com. The production homepage serves the full
header with sign-in, sign-up and the language switch, the six journey cards
with text and no bottom dock; `/cabinet` sends a guest to `/login`; Vercel
reported no runtime errors in the first hour. The `main` branch protection now
requires the `Vercel` status, the name Vercel reports since only one project is
linked to the repository.

## Anham message reactions v1 — 2026-09-19 — PUBLISHED

Anham may now attach one small, allowlisted emoji reaction to the person's own
message in the client chat, then answer in words as before. The model proposes
a key through one structured `[[reaction:key]]` marker; the server strips the
marker, applies the eight-key allowlist, restricts guests to a calm subset and
lets a RU/EN safety classifier veto any reaction on pain, worsening, breathing,
bleeding, consciousness, seizures, emergency, medication/dosage, self-harm,
crisis, fear for life, death, diagnosis or serious medical news. A reply that
had to refuse or escalate also gets none. Registered and paid clients keep the
reaction on their own `assistant_messages` row, so it survives reload; guests
are never stored. Staff, Karen and Professor Python conversations are unchanged.

Production migration `20260919 anham_message_reactions` was applied to the
production Supabase project before the code deploy and verified: nullable
`reaction` column, `assistant_messages_reaction_allowlist` constraint present,
zero pre-existing reacted rows. PR #209 passed CI and all three Vercel
previews and merged as `aba191b1d48320218357e1a77dc3b590401241f3`; the primary
and clinical production deployments are READY on `pythonmethodcenter.com`. The
public site returned `200`, the protected cabinet redirected to login and the
history API returned `401` without a session; no runtime errors or 5xx were
recorded after the deploy. A real chat exchange could not be sent from the
release environment because of its network policy, so the first live reaction
will be observed in ordinary use. Evidence: `docs/ankh/anham_message_reactions.md`.

## Anham birthday greetings — 2026-09-18 — PUBLISHED

The production database has the additive birthday-delivery schema and service-role-only `SECURITY INVOKER` function. PR #203 merged as `5ba27eb38405d68a14e76a5d0dca00139941b90f`; the primary and clinical Vercel production deployments completed successfully. The public site returned `200`, the protected cabinet returned the expected `307` login redirect and the cron route returned the expected `401` without `CRON_SECRET`. The release reuses the latest immutable health-questionnaire birth date, stores one deterministic RU/EN assistant-history message per eligible client/local year and honors the existing outreach opt-out. No birthday RPC was manually invoked against production clients. Evidence: `docs/ankh/anham_birthday_greetings.md`.

## Staff message email notifications — 2026-09-17 — RELEASE CANDIDATE

New client-authored Support messages notify Anna at the canonical founder
address; new client-authored Professor Python messages notify only configured
Karen-role addresses, including messages created through the confirmed voice
action. Staff email is neutral and contains no client name, message text, Case
details or medical information. Delivery uses the existing external-notification
ledger and immutable source-message dedupe keys. Production mail-provider setup
remains the shared release dependency for client and staff email delivery.

## Chess master level — 2026-09-17 — PRODUCTION DEPLOYED

The shared Karen/staff and client chess interface now includes bilingual `Мастер / Master` between Expert and Grandmaster. Master uses the existing Stockfish worker at bounded skill level 8 with a 2.5-second search, while Grandmaster remains at maximum skill 20 with a 6-second search; Expert remains on the built-in three-ply search. The API, coaching context and account preference schema accept the new value. Existing games and preferences remain valid. PR #202 was merged as `8cef1408f1108b47b7fa4affb63f5ea74e3ae27a`; the production database constraint was migrated and verified before the successful Vercel deployment. Production HTTP checks returned `200` for the public site, the expected `307` login redirect for `/cabinet/chess`, and the expected `401` for the unauthenticated chess state API. No PHI, clinical workflow or production trust gate changed.

## Client message email notifications — 2026-09-17 — RELEASE CANDIDATE

When authorized staff sends a Support message, or Professor Python sends a
Case message, the registered account owner now receives a neutral RU/EN email
with a link to the matching protected conversation. The recipient address and
locale are resolved server-side from the owner profile. Email contains no
message body, patient name, Case details or medical data. Each delivery is
recorded in the existing external-notification ledger and deduplicated by the
immutable message ID; email failure never rolls back the saved site message.
No schema change, client role change or clinical-processing change was made.
Full release verification and production publication remain pending.

## Support conversation history timestamps — 2026-09-17 — RELEASE CANDIDATE

The existing append-only Support message history now renders like a familiar
messenger: local `Today` / `Yesterday` / full-date separators and the local time
on every message bubble, with the immutable database timestamp retained in a
semantic `time` element and exposed as a full localized date-time. The same
component serves Anna and the client, so both sides see the same chronology.
No message-store, authorization or clinical boundary changed. Release verification
and publication remain pending.

## Client communication channels and unread badges — 2026-09-17 — PUBLISHED

The client cabinet now exposes three distinct communication destinations: Anham,
Professor Python and Support. Anham history moved out of the Support page into its
own cabinet route. Professor and Support retain independent unread counts in the
sidebar and now show those same counts on the cabinet home cards. Opening Support
marks only staff support messages read; opening the Professor conversation keeps
the existing Case-message read boundary. RU/EN copy is complete. PR #198 passed
the full CI and all Vercel previews, merged as `2b09afbe`, and the primary
production deployment completed successfully. Authenticated production acceptance
confirmed all three destinations in the cabinet navigation and all three home cards.
No test message was sent and no client row was changed during acceptance.

## Case support conversation — 2026-09-17 — RELEASE CANDIDATE

Every authorized staff member, including Anna, now has a distinct Support ↔ Client thread inside each Case. The first staff message creates one Case-bound support request; subsequent messages reuse it, appear in the client's existing Conversations page, and remain separate from Anham history and the Professor Python case channel. The server resolves the Case owner rather than trusting form identity, enforces staff authentication, records an audit event, and limits the channel to technical/organizational scope in RU/EN copy. One partial unique index prevents duplicate Case support threads. Focused tests pass 11/11. Production migration, full CI, merge and deployment verification remain pending.

## Chess expert level — 2026-09-16 — PRODUCTION DEPLOYED

The shared Karen/staff and client chess interface now includes bilingual `Эксперт / Expert` between Advanced and Grandmaster. Expert uses the built-in three-ply search; Advanced remains at two-ply, while Grandmaster remains powered by maximum-strength Stockfish with the three-ply search only as its failure fallback. The API, coaching context and account preference schema accept the new value. PR #194 passed the complete application security/regression workflow and all three Vercel preview checks, was merged as `ebe154c8`, and the primary production deployment completed successfully. The additive production constraint migration was applied through the authenticated Supabase SQL Editor and verified from `pg_constraint` with `expert` present. No PHI, clinical workflow or production trust gate changed.

## Represented-patient identity — 2026-09-14 — RELEASE CANDIDATE

A bilingual self/other-adult/minor onboarding choice now stores the Case patient separately from the authenticated account owner, including both relationship directions, representation reason, authority, patient-data consent and responsibility acknowledgments. Karen-assistant context resolves medical content to the patient while account access remains with the owner. Production schema and Case #483 were corrected with append-only audit; the legacy owner must still reconfirm the new explicit checkboxes. Focused tests 3/3 pass; full release verification remains CI-gated because the isolated local dependency install did not complete.
## Consent-gated product analytics — 2026-09-13 — PUBLISHED

Aggregate founder analytics, a seven-step consenting-browser funnel and optional
public-home heatmaps are implemented with RU/EN consent controls. The first-party
collector stores only an opaque journey UUID, enumerated event, locale and time;
it excludes profiles, Cases, medical data, documents and free text. PostHog and
all collection remain disabled by default. Migration
`20260909210803_product_analytics.sql` remains isolated to `ankh-staging`;
production is unchanged.

The owner's staging account is email-confirmed and now has an active client
profile, submitted onboarding, structured US delivery address, recorded offer and
data-processing consents, and one explicitly non-clinical test Case. Analytics
consent was not granted, and the account has zero product events. A separate
synthetic journey wrote all seven ordered events through the real staging RPC,
returned a complete funnel, and was deleted by exact journey ID; zero fixture
events remain. Ninety-day cleanup is scheduled through the already deployed daily
`assistant-outreach` cron, avoiding a fourth Hobby-plan cron while retaining the
same authorization boundary.

PR #190 merged as main `1ac83f1`; Vercel production deployment
`dpl_5sbQNHQ3dHZutp6WN8yBWysERvMZ` is READY on `pythonmethodcenter.com` and
`www.pythonmethodcenter.com`. Browser acceptance passed for Russian, English,
both language directions on registration, and absence of loaded PostHog resources.
Vercel reported no runtime errors in the release window. Exact-head and main CI
verification: 196 test files passed and 1 skipped; 1,802 tests passed and 1
skipped; TypeScript, ESLint, security inventory, npm audit, `git diff --check`
and production build pass. Production analytics collection, the production
migration and PostHog remain NO-GO without a separate owner-approved enablement.
Evidence: `docs/audits/PRODUCT_ANALYTICS_ANHAM_2026-09-09.md` and
`docs/audits/PRODUCT_ANALYTICS_STAGING_2026-09-09.md`.

## Founder knowledge-gap centre and Case detail cleanup — 2026-09-11 — PUBLISHED

Owner authorised publication. PR #179 merged as main `8f23316` (feature commit
`66dda1c`); Vercel production deployment `dpl_AK3TkxyR3fi7yz1tHYMm8WQvBxJs`
READY at 2026-09-11T20:09:42Z on pythonmethodcenter.com and
www.pythonmethodcenter.com.

Anham's honesty-guard refusals are now recorded in a founder-only internal
centre as append-only events carrying only enumerated topic/audience/target/
locale — no question text, no medical data, no client identifier. Each new
subject opens one inactive, staff-only knowledge draft. No Telegram, email or
other external notification is sent. The retired client processing
classification is gone from the staff Case detail: no status/urgency/direction
panel, no CaseManagementForm, `updateCaseState` reads and writes nothing;
archived `status_changed` rows stay in storage and are withheld from the
timeline and from the assistant snapshot. The page is fully RU/EN.

Production Supabase (`zdrfttgwnyorifmpqgwe`, verified as the parent of the
`ankh-staging` branch): ledger checked read-only first. Applied
`20260911194351 assistant_knowledge_gap_notifications` and the corrective
`20260911195108 assistant_gap_notifications_service_role_least_privilege`
(repo file `20260909211104_assistant_knowledge_gap_notifications.sql`). The
correction exists because the project's default privileges grant ALL on new
tables to service_role, which left UPDATE/DELETE in place until revoked; this
was found by reading applied grants, not the SQL. `document_identity_manual_review`
was NOT applied: the ledger already holds it as `20260906183517` and
`uploaded_documents.identity_review_status` exists. No backfill; 0 rows in
both new tables and 0 drafts after release.

Verified in production: both tables exist, RLS on, 0 policies, anon/authenticated
have no SELECT, service_role has INSERT+SELECT only on events (UPDATE and DELETE
false) and INSERT+SELECT+DELETE on reads, unread RPC executable by service_role
only, `unique (gap_event_id, founder_profile_id)` present. Advisors: no new
WARN; the two tables join `rls_enabled_no_policy` at INFO with 10 pre-existing
service-only tables. The pre-existing `auth_rls_initplan` WARN covers 40
policy-bearing tables and is untouched.

Regression on the merged base: 1742 tests passed, 1 pre-existing skip (183
files); TypeScript, ESLint (0 warnings), security:check, build, npm audit (0)
and `git diff --check` pass; benchmark unchanged at 100% with 0 errors.

Unauthenticated production smoke (via Vercel fetch; direct egress from the
publishing session is blocked): RU `/` 200 `lang=ru`; EN `/en` 200 `lang=en`,
hreflang ru/en/x-default, no Cyrillic in visible markup; `/admin/notifications`
redirects to `/login`; `/api/admin/notifications/unread` returns 403 with no
count. Authenticated smoke (client/Karen exclusion, Case detail RU/EN, route
preservation, unchanged permissions) was NOT performed in production: no
credentials were available and none were created. Those properties are covered
by the unit suite rendering the real page and by the `getFounderState` gate.
Production auto-verification and external notifications were not enabled.
Evidence: docs/ankh/founder_gap_notifications.md,
docs/ankh/case_detail_without_classification.md.

## Client payment and support-period visibility — 2026-09-11

The signed-in client Anham now reads the person's own payment history and their
own recorded support periods. The client context previously carried `payments`
as `not_connected`, so the assistant could not answer "did my payment go
through, and until when am I accompanied?" at all.

What Anham receives: own-profile payments (`product`, `status`, `amount_cents`,
`currency`, `paid_at`, `created_at`) and own-profile service periods (`product`,
`status`, `starts_at`, `ends_at`), up to 20 latest records each, rebuilt field by
field in code rather than forwarded from the query result.

What Anham never receives: `processor_reference`, external transaction or
processor identifiers, the payments `metadata` blob, card or bank data, and any
record of another profile. No payment secrets reach a model prompt.

Answer boundaries: recorded `paid`, `pending`, `failed`, `refunded` and
`partially_refunded` are distinguished; only recorded `starts_at`/`ends_at` may
be named and an end date is never calculated; a paid status alone never becomes
an active support period; `unavailable` (read failure) never becomes "you have
no payment"; both a payment without a period and no payment at all route the
person to /support in RU and EN. The browser cannot supply payment records,
source context or action receipts — the server-built context is the only truth.

Checks on the candidate: 39/39 focused tests (five files: assistant-context-honesty,
client-payment-visibility, assistant-source-context, factual-honesty-provider,
factual-honesty-route); full suite 1,697 passed / 1 skipped across 178 files in
20.29s, zero failures and no hang; TypeScript, ESLint and `git diff --check`
passed. No schema migration, no new RLS grant, no clinical workflow, diagnosis,
recommendation or automatic verification change. Generated benchmark artifact
churn was restored rather than committed.

**PUBLISHED to production.** PR #177 merged as
892f4cd3a92db15c6d0a5b3bd354baeb5d629204 (change commit
10962ce69b27ef9e99908c7991892ed274bbd5c1). Vercel production deployment
dpl_FBK7mNa8FsCmRLHoR7MgKsjJq4Fc is READY for that merge commit, target
production, aliased to pythonmethodcenter.com and www.pythonmethodcenter.com
with no alias error; the remote production build completed successfully and the
repository CI workflow (security inventory, TypeScript, ESLint, full tests,
audit, build, diff check) passed on the merged commit. An unauthenticated
production request to /cabinet correctly served /login in Russian with the guest
assistant tier, confirming the deployment serves and the cabinet gate holds.

**Signed-in RU/EN cabinet acceptance is NOT done and is the remaining gate.**
This session had no client account credentials and no network egress to the
production domain, so the four browser scenarios (recorded payment plus period,
no payment, RU → EN → RU on /cabinet, close and reopen the chat) were not
executed and no acceptance result may be assumed from the checks above. A
separate Vercel project, anham-mobile-app, failed its build on this commit as it
did on every recent branch including #171–#176; that failure belongs to the
mobile project, not to the website deployment.

Release record: docs/ankh/history_recovery_and_honesty_v3.md.

## GPT-Live pilot implementation — 2026-09-10

Existing voice UI now has a gated gpt-live-1 WebRTC adapter with trusted server
sideband, shared history and existing staff/client backend delegation. Real
synthetic provider connection passed; production unchanged. Deployment approval,
server configuration and authenticated user acceptance remain. Phase NOT CLOSED.
Evidence, limitations and official API references: docs/ankh/gpt_live_pilot.md.

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
Realtime semantic VAD now uses low eagerness to give reflective pauses more time.
Shared RU/EN voice and text instructions stop filler agreement, distinguish support
for the person from agreement with a conclusion, and require respectful examination
of assumptions, contradictions, missing links and alternatives through one open
question at a time. No role, tool, schema, PHI or clinical-gate change. Focused
validation: 171/171 tests; TypeScript, ESLint and diff check pass. Live microphone
acceptance remains open; see docs/ankh/anham_thinking_partner.md.

## 2026-09-10 — Confirmed client cabinet actions in voice
The full client-assistant preview can now prepare and, after a separate explicit
spoken confirmation, execute owner-scoped self-service actions: Professor message,
supplement schedule/check-off, profile name/phone, client-entered metric and sleep
entry. A server-only RLS ledger provides session/profile binding, expiry and atomic
one-time execution without storing action contents. Payments, documents, Case state,
clinical decisions, other clients and admin operations remain immutable. The
production migration is applied with RLS, no `anon`/`authenticated` grants, and
server-role-only access. Focused regression: 160/160; full suite: 1649/1649;
production build, TypeScript, ESLint and diff check pass. See
docs/ankh/client_confirmed_voice_actions.md.

## 2026-09-10 — Published numeric sign acceptance

The Anham prose normalizer no longer drops mathematical signs before numbers.
PR #158 published the normalizer and PR #160 the Unicode-whitespace correction.
Merge commit ae210e9 is an ancestor of origin/main; Vercel production deployment
dpl_44jRTzEbgABPovMjcgK5TrXSvuwP built that commit, reached READY and served
pythonmethodcenter.com and www.pythonmethodcenter.com. Later production releases
carry the same behavior. Authorized acceptance in the existing signed-in
synthetic test account covered the RU reply, the EN reply, RU → EN → RU, history
after a full reload, and `-`, `+`, decimals and units, including after no-break,
narrow no-break and thin spaces. Only synthetic messages were sent; no client
data, payment or account setting was touched. Production runtime errors were
queried for `/api/assistant/client` and `/api/assistant/history`; none found.
Validation: 1277/1277 tests in 149/149 files, TypeScript, ESLint and diff check
pass; synthetic benchmark 3 documents / 4 pages with all four metrics at 100%
and zero critical extraction errors, false VERIFIED criticals and security
issues. Extraction and trust logic were not changed.

The fix is general Unicode-whitespace handling, not a rule for one value. The
historical raw provider response was not retained and has not been recovered or
reconstructed; the defect is reproduced only from a controlled synthetic
fixture, so the link to the original live omission stays unproven. The separate
mobile-project Vercel build failure predates this work and is not attributed to
it. No migration, schema, role, payment or authorization change. No clinical,
PHI or auto-verification gate was closed: Phase 2.9 remains open and production
auto-verification and Phase 3 production remain NO-GO. Scoped release CLOSED /
GO. Evidence: docs/ankh/anham_response_style_release.md and
docs/ankh/anham_unicode_numeric_signs.md.

## 2026-09-11 — Anna-only voice pilot costs

Voice pilot price and billing copy are private to the primary founder Anna.
The voices endpoint derives visibility from the authenticated email using the
existing primary-founder identity; query/body claims and additional founder
accounts cannot grant it. Live SSE omits monetary fields for everyone else;
server audit retains accounting. RU/EN voice UI keeps duration and privacy
disclosure for all users. No schema, clinical, memory or audio-flow changes.
Validation and release status: docs/ankh/live_cost_visibility.md.

## 2026-09-11 — Classification retirement and release repairs

The active Case workflow no longer renders, sorts, queries or automatically
writes the retired status, urgency and direction classification. English Case
detail now keeps document and review states in English. Founder knowledge gaps
are recorded through one atomic topic-serialized service-role RPC, and the live route externalizes
`ws` for the Node runtime. The separate mobile Vercel project's invalid Root
Directory was cleared. Validation and production evidence are recorded in
`docs/ankh/retired_classification_atomic_gaps_voice_release.md`. Clinical and
production auto-verification gates remain unchanged.

## 2026-09-12 — Classification/gap release accepted in production

The scoped operational release is published and accepted. RU/EN Case list and
detail checks pass, the mobile Root Directory repair builds, and the old live
`ws` masking error has no occurrence after the release deployment. A signed-in
non-PHI staff refusal created one enumerated founder event and one inactive
staff/general knowledge draft; the founder workspace showed it unread. Natural
provider refusals now use a narrow confirmed-record matcher in addition to the
canonical guard sentence. Full regression: 1760 passed, one opt-in provider
test skipped. Clinical phases and production auto-verification remain NO-GO.
Evidence: `docs/ankh/retired_classification_atomic_gaps_voice_release.md`.

## 2026-09-11 — Voice command continues in text after hangup

During a current GPT-Live delegation, the user can end paid voice immediately;
the detached, authenticated ANHAM backend request continues within the existing
300-second Vercel function window. Its result is saved idempotently into the same
`assistant_messages` profile/Case/scope and the open text chat polls the existing
protected history endpoint for that exact exchange. No new route, schema, role,
memory store or business-logic copy. RU/EN UI explains the handoff. Runtime crash,
redeploy and work past the function deadline remain non-durable. Evidence and
acceptance: docs/ankh/voice_background_continuation.md.

## 2026-09-13 — Anna-only platform cost table

The primary developer account has a separate `/admin/costs` tab. Both navigation
and page access use the server-verified Anna identity; Karen, clients and extra
founders cannot see monetary data. The table inventories current external cost
centres. GPT-Live 30-day usage and session estimates come from existing final
audit events. Web search and Document AI show activity counts; all vendor bills
without a connected usage feed remain explicitly unknown and are excluded from
the verified minimum. No schema, client API, credential or clinical change.
Details: docs/architecture/ANNA_PLATFORM_COSTS.md.

## 2026-09-19 — PMC monthly pricing migration is built but not yet live

Draft PR #215 contains the approved migration from new sales of fixed 5-week /
100-day plans to a two-service model: 299 USD one-time condition assessment and
Personal Support at 1,300 USD per paid 30-day period with a 1–12 month initial
duration. Optional Stripe automatic renewal begins only after the prepaid term.
The formula for the paid support period is a complimentary gift and delivery is
included; public RU/EN copy does not expose capsule quantity. Legacy fixed-plan
payments and periods remain readable.

The branch includes RU/EN web and mobile-web UI, oferta-v9, refund/payment copy,
Anham pricing knowledge, variable service periods, subscription webhook
handling, a client Stripe Customer Portal entry point, fulfillment linkage,
founder diagnostics and a database migration for `personal_support` and
`billing_subscriptions`. Native mobile pricing was intentionally not changed.

**Release status: NOT LIVE / HOLD.** Production remains unchanged until the
database migration is applied, required Stripe links and metadata are supplied,
subscription/customer-portal settings and webhook events are configured, the
full regression/build gate passes, and payment flows are accepted in test mode.
Vercel preview creation is currently blocked by the account build-rate limit,
not by an identified application build failure. See
`docs/RELEASE_MONTHLY_SUPPORT_2026_09_19.md`.

Follow-up hardening on the same draft branch makes webhook retry recoverable,
prevents duplicate service periods for the same payment, and rejects Personal
Support checkout/renewal amounts that do not match the selected term. Focused
tests pass. The staging migration and Stripe Test Mode acceptance remain
blocked by missing Supabase CLI/browser MFA authorization and an unauthenticated
Stripe Dashboard; Vercel Preview also has none of the 24 required support-link
variables. Production was not changed. Exact evidence and remaining gates are
recorded in `docs/RELEASE_MONTHLY_SUPPORT_2026_09_19.md`.

## 2026-09-22 — Automatic RU/EN Stripe Checkout prepared

The follow-up to draft PR #215 replaces static assessment/support Payment Links
with authenticated server-created Checkout. Four localized products and six
prices cover the assessment and all 1–12-term/renewal/language selections.
Consent persistence, exact USD pricing, customer ownership, 30-day renewal,
localized invoices/Portal and preview/live configuration guards are implemented.
See `docs/STRIPE_CHECKOUT_AUTOMATION_2026_09_22.md` for scope and limitations.
This supersedes the earlier 24-link environment requirement, not the staging
release gate. Stripe account setup, test payments and the PR #215 database
migration are still unverified; the new commercial model is NOT published.

### 2026-09-22 — Sandbox setup and isolated billing migration completed

The later authorization enabled `Pythons & Co sandbox` (`acct_1SUwZgE5bkDqmDrJ`).
Four RU/EN products, six prices and two Customer Portal configurations are now
created and verified. PR #215's billing migration was applied and checked on
`anham-staging` (`thylrayzjczsxlyqhtfc`) only. Exact objects and checks are recorded
in `docs/validation/stripe-sandbox-2026-09-22.json`.

Four actual Sandbox Checkout Sessions have correct 299 / 1,300 / 15,600 USD
totals; RU/EN hosted pages were inspected. No test payment has completed:
automatic browser review requires a human to submit the prepared payment.
Stripe also labels the prepaid renewal deferral as a free trial; resolve this
customer-facing wording before launch. Preview secrets/webhook and end-to-end
entitlement, renewal and cancellation acceptance remain open. New sales remain
disabled and the new model is NOT published. Work is in draft PR #216.

### 2026-09-22 — First real Sandbox Checkout payment verified

The owner completed the RU one-period renewal payment. Stripe now confirms
Checkout `complete` / `paid`, invoice `in_1UIYoJE5bkDqmDrJYwSTaxNb` paid for
1,300 USD, and subscription `sub_1UIYoLE5bkDqmDrJ7ZGjpMGV`. First renewal is
22 October 2026 at 18:33:55 UTC, exactly 30 days after the frozen Test Clock
start. Actual collection at renewal remains untested.

The RU Portal displays the paid invoice and test card; cancellation preview
preserves access until 22 October. Cancellation was not submitted. The owner
landed on Vercel login after Checkout because the success page is on protected
Preview. Authorized connector access returns HTTP 200 for that page. This is
not proof of application entitlement; Preview secrets and webhook are pending.
Code revision f7f6970 passes GitHub CI and local build, but its Vercel Preview
build failed; detailed build logs were unavailable through the connector.
Commercial launch remains HOLD. The validation JSON/report contain exact IDs
and remaining gates; production was not changed.

### 2026-09-22 — Production launch requested; billing schema prepared

The owner explicitly requested launch on the existing live site. Under that
authorization, the additive billing migration was applied to production
`zdrfttgwnyorifmpqgwe` and verified: enum, table, owner-read RLS policy,
authenticated SELECT, service-role writes, updated-at trigger and unique
service-period payment index are present. All five historical service-period
rows remain; no billing subscriptions were created. Security advisors report
no finding for the new billing table.

Latest PR #216 Preview `dpl_54Cs6inSm9tKMpy6Uh64nnmQQTfd` at `ae9e6d3` is READY,
superseding the earlier Preview build failure. Live Stripe has none of the new
catalog namespace. Its authorized `PostProducts` request was rejected for
insufficient permissions; official Live account reconsent is required. The
existing live webhook lacks the four recurring billing events. Vercel's
connector exposes no environment-write operation, and the browser needs sign-in.

No Live Stripe settings, production environment variables, main branch or
public offers were changed. The trial-wording and payment acceptance gates
remain open. The site has NOT launched the new model. Exact readiness evidence:
`docs/validation/stripe-production-readiness-2026-09-22.json`.

## 2026-09-23 — Anham prepares replies with a tablet

The existing avatar has a tablet-reading animation driven by text pending,
delegated background replies and voice thinking/reading/searching activity.
Localized status and reduced-motion support accompany the existing artwork.
Local synthetic browser checks cover small screens, RU/EN, success/error and
voice speaking/close transitions. No API, role, schema or clinical change.
Implementation, exact checks, release boundary and rollback are recorded in
`docs/design/ANHAM_TABLET_ACTIVITY.md`. This is not evidence of a clinical phase
closure or signed-in production acceptance.

## 2026-09-24 — Live Stripe catalog ready; Checkout release still HOLD

After official owner reconsent, the Live account accepted all four RU/EN
products, 30 exact-amount Prices for the 1–12-period model and two localized
Customer Portal configurations. The Portal enables card changes and
end-of-period cancellation, without plan changes. All were read back. The
existing Live webhook was not yet expanded beyond its five original events.
Vercel Production shows `STRIPE_CHECKOUT_MODE=live`, the production return
origin, automatic tax disabled and `STRIPE_CHECKOUT_ENABLED=false`; both
Stripe secret variable names exist as write-only values, not disclosed.

The owner deferred tax setup. Stripe Tax has zero Live registrations and its
settings are pending; this is not a determination that no tax is owed. Preview
RU→EN→RU switching and 6-/12-period displayed totals passed. The false claim
that taxes would be calculated separately at Checkout was removed in both
languages, the offer and assistant context. The amended offer is v10 with a
new fingerprint; existing v9 history is retained. Full local regression:
2,057 passed, one skipped; TypeScript, ESLint, security check, build and diff
check pass. The copy revision at `f39e4e0` has passing CI and a READY isolated
Preview. Its RU/EN pages show the revised final-total wording, preserve the
tariff route across both language switches, and render the 12-period $15,600
choice and separate renewal control at a 390×844 mobile viewport. A v9 RU
six-period prepaid-only Sandbox Checkout was subsequently paid for $7,800.
Stripe confirms `complete` / `paid`, and staging contains exactly one payment,
one active 180-day service period and one assigned gift-delivery task
(quantity 6). Authenticated Checkout, failed renewal (owner deferred), final
Portal cancellation and production recurring webhook events remain open.
Neither PR #215 nor #216 is merged; the new model is NOT LIVE.

Read-only Live Payment Link inventory found three currently active links whose
line items explicitly sell the retired terms: two named “Сопровождение 100
дней” and one named “Сопровождение 5 недель”. Their exact IDs are in the
production-readiness validation JSON. They were not deactivated before launch;
other personalized/generic Payment Links were left outside this retirement
scope rather than being guessed from amount alone.
