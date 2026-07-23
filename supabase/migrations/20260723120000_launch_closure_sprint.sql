-- Launch closure sprint: external notifications, Stripe webhook idempotency,
-- guest support requests.

-- 1) Delivery log for external team notifications (Telegram). Rows are
-- written with the service role only; clients have no access.
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  dedupe_key text not null unique,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_events is
  'External notification delivery log (Telegram/email). status: pending | sent | failed | skipped. dedupe_key prevents duplicate sends per source event.';

create index if not exists notification_events_status_idx
  on public.notification_events (status, created_at desc);

alter table public.notification_events enable row level security;

-- 2) Stripe webhook idempotency ledger: one row per processed event id.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

comment on table public.stripe_events is
  'Processed Stripe webhook event ids. Insert-first guarantees each event is handled once even on redelivery.';

alter table public.stripe_events enable row level security;

-- 3) Payments: a processor reference (payment_intent/session id) may be
-- recorded only once — protects against webhook redelivery races.
create unique index if not exists payments_processor_reference_key
  on public.payments (processor_reference)
  where processor_reference is not null;

-- 4) Guest support requests: allow requests without an account and store a
-- reply-to contact for them.
alter table public.support_requests alter column profile_id drop not null;
alter table public.support_requests
  add column if not exists contact_email text;

comment on column public.support_requests.contact_email is
  'Reply-to email for guest (no-account) requests submitted via the public support form.';
