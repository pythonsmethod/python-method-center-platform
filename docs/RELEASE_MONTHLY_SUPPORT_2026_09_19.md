# PMC Monthly Personal Support — release preparation — 2026-09-19

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

## Stripe link contract

The site expects a pair of links for each initial duration N = 1..12:

- `STRIPE_PAYMENT_LINK_SUPPORT_NM` — prepaid term only, no automatic renewal.
- `STRIPE_PAYMENT_LINK_SUPPORT_NM_AUTORENEW` — same prepaid term paid now + automatic renewal after that term.

Every Personal Support Payment Link MUST include Payment Link metadata:

- `product=personal_support`
- `months=N`

Stripe copies Payment Link metadata to the Checkout Session. The webhook uses this metadata as the authoritative duration so taxes, Adaptive Pricing, currency conversion, discounts or future fee changes cannot corrupt duration inference.

### Prepaid-only link for N months

- Mode: one-time payment.
- One-time amount: `1300 × N USD`.
- Metadata: `product=personal_support`, `months=N`.
- No separate formula item.
- No separate delivery item.
- Automatic Tax: enable only when the Center has determined that Stripe should collect applicable tax for that jurisdiction.

### Auto-renew link for N months

Use subscription-mode Checkout / Payment Link:

- One-time line item due immediately: `1300 × N USD` for the prepaid initial term.
- Recurring price: `1300 USD every 30 days` (use a 30-day recurring interval, not a calendar-month interval).
- Subscription trial: `30 × N days`, so the recurring price is not charged during the already-paid term.
- Metadata on Payment Link: `product=personal_support`, `months=N`.
- No separate formula or delivery line item.
- Automatic Tax: same rule as above.

The initial Checkout Session opens the full prepaid support period. Later `invoice.paid` events open exactly one additional 30-day period.

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

Assessment:
- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_REVIEW_299`

For N = 1..12:
- `STRIPE_PAYMENT_LINK_SUPPORT_NM`
- `STRIPE_PAYMENT_LINK_SUPPORT_NM_AUTORENEW`

Support links are server-side environment values and are passed to the authenticated payment page. Do not expose Stripe secret keys in client configuration.

## Release gate

Do not publish this pricing release until all of the following pass:

- database migration applied in the target environment;
- 299 USD assessment link verified;
- all intended prepaid links configured with correct metadata;
- all intended auto-renew links configured with correct metadata, 30-day recurring price and correct trial duration;
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
