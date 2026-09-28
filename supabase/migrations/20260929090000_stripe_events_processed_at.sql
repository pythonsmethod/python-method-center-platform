-- Stripe webhook ledger: distinguish a finished event from an abandoned claim.
-- A row without processed_at older than ten minutes may be retaken by a Stripe
-- retry, so a killed serverless invocation no longer loses a payment event.
alter table public.stripe_events
  add column if not exists processed_at timestamptz;

-- Every existing row was handled under the former insert-first rule.
update public.stripe_events set processed_at = created_at where processed_at is null;

comment on table public.stripe_events is
  'Stripe webhook event ledger. processed_at set = handled; NULL = claim in progress (expires after 10 minutes).';
