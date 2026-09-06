create table if not exists public.payment_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_session_id text unique,
  processor_reference text unique,
  event_type text,
  livemode boolean,
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  currency text,
  candidate_product public.payment_product,
  candidate_profile_id uuid references public.profiles(id) on delete set null,
  candidate_case_id uuid references public.client_cases(id) on delete set null,
  status text not null check (status in (
    'RESOLVED_AUTOMATICALLY','ALREADY_RECORDED','TEST_EVENT','DUPLICATE_EVENT',
    'REFUNDED','REQUIRES_OWNER_IDENTIFICATION','REQUIRES_CLIENT_EMAIL_CONFIRMATION',
    'INVALID_OR_UNSUPPORTED_PRODUCT','OTHER_BLOCKED_WITH_EXACT_REASON'
  )),
  reason text not null,
  next_action text not null,
  resolution_method text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  audit_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_reconciliation_status_idx
  on public.payment_reconciliation_items(status,created_at);
create index if not exists payment_reconciliation_profile_idx
  on public.payment_reconciliation_items(candidate_profile_id)
  where candidate_profile_id is not null;

alter table public.payment_reconciliation_items enable row level security;
revoke all on public.payment_reconciliation_items from anon,authenticated;

comment on table public.payment_reconciliation_items is
  'Server-only Stripe reconciliation queue. No client policies by design; identity resolution requires authorized staff and never exposes processor data to clients.';

-- Historical alerts contain only the Stripe event id in their dedupe key;
-- the detailed Stripe objects are not retained in Postgres. Until an
-- authorized existing Stripe merchant account supplies those objects, the
-- honest terminal status is an explicit owner-identification gate.
insert into public.payment_reconciliation_items(
  stripe_event_id,status,reason,next_action,audit_metadata
)
select
  substring(ne.dedupe_key from length('payment_unmatched:') + 1),
  'REQUIRES_OWNER_IDENTIFICATION',
  'Postgres retains the event id and delivery result but not the Stripe Checkout object needed for strict identity matching.',
  'Authorized owner opens this event in the existing Stripe merchant account; the server-side reconciliation action then applies client_reference_id, metadata, or one exact email match.',
  jsonb_build_object(
    'source_notification_id',ne.id,
    'notification_status',ne.status,
    'imported_by','operational_core_closure_2026_09_03'
  )
from public.notification_events ne
where ne.kind='payment' and ne.dedupe_key like 'payment_unmatched:%'
on conflict(stripe_event_id) do nothing;
