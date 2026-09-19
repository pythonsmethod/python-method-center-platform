-- Monthly personal support and recurring billing.
-- Legacy support_5_weeks / support_15_weeks values stay intact so historical
-- payments and service periods remain readable. New sales use personal_support.

alter type public.payment_product add value if not exists 'personal_support';

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text,
  status text not null default 'active'
    check (status in ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'unpaid', 'incomplete')),
  initial_months integer not null default 1 check (initial_months between 1 and 12),
  renewal_days integer not null default 30 check (renewal_days = 30),
  current_period_end timestamptz,
  last_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.billing_subscriptions is
  'Stripe recurring billing identity for Personal Support. Stores no card data. Initial prepaid months are kept separately from later 30-day renewals.';

create index if not exists billing_subscriptions_profile_idx
  on public.billing_subscriptions (profile_id, created_at desc);

create index if not exists billing_subscriptions_case_idx
  on public.billing_subscriptions (case_id, created_at desc);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "billing_subscriptions_select_own"
  on public.billing_subscriptions;

create policy "billing_subscriptions_select_own"
on public.billing_subscriptions for select
to authenticated
using (profile_id = auth.uid());

drop trigger if exists set_billing_subscriptions_updated_at
  on public.billing_subscriptions;

create trigger set_billing_subscriptions_updated_at
before update on public.billing_subscriptions
for each row execute function public.set_updated_at();
