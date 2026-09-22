# Automatic Stripe Checkout — 2026-09-22

Status: implementation prepared on top of draft PR #215; NOT deployed and NOT
verified against a Stripe account. Existing public offers remain live until the
pricing release passes its staging gate.

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

A stable catalog namespace creates/reuses four localized Stripe products and
six reusable prices. There are no manually maintained term/language links:

| Purchase | Due now, before applicable tax | Later charges |
| --- | --- | --- |
| Assessment | 299 USD × 1 | None |
| Support, prepaid only | 1,300 USD × N | None |
| Support, renewal selected | 1,300 USD × N | 1,300 USD every 30 days, starting after N×30 days |

Renewal uses subscription-mode Checkout with the prepaid one-time line plus a
30-day recurring line deferred by `trial_period_days=N*30`. Stripe's API calls
this deferral a trial; the initial paid service itself is not free. Verify the
visible Stripe summary and first invoice in test mode before enabling sales.

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

No authenticated Stripe session or test secret was available during this change.
Therefore catalog creation in the actual account, real test-mode payments,
Customer Portal behavior, tax settings and invoice email appearance are not
claimed verified. Database migration, webhook registration and isolated staging
also remain unverified. Do not enable live sales on the basis of unit tests.

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

No production deployment/merge, no manual legacy-price deletion, no migration of
existing customer subscriptions, no clinical workflow changes and no native
mobile purchasing changes. Archived legacy source repositories are not used.
Old public Payment Links should be deactivated at launch after verifying that
existing subscriptions/history remain intact; this is not done ahead of launch.

## J–L. Closure and next action

Code preparation can be reviewed independently of the external account setup.
Commercial launch remains **NO-GO** until isolated Stripe/Supabase acceptance
passes. The next external action is to finish authenticated Stripe access, then
exercise the prepared checkout flow in test mode, apply/verify the existing
billing migration in staging, and complete the release gate in
`RELEASE_MONTHLY_SUPPORT_2026_09_19.md`.

## Primary references

- [Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create)
- [Checkout trials and initial one-time charges](https://docs.stripe.com/payments/checkout/free-trials?payment-ui=stripe-hosted)
- [Subscription trials with invoice items](https://docs.stripe.com/billing/subscriptions/trials/free-trials)
- [Customer Portal configuration](https://docs.stripe.com/customer-management/configure-portal)
- [Customer invoice languages](https://docs.stripe.com/invoicing/customize#customer-preferred-languages)
