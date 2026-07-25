-- Referral tokens: a client earns tokens for people they bring in and
-- spends them as a discount on any purchase.
--
-- Design: an append-only ledger, never a mutable balance column. The
-- balance is always SUM(amount) — it cannot drift, and every change is
-- auditable.

create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Positive = earned, negative = spent. 1 token = 1 USD of discount.
  amount integer not null check (amount <> 0),
  reason text not null,
  -- Source event this transaction is derived from (payment id, referral id,
  -- Stripe promotion code). Used for idempotency.
  reference_id text,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.token_transactions is
  'Append-only ledger of referral tokens. Balance = sum(amount). 1 token = 1 USD of discount.';

create index if not exists token_transactions_profile_idx
  on public.token_transactions (profile_id, created_at desc);

-- The same source event can never be rewarded twice (webhook redelivery,
-- retried action).
create unique index if not exists token_transactions_reason_reference_key
  on public.token_transactions (profile_id, reason, reference_id)
  where reference_id is not null;

alter table public.token_transactions enable row level security;

-- Clients read their own ledger; all writes go through the service role.
create policy "token_transactions_select_own"
on public.token_transactions for select
to authenticated
using (profile_id = auth.uid());
