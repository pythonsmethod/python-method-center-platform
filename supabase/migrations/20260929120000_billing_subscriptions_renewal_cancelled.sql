-- Client turned off automatic renewal from the cabinet. The subscription
-- stays active until the paid period ends, then Stripe cancels it.
alter table public.billing_subscriptions
  add column if not exists renewal_cancelled_at timestamptz;
