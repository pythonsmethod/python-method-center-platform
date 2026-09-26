# PMC Monthly Personal Support — release preparation — 2026-09-19

2026-09-24 gate update: isolated Sandbox/staging acceptance passed the 299 USD
assessment, 1,300 USD first support payment, first 30-day automatic renewal,
webhook redelivery without duplicate effects, and gift-task creation. A
Stripe Test Clock exposed a webhook-time offset; the invoice-period anchoring
fix then passed a fresh paid 12-period Preview run with exact 360-day access.
The Live RU/EN catalog (four products, 30 prices) and two Portal configurations
were created through the authorized connection. Failed renewal was deferred by
the owner; 6-period paid flow, final Portal cancellation, authenticated app
Checkout, production webhook events and publication remain open. Tax setup was
deferred and the unverified tax-at-Checkout copy removed in offer v10. The
release remains HOLD.

## Owner decision

New public commercial model:

1. **Condition assessment** — 299 USD, one-time.
   - Current public positioning: condition assessment, test-results review and preliminary consultation on a personal rehabilitation protocol.
   - Does not open a Personal Support period.
   - Does not include Professor Python's formula.

2. **Personal Support** — 1,300 USD per paid **30-day** period.
   - One domain product: `personal_support`.
   - Client selects the initial prepaid duration: 1–12 months.
   - Initial charge: `1,300 USD × selected months`.
   - Support access: `30 days × selected months`.
   - Professor Python's formula for the paid period is complimentary and is not sold separately.
   - Delivery of the complimentary formula is included.
   - Public UI and Anham must not state capsule quantities.
   - Automatic renewal is optional.
   - If enabled, renewal begins only after the prepaid term ends, then charges 1,300 USD every 30 days.
   - A failed renewal never opens a new service period and never creates gift fulfillment.

Legacy `support_5_weeks` and `support_15_weeks` remain readable for historical payments and periods, but are not offered for new purchase.

## Stripe Checkout contract — updated 2026-09-22

The site creates an authenticated Checkout Session on demand. The previous
24-link configuration is superseded. No 50 manually maintained RU/EN links
are required. See `docs/STRIPE_CHECKOUT_AUTOMATION_2026_09_22.md`.

- Four localized Stripe products (two services × RU/EN), six base prices and
  24 localized initial-term renewal prices are created automatically using
  deterministic product IDs, lookup keys and idempotency keys. Historical
  products are never edited.
- Assessment: one-time price 299 USD, quantity 1, payment mode.
- Support: one-time price 1,300 USD, quantity N (1..12), payment mode unless
  the client explicitly selects renewal.
- Renewal: Checkout charges one recurring initial-term price of `1,300 × N` USD
  for `N × 30` days. It uses no trial. After confirmed payment, an idempotent
  Subscription Schedule preserves that paid phase and switches the next phase
  to the reusable 1,300 USD / 30-day price.
- Checkout and subscription metadata include `product=personal_support`,
  `months=N`, `auto_renew`, `ui_locale`, the authenticated `profile_id`, offer
  version and checkout attempt ID. The webhook contract is unchanged.
- Checkout `locale`, product name/description, purchase summary, return URLs,
  Customer `preferred_locales` and Customer Portal follow RU/EN selection.
- No separate formula or delivery charge. Shipping continues through the
  existing cabinet address/fulfillment workflow; no address is invented.
- Adaptive Pricing is disabled and prices use USD. Automatic Tax is opt-in
  after business tax configuration; no tax registration/classification is inferred.

The initial paid Checkout Session opens the full prepaid support period.
Later `invoice.paid` events open exactly one additional 30-day period.

## Webhook events required

Production webhook:
`https://pythonmethodcenter.com/api/stripe/webhook`

Events:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `payment_intent.payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`

## Database

Migration:
`supabase/migrations/20260919123000_personal_support_billing.sql`

It:
- adds `personal_support` to the historical payment-product enum;
- creates `billing_subscriptions` for Stripe subscription identity and state;
- stores no card data;
- preserves legacy products rather than rewriting historical payments.

## Environment variables

Server-only configuration:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CHECKOUT_ENABLED=true` only after the release gate
- `STRIPE_CHECKOUT_MODE=test` in isolated staging; `live` only in production
- `STRIPE_CHECKOUT_RETURN_ORIGIN` for the exact target environment
- `STRIPE_CHECKOUT_AUTOMATIC_TAX=false` unless Stripe Tax is configured

Do not expose Stripe keys to the client. Preview deployments reject live keys.
Missing billing migration or consent persistence blocks support checkout.

## Release gate

Do not publish this pricing release until all of the following pass:

- database migration applied in the target environment;
- automatic RU/EN catalog and 299 USD assessment Checkout verified;
- prepaid Checkout verified for all 1–12 terms and correct metadata;
- auto-renew Checkout verified with exact 30-day price and N×30-day deferral;
- webhook subscription events enabled;
- Stripe Customer Portal enabled for the production account, with customers allowed to cancel automatic renewal and update payment methods;
- RU and EN payment page verified;
- desktop + mobile-web duration selection verified;
- one-time test payment verified;
- multi-month prepaid test verified;
- auto-renew subscription creation verified;
- synthetic `invoice.paid` renewal verified as +30 days;
- failed renewal verified not to extend access;
- gift fulfillment created for each paid period without public capsule quantity;
- legacy payment/history reads still pass;
- TypeScript, lint, build and test suite pass.

Native mobile app pricing is intentionally out of scope: purchasing remains on the web platform.

## Historical verification follow-up — 2026-09-19

The link-specific blockers below describe the original implementation; the
2026-09-22 automation supersedes them. Stripe, migration and staging payment
verification remain release gates.

The webhook now fails closed on a Personal Support contract mismatch: the
Checkout Session must contain `product=personal_support`, an integer
`months=1..12`, USD currency and a base amount of `130000 * months` cents. A
recurring invoice must have an exact 130000 USD-cent base subtotal before it can
open another 30-day period. Tax and an explicitly configured discount may alter
the amount actually collected without changing the paid service duration. Test
coverage locks the base-price and duration rules.

Webhook processing errors now return HTTP 500 and release the event-ledger
claim so Stripe can redeliver. A repeated delivery resumes an existing payment
by `processor_reference`; a unique `service_periods.payment_id` index plus an
existing-period lookup prevents the retry from granting access twice.

External staging gate remains open:

- no `STRIPE_PAYMENT_LINK_SUPPORT_1M..12M` variables exist in the Vercel
  Preview environment;
- no matching `_AUTORENEW` variables exist there;
- Vercel marks the existing Stripe/Supabase Preview values as sensitive and
  they are shared with Production scope, so Test Mode and the staging project
  cannot be verified from the CLI output;
- Supabase CLI has no access token and the browser session stops at Supabase
  MFA, so migration application is not claimed;
- Stripe Dashboard is not authenticated, so test Payment Links, webhook event
  selection and Customer Portal configuration are not claimed.

No production configuration or database was changed during this follow-up.
