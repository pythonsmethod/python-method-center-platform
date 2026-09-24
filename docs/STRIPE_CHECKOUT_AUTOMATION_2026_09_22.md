# Automatic Stripe Checkout — 2026-09-22

## Payment-to-access Preview follow-up — 2026-09-24

The authenticated EN six-period Sandbox payment was read back as paid in
Stripe and linked in staging to its one Case, exact 180-day entitlement,
subscription and six-period gift task. The deployed EN success page shows the
paid dates; its questionnaire, cabinet access date, Portal entry point and
gift delivery page were inspected in Preview. English is now persisted when
the browser reaches a public `/en` return URL, so the subsequent private
questionnaire stays English without a separate language-switch click.

The same browser run found the Case history query selecting retired
classification columns absent from staging. Both client/staff reads and new
lifecycle writes now use the shared active columns; no archived production
event or schema was changed. READY Preview
`dpl_96BXibANiutHozREbMCpdLBrkL9X` shows an empty history rather than a
database error, while the payment, paid-through date and Portal entry point
remain visible in RU and EN. A fresh paid no-Case webhook remains open;
the repaired payment alone does not prove it. Production remains HOLD.

Subsequent READY Previews show the six-period gift task's quantity to the
client and fulfillment team, and the 390px paid account/return/delivery pages
no longer overflow horizontally. A paid but empty Case sends the client to
the questionnaire instead of claiming that Karen is already reviewing
materials. Full local regression: 2,088 passed, one existing skip.

## Pre-onboarding paid fulfillment — 2026-09-24

An authenticated client may pay before completing medical intake. The signed
paid webhook now finds or creates that profile's one empty `client_cases` row,
without writing questionnaire or clinical information, then links the paid
payment, support period, subscription and gift task. A repeat event cannot
create a second Case or period. The RU/EN paid return confirms Stripe payment
separately from actual access; it shows paid dates only after a matching
`service_periods` row exists. Onboarding later fills the same Case. If the
address is supplied after payment, gift fulfillment uses the original number
of paid terms, not a default of one. The delivery page shows that an address
is still required. One already-paid synthetic staging record was repaired
against its verified Stripe invoice period; this was not a second payment or
a production edit. Fresh Preview acceptance is still required.

## Elements billing-address blocker — 2026-09-24

The authenticated EN six-period Sandbox Elements Session requires
`billing_address_collection=required`. The Preview rendered only the Payment
Element's card fields, leaving Checkout `canConfirm=false` and Pay disabled.
The branch now mounts Stripe's `BillingAddressElement` before `PaymentElement`
with RU/EN section headings; the full address requirement remains intact.
Focused tests and the full local gate pass (2,069 tests, one skip, TypeScript,
ESLint, security check, production build). On READY Preview `8c75ba6`, a
synthetic billing address and Stripe 4242 card enabled Pay. The owner submitted
the EN six-period payment; Sandbox Checkout and invoice are paid for 7,800 USD,
the authenticated return says `Payment received`, and staging has one payment,
one subscription and a six-unit gift-delivery task. The paid invoice period is
2026-09-24 19:29:45 UTC to 2027-03-23 19:29:45 UTC; the active schedule then
switches to 1,300 USD every 30 days. There is no staging service-period row
for this payment because the synthetic buyer had no Case before Checkout and
the webhook skips period creation when `case_id` is absent. Treat pre-onboarding
paid entitlement as a release blocker; do not equate the success page with
completed access. Production remains disabled.

## Acceptance update — 2026-09-24

The isolated Vercel Preview now uses staging Supabase, Stripe Sandbox keys and
a signed Sandbox webhook. A separate revocable Preview bypass secret, approved
by the owner and omitted here, is held only in Vercel/Stripe; the existing
project-wide secret was not used. The Sandbox assessment, RU one-period paid
support Checkout and first automatic 1,300 USD renewal succeeded. The renewal
invoice had one 30-day line; staging recorded one payment, access period and
gift-delivery task for each support charge. Replaying `invoice.paid` did not
create duplicates. The RU Portal showed the test card and cancellation-at-end
preview; final cancellation was not submitted.

The Test Clock exposed a 22-minute difference between Stripe's frozen billing
anchor and the earlier webhook's wall-clock-based access dates. The corrected
code uses the paid invoice line start/end for both initial and renewal access,
validates the actual charge, and refuses an auto-renew Checkout while another
support term is active. Local checks pass (2,055 tests, one skip, typecheck,
lint, security check and build). The corrected READY Preview then processed a
fresh EN 12-period renewal-selected Sandbox payment of 15,600 USD. Its Stripe
paid invoice and staging service period both run exactly from
2026-09-24 02:15:10 UTC to 2027-09-19 02:15:10 UTC; Stripe schedules 1,300 USD
every 30 days afterward. The signed webhook returned HTTP 200 and created one
paid access period and one gift-delivery task. This particular Checkout used a
synthetic staging fixture and direct Stripe API, so app authentication and
consent persistence are not thereby verified. A separate RU 6-period
prepaid-only session displays 7,800 USD / 180 days but remains unpaid. The
owner declined the proposed failed-renewal simulation; no failing card or
clock change was made for it. Failed renewal, final Portal cancellation,
6-period paid flow and authenticated app Checkout remain open. The owner
completed official Live Stripe reconsent. All four deterministic RU/EN Live
products, 30 prices (assessment, prepaid-only, 30-day renewal, and 1–12 paid
initial terms for each language), and two Portal configurations were created
and read back. Portal permits card changes and end-of-period cancellation,
not plan changes. The existing Live webhook still has its five historical
events; the four recurring events have not yet been added. Production Checkout
remains disabled and the site is not released.

The owner deferred tax setup. Live Stripe Tax settings are pending with zero
registrations, and Vercel has `STRIPE_CHECKOUT_AUTOMATIC_TAX=false`. The
unverified claim that Stripe would calculate tax at Checkout was removed from
both payment languages, the offer, and assistant price context; the offer is
now v10 so new consent records cannot be confused with v9. The prices retain
the application's `tax_behavior=exclusive`; changing that later requires a
new Price/catalog version. This does not determine whether the business owes
sales or use tax. The copy-only revision passed 2,057 tests (one skip),
TypeScript, ESLint, security check and production build locally; it still
needs a new Preview and acceptance. Earlier checkpoint statements below
describe their state at the time and do not override this update.

Status: implementation in draft PR #216 on top of draft PR #215; Sandbox catalog,
Portal configuration and isolated staging migration completed on 2026-09-22.
Hosted test Checkout pages were inspected in RU/EN. The owner completed the
RU one-period renewal test payment; Stripe confirmed its paid invoice.
The owner subsequently authorized production launch. The additive production
billing migration is now applied and verified; Preview `bb00c22` is READY.
Commercial release remains HOLD because the remaining paid acceptance and
production webhook gates are open.
Existing public offers remain live until the pricing release passes its gate.

## A. Existing implementation

PR #215 already contained the approved 299 USD assessment and 1,300 USD / 30-day
support model, duration UI, webhook processing, renewal persistence, delivery
integration, Customer Portal entry point and billing migration. Payment buttons
still required 24 support Payment Links plus an assessment link. The public site
had not switched to this model.

## B. Change and resulting behavior

An authenticated Next Server Action creates Checkout from the buyer's selected
service, 1–12 prepaid periods, RU/EN locale and explicit renewal choice. Prices,
customer ownership, metadata and return URLs are computed on the server. Two
separate offer/immediate-start consents must be persisted before Stripe writes;
the renewal choice and duration are included in those records.

A stable catalog namespace creates/reuses four localized Stripe products, six
base prices and 24 localized initial-term recurring prices. There are no
manually maintained term/language links:

| Purchase | Due now, before applicable tax | Later charges |
| --- | --- | --- |
| Assessment | 299 USD × 1 | None |
| Support, prepaid only | 1,300 USD × N | None |
| Support, renewal selected | 1,300 USD × N | 1,300 USD every 30 days, starting after N×30 days |

The revised renewal flow does not use a trial. Subscription-mode Checkout uses
one recurring initial-term price whose amount is `1,300 × N` USD and whose
first billing period is exactly `N × 30` days. After confirmed payment, the
signed webhook idempotently attaches a Subscription Schedule: the paid initial
phase is preserved, then the next phase changes to 1,300 USD every 30 days.
The schedule releases after 120 renewal periods while retaining the final
30-day price, so long-lived subscriptions continue. Schedule creation must
succeed before application processing acknowledges the Checkout webhook.

Checkout locale, merchant product name/description, custom purchase summary,
return routes and Customer preferred invoice/email languages follow the site's
language. Portal sessions also specify RU/EN. Stripe handles its standard UI
translation; bank/3DS screens remain controlled by the bank.

Portal configurations are created automatically for the configured environment
and language, with invoice history, card updates and cancellation at period end.
Plan/quantity changes are disabled so an update cannot end the prepaid deferral
early. Disabling new Checkout sales does not disable the Portal for existing
customers. A Portal POST requires the configured same-site Origin and uses the
authenticated account's subscription record, never a submitted customer ID.

Old price/product objects are not edited. Catalog collisions, changed prices,
calendar-month recurrence, inactive objects or changed Portal behavior fail
closed. Update the catalog version deliberately when changing approved copy or
commercial terms. Deterministic product IDs, price lookup keys and Stripe
idempotency keys make retries safe within Stripe's idempotency retention period;
the UI disables double clicks and reuses its checkout attempt ID after errors.

## C. Main files

- `lib/payments/checkout-contract.ts`: strict input, metadata and Session contract.
- `lib/payments/checkout-catalog.ts`: automatic localized products/prices/Portal.
- `lib/payments/checkout-settings.ts`: explicit mode/origin and preview boundary.
- `lib/payments/actions.ts`: authentication, durable consent and Stripe orchestration.
- `components/payments/PaymentPlans.tsx`, `app/(payment)/payment/page.tsx`: dynamic checkout UI.
- `app/api/stripe/portal/route.ts`: localized, owned Portal with same-site POST check.
- RU/EN dictionaries, founder readiness and assistant service-price configuration.
- Four checkout test files, release/deployment documentation and `.env.example`.

## D. Schema and configuration

No additional migration is introduced. PR #215's
`supabase/migrations/20260919123000_personal_support_billing.sql` remains required
in the isolated target database before support checkout can run. Existing
`consent_records` RLS enforces `profile_id=auth.uid()` for reads and inserts.

Required server configuration:

```text
STRIPE_SECRET_KEY=<test secret in isolated staging>
STRIPE_WEBHOOK_SECRET=<matching environment endpoint secret>
STRIPE_CHECKOUT_ENABLED=false
STRIPE_CHECKOUT_MODE=test
STRIPE_CHECKOUT_RETURN_ORIGIN=https://your-isolated-staging.example
STRIPE_CHECKOUT_AUTOMATIC_TAX=false
```

Set `STRIPE_CHECKOUT_ENABLED=true` in isolated staging for acceptance testing.
Only use `live` with a live key in a production runtime after acceptance. Preview
rejects live keys even if production settings were copied. The explicit return
origin prevents silently sending a staging buyer back to the production site.
New sales remain unavailable when the feature flag or required settings are absent.
The flag checks configuration, not payment success or database migration health.

The key must permit product/price read+write, customer read+write, Checkout
creation and Billing Portal configuration/session creation. No key is in the
client bundle. No static Payment Link variables are consumed by this code.

Sandbox setup now exists in `Pythons & Co sandbox` (`acct_1SUwZgE5bkDqmDrJ`).
Four localized products, six prices and two active Portal configurations were
created and read back. Recurrence is `day` with `interval_count=30`, not a calendar
month. Stable namespace `pmc-20260922-v1` matches the application's catalog.
The exact object IDs and checks are in
[`validation/stripe-sandbox-2026-09-22.json`](validation/stripe-sandbox-2026-09-22.json).

The existing billing migration was applied through Supabase to the isolated
`anham-staging` project `thylrayzjczsxlyqhtfc`. Verified: `personal_support` enum,
`billing_subscriptions` RLS, owner-only authenticated SELECT, service-role write
privilege and unique `service_periods.payment_id` index. The security advisor
reported no finding referencing the new billing table. Production DB was not
changed. This does not assert that Preview is connected to this staging DB.

## E. Verification

Local checks on 2026-09-22:

- `npm test`: 212 files passed, 1 skipped; 2,042 tests passed, 1 skipped.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero lint warnings.
- `npm run build`: passed, including security checker self-tests and inventory.
  Existing CSS/autoprefixer and webpack cache warnings remain.
- `git diff --check`: passed.
- After the final one-time-invoice/tax-summary adjustment, the targeted checkout
  tests and typecheck/lint are rerun; CI rechecks the complete pushed revision.

New automated
coverage checks all 50 purchase/language selections, invalid amounts/ownership/
legacy products, consent failures, duplicate-attempt idempotency, catalog reuse,
30-day recurrence, Portal cancellation settings, authentication, cross-site
Portal rejection, preview/live separation and RU/EN rendered payment controls.
These are local tests with synthetic fixtures; they are not real Stripe test
payments, a deployed browser run or verification of Supabase production state.

Follow-up after account authorization:

- Checkout contract, catalog, webhook, action and UI: 105 tests passed in 5 files.
- Typecheck and lint passed after using Stripe-managed payment method selection
  and a stable `integration_identifier` (`pmc-checkout-slibjrkn`).
- Four real Sandbox Checkout Sessions generated from `buildCheckoutSession`:
  RU assessment = 299 USD; EN 12 prepaid periods = 15,600 USD; RU 1 period with
  renewal = 1,300 USD now; EN 12 periods with renewal = 15,600 USD now.
- Subscription deferrals accepted by Stripe for 30 and 360 days. Hosted RU/EN
  pages show the correct localized merchant copy, sums, future 1,300 USD / 30-day
  price and return routes. Final invoice/renewal timestamps are still unverified.
- A synthetic Test Clock and two synthetic Customers were created. The prepared
  RU payment uses Stripe's public test card and fictional contact/address data.
- Automatic Cloud Browser approval review rejected `submit_payment` because
  final financial submission requires a human handoff, including Sandbox.
  Session remains `open` / `unpaid`, with no subscription or invoice. No retry
  through a different interface was attempted. All completed-payment checks
  remain open until the user submits the prepared test form.
- [Prepared Sandbox form](validation/stripe-sandbox-ru-1790102314400.jpg).

Human-handoff follow-up on 2026-09-22 supersedes the earlier unpaid status:

- Session `cs_test_b1LlW7Q0LATV7WdGldnfmojXhfdWjRYbvKa3YpsdGmIs75rS7mVFJgmy0a`
  is now `complete` / `paid`, in Sandbox only.
- Invoice `in_1UIYoJE5bkDqmDrJYwSTaxNb` is `paid`, amount paid 130,000 USD cents,
  amount remaining zero, billing reason `subscription_create`.
- Subscription `sub_1UIYoLE5bkDqmDrJ7ZGjpMGV` is `trialing`; its initial deferral
  runs from 2026-09-22 18:33:55 UTC to 2026-10-22 18:33:55 UTC, exactly 30 days
  on the synthetic Test Clock. Its recurring price is 1,300 USD every 30 days.
- The invoice's one-time line period follows Checkout wall-clock time, while
  the subscription follows frozen clock time. The exact periods are retained
  in the validation JSON; this does not verify application entitlement dates.
- Actual RU Customer Portal shows the paid invoice, saved test card and next
  renewal date. Its cancellation preview says access remains until 22 October.
  Final cancellation and actual recurring collection have not been executed.
- The browser returned from successful payment to Vercel sign-in because the
  success URL belongs to an authentication-protected Preview. An authorized
  Vercel connector fetch returns HTTP 200 for `/payment/success`. The Vercel
  login is separate from payment status. No protection was disabled, and the
  static success-page response does not verify account entitlement.
- Parent code revision `f7f6970` passed local production build and GitHub Actions
  run `35768947357` (security, types, lint, tests, audit, build and diff check).
  Its new Vercel Preview failed with `type_error`; the build-log tool was not
  available. The failure's specific cause remains unverified.

Production-preparation follow-up on 2026-09-22:

- Latest Preview `dpl_54Cs6inSm9tKMpy6Uh64nnmQQTfd` at `ae9e6d3` is READY;
  the previous build failure is not the current release blocker.
- After explicit owner launch authorization, the existing billing migration
  was applied to production `zdrfttgwnyorifmpqgwe`. Enum, table, RLS owner-read
  policy, authenticated SELECT, service-role writes, trigger and unique index
  all passed SQL checks. Historical service-period count remained five.
- The post-migration security advisor has no finding for the billing table.
  It lists existing informational notices for unrelated server-only tables.
- Live catalog inventory contains none of the new namespace. The first
  authorized product-create attempt failed with missing `PostProducts`
  permission. No Live object was created, and no alternate write route was used.
- The existing Live endpoint lacks `invoice.paid`, `invoice.payment_failed`,
  `customer.subscription.updated` and `customer.subscription.deleted`.
  Prepared activation values and exact evidence are recorded in
  `validation/stripe-production-readiness-2026-09-22.json`.

## F. Benchmark

The existing synthetic benchmark ran as part of the full suite: 3 documents /
4 pages, 100% critical numeric match, precision, recall and provenance; zero
critical extraction errors or security issues. Its output differed only in
generation time and is not committed. Clinical/Ankh behavior is unchanged.

## G. Security and privacy

Only existing account ID, email and commercial metadata go to Stripe; no medical
records, documents, diagnoses, card data or API keys are added to browser props,
logs or source control. Stripe stores card details. The Server Action validates
input independently of the UI and relies on Next's POST/Origin enforcement in
addition to authenticated ownership. Redirects alone never grant paid access:
the existing signed webhook remains authoritative.

## H. Remaining limits and release gate

Stripe Sandbox access, catalog creation, Portal settings and the staging schema
are verified as recorded above. Runtime secrets and a matching signed webhook
have not been configured for an isolated Preview. The connected Vercel tools do
not expose an environment-variable write operation, and no authenticated CLI or
test server secret is available in this workspace. The ready PR Preview alone
does not prove isolation. No webhook was attached to an unverified environment.

The RU one-period payment completed after the owner performed the handoff.
Other payment cases, actual renewal charging, final Portal cancellation,
entitlement and delivery writes, tax settings and full invoice/email appearance
remain unverified. Test Clock advance is not exposed by the connected Stripe
API search; an authenticated supported testing surface is still needed for it.
The trial-based code blocker is removed locally and locked by focused tests,
but the revised hosted Checkout, schedule transition and Portal cancellation
still require Sandbox acceptance before live sales are enabled.

Before launch, verify assessment, 1/6/12-term prepaid payments, 1/6/12-term
renewal payments, cancelled/failed Checkout, failed renewal, webhook retry and
out-of-order delivery, cancellation during prepaid time, and a renewal using a
Stripe Test Clock. Verify RU/EN on desktop/mobile, the initial invoice, exact
first renewal time, paid access and gift-delivery task creation. Then check all
remaining terms' Checkout totals and metadata. Test with synthetic customer data.

Existing subscription records prevent starting another auto-renewing
subscription for that account. Simultaneous independent checkout attempts before
a subscription's webhook arrives are not a global purchase lock. A new one-time
purchase can create a separate Stripe Customer; the existing subscription table
remains the identity source for Portal access. Multi-device deduplication and a
permanent all-purchases customer registry are outside this change.

Delivery uses the already-existing cabinet address and country-volunteer flow;
this change does not replace it with a new shipping-country policy. Tax
registration, tax classifications, payment disputes and legal wording are not
inferred or changed. Configure and verify applicable Stripe Tax separately. Optional paid one-time
invoice generation is not enabled; normal Stripe receipts and subscription
invoices use Customer preferred languages.

## I. Intentionally outside this change

No production deployment/merge has occurred. The owner has now authorized the
rollout, and the additive production billing migration has been applied.
No manual legacy-price deletion, no migration of existing customer
subscriptions, no clinical workflow changes and no native
mobile purchasing changes. Archived legacy source repositories are not used.
Old public Payment Links should be deactivated at launch after verifying that
existing subscriptions/history remain intact; this is not done ahead of launch.

## J–L. Closure and next action

Code preparation can be reviewed independently of the external account setup.
Commercial launch remains **NO-GO** until isolated Stripe/Supabase acceptance
passes. The first human-completed Sandbox payment, its invoice and subscription
schedule are now verified. The latest Preview is READY and the production
schema is prepared. Next resolve the Live Stripe permission denial and Vercel
sign-in, finish isolated Preview credentials and signed webhook configuration,
resolve the trial wording, and complete the remaining acceptance cases and release gate in
`RELEASE_MONTHLY_SUPPORT_2026_09_19.md`.

## Later acceptance status — 2026-09-24

This section supersedes the older outstanding setup list above. The Live
account now has the four localized products, 30 exact Prices and two localized
Customer Portal configurations; these were created through the officially
expanded connection and read back. The existing Live webhook still needs the
four recurring events after the new handler is deployed. Production Checkout
remains disabled.

The paid-initial-period implementation (without a free trial) passed a paid
Sandbox 1-period Checkout, a Test Clock first renewal, a paid 12-period
renewal-selected Checkout, and a paid 6-period prepaid-only Checkout. The
last charged 7,800 USD, created exactly one 180-day staging access period and
one assigned gift-delivery task with quantity 6. The assessment paid flow and
duplicate webhook idempotency also passed. The 6-period payment used offer v9;
the v10 tax-copy revision has passing CI and READY Preview, with RU/EN and
mobile tariff rendering checked. Authenticated v10 consent was verified in the
later Preview check below.
The owner explicitly deferred the failed-renewal simulation. Final Portal
cancellation (since verified below), authenticated paid return, the payment-page
disclosure issue and the Live webhook expansion
remain unverified. Release status remains **HOLD / NOT LIVE**. Tax setup is
deferred, not deemed unnecessary; automatic tax remains disabled. See
`CURRENT_STATE.md` and `validation/stripe-production-readiness-2026-09-22.json`
for the current gate.

### Authenticated Preview and disclosure check — 2026-09-24

A confirmed synthetic staging Auth user and matching minimal client profile
signed in through the Preview RU login page. RU prepaid-only 1-period and EN
auto-renew 6-period Sessions opened in Stripe Sandbox without charging a card.
The matching staging `consent_records` each contain the two `oferta-v10` sources
and the selected term/renewal metadata. Stripe readback confirms RU `payment`
mode, 1,300 USD, no renewal; EN `subscription` mode, 7,800 USD, six periods,
renewal enabled. Vercel verified the Checkout return hostname is the branch
alias pointing to the latest READY deployment, not an older Preview.

Hosted Stripe Checkout nevertheless headlines the EN initial subscription as
`$7,800 every 180 days`. The smaller submit text correctly states `$7,800
today for 180 days, then $1,300 every 30 days`, but the two statements are
materially inconsistent in prominence. An unpaid Sandbox pilot with a one-time
$7,800 item and a $0/180-day recurring item did not fix the headline; Stripe
still rendered `$7,800 every 180 days`. Stripe's Subscription prebilling API
supports advance collection but is not exposed in Checkout Session
`subscription_data` and has separate Customer Portal cancellation semantics.
Do not claim the payment-page wording blocker closed or enable Live sales until
the final architecture is proven end to end.

The branch now contains a conditional Checkout Elements form for the
renewal-selected 2–12-period case. It retains server-created Checkout Sessions
and the existing post-payment schedule/Portal behavior, while placing the
primary due-today and subsequent-renewal disclosures on the PMC page in both
languages. A mode-checked Sandbox publishable key is required as
`STRIPE_PUBLISHABLE_KEY` in the isolated Preview. An unpaid six-period Elements
Session was accepted by Stripe with 7,800 USD total and `mode=subscription`;
local typecheck, security gate and build pass. No browser or paid return check
of this new form has yet passed; release stays HOLD.

The owner separately approved final cancellation of the synthetic 12-period
Sandbox subscription. RU Portal scheduled cancellation for 19 September 2027,
the exact end of the paid 360 days. Stripe readback: subscription still active,
`cancel_at=1821320110`, transition schedule detached; staging readback: paid
service period still active through `2027-09-19 02:15:10+00`. Portal's add-card
form opens, but no new test card was entered or saved. The owner has **not**
authorized the previously declined failed-renewal simulation.

## Primary references

- [Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create)
- [Checkout trials and initial one-time charges](https://docs.stripe.com/payments/checkout/free-trials?payment-ui=stripe-hosted)
- [Subscription trials with invoice items](https://docs.stripe.com/billing/subscriptions/trials/free-trials)
- [Customer Portal configuration](https://docs.stripe.com/customer-management/configure-portal)
- [Customer invoice languages](https://docs.stripe.com/invoicing/customize#customer-preferred-languages)
