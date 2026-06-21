-- P0-002: Core database schema foundation for the Python Method platform.
-- This migration creates structure only. It does not connect a Supabase project,
-- implement medical logic, AI decisions, Stripe, or production-grade access roles.

create extension if not exists pgcrypto;

create type public.actor_role as enum (
  'client',
  'karen',
  'support',
  'admin',
  'ai',
  'system'
);

create type public.profile_status as enum (
  'registered',
  'active',
  'suspended',
  'closed'
);

create type public.care_direction as enum (
  'recovery',
  'rehabilitation',
  'preservation',
  'not_set'
);

create type public.case_status as enum (
  'created',
  'awaiting_onboarding',
  'ready_for_review',
  'in_review',
  'active_support',
  'inactive_support',
  'completed',
  'archived'
);

create type public.case_urgency as enum (
  'normal',
  'elevated',
  'critical'
);

create type public.onboarding_status as enum (
  'draft',
  'submitted',
  'needs_more_information',
  'accepted'
);

create type public.document_type as enum (
  'analysis',
  'imaging',
  'report',
  'discharge_summary',
  'operation_protocol',
  'other'
);

create type public.document_status as enum (
  'uploaded',
  'processing',
  'accepted',
  'needs_reupload',
  'archived'
);

create type public.payment_product as enum (
  'preliminary_assessment',
  'support_5_weeks',
  'support_15_weeks'
);

create type public.payment_status as enum (
  'not_required',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);

create type public.service_period_status as enum (
  'scheduled',
  'active',
  'completed',
  'cancelled'
);

create type public.lifecycle_event_type as enum (
  'case_created',
  'onboarding_submitted',
  'status_changed',
  'payment_recorded',
  'service_period_started',
  'service_period_completed',
  'support_requested',
  'escalation_created',
  'consent_recorded',
  'admin_note_added'
);

create type public.support_request_category as enum (
  'navigation',
  'technical',
  'payment',
  'upload',
  'case_question',
  'other'
);

create type public.support_request_status as enum (
  'open',
  'in_progress',
  'waiting_on_client',
  'escalated_to_karen',
  'resolved',
  'closed'
);

create type public.escalation_category as enum (
  'physical_medical',
  'psychological_crisis',
  'technical_abuse',
  'other'
);

create type public.escalation_status as enum (
  'open',
  'notified',
  'acknowledged',
  'resolved',
  'closed'
);

create type public.escalation_routing_target as enum (
  'karen',
  'support',
  'admin'
);

create type public.consent_type as enum (
  'offer_acceptance',
  'privacy',
  'data_processing',
  'document_processing',
  'ai_processing',
  'case_history'
);

create type public.consent_status as enum (
  'accepted',
  'revoked',
  'expired'
);

create type public.admin_note_visibility as enum (
  'admin_only',
  'karen_and_admin',
  'support_and_admin'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  locale text not null default 'en',
  role public.actor_role not null default 'client',
  status public.profile_status not null default 'registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Auth-linked user profile. Stores identity and access metadata only; raw credentials stay in Supabase Auth.';

create table public.client_cases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_number text unique,
  status public.case_status not null default 'created',
  urgency public.case_urgency not null default 'normal',
  direction public.care_direction not null default 'not_set',
  title text,
  summary text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_cases_one_active_case_per_profile unique (profile_id)
);

comment on table public.client_cases is
  'Single continuous client case. Karen owns durable case decisions; AI/System do not set official urgency or status.';

create table public.onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  status public.onboarding_status not null default 'draft',
  submitted_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.onboarding_submissions is
  'Structured onboarding intake payload for preparing a case before review. No medical decision logic is stored here.';

create table public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  onboarding_submission_id uuid references public.onboarding_submissions(id) on delete set null,
  document_type public.document_type not null default 'other',
  status public.document_status not null default 'uploaded',
  storage_path text not null,
  original_filename text,
  original_language text,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.uploaded_documents is
  'Client-uploaded document metadata and storage references. Document content stays in storage; this table records technical metadata.';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  product public.payment_product not null,
  status public.payment_status not null default 'pending',
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'USD',
  processor_reference text,
  offer_version text,
  paid_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payments is
  'Payment transaction records. No card or bank data is stored; processor references are external IDs only.';

create table public.service_periods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  product public.payment_product not null,
  status public.service_period_status not null default 'scheduled',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_period_dates_order check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

comment on table public.service_periods is
  'Bounded paid support periods attached to a continuous case and optionally linked to a payment.';

create table public.case_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  event_type public.lifecycle_event_type not null,
  from_status public.case_status,
  to_status public.case_status,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.actor_role not null default 'system',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.case_lifecycle_events is
  'Append-style case history events for status, onboarding, payment, support, escalation, and consent milestones.';

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  category public.support_request_category not null default 'other',
  status public.support_request_status not null default 'open',
  subject text not null,
  body text,
  assigned_role public.actor_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.support_requests is
  'Client support and routing requests. Support handles technical/organizational scope; case decisions remain outside this table.';

create table public.escalation_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  support_request_id uuid references public.support_requests(id) on delete set null,
  category public.escalation_category not null,
  routing_target public.escalation_routing_target not null,
  status public.escalation_status not null default 'open',
  requires_immediate_review boolean not null default false,
  signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.escalation_events is
  'Red-flag/escalation event records. These do not change durable case urgency or status; Karen owns those decisions.';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  case_id uuid references public.client_cases(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.actor_role not null default 'system',
  action text not null,
  entity_table text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Audit trail for consent, access-sensitive actions, lifecycle changes, payments, support actions, and escalations.';

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  consent_type public.consent_type not null,
  status public.consent_status not null default 'accepted',
  version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_revoked_at_required check (
    status <> 'revoked' or revoked_at is not null
  )
);

comment on table public.consent_records is
  'Explicit consent records for offer acceptance, privacy, data processing, document processing, AI processing, and case history.';

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  case_id uuid references public.client_cases(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  visibility public.admin_note_visibility not null default 'admin_only',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_notes is
  'Internal operational notes for admin/support/Karen workspaces. These are not client-facing records.';

create index profiles_status_idx on public.profiles (status);
create index client_cases_profile_id_idx on public.client_cases (profile_id);
create index onboarding_submissions_case_id_idx on public.onboarding_submissions (case_id);
create index uploaded_documents_case_id_idx on public.uploaded_documents (case_id);
create index payments_profile_id_idx on public.payments (profile_id);
create index payments_case_id_idx on public.payments (case_id);
create index service_periods_case_id_idx on public.service_periods (case_id);
create index case_lifecycle_events_case_id_idx on public.case_lifecycle_events (case_id);
create index support_requests_profile_id_idx on public.support_requests (profile_id);
create index support_requests_case_id_idx on public.support_requests (case_id);
create index escalation_events_case_id_idx on public.escalation_events (case_id);
create index audit_logs_profile_id_idx on public.audit_logs (profile_id);
create index audit_logs_case_id_idx on public.audit_logs (case_id);
create index consent_records_profile_id_idx on public.consent_records (profile_id);
create index admin_notes_case_id_idx on public.admin_notes (case_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_client_cases_updated_at
before update on public.client_cases
for each row execute function public.set_updated_at();

create trigger set_onboarding_submissions_updated_at
before update on public.onboarding_submissions
for each row execute function public.set_updated_at();

create trigger set_uploaded_documents_updated_at
before update on public.uploaded_documents
for each row execute function public.set_updated_at();

create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger set_service_periods_updated_at
before update on public.service_periods
for each row execute function public.set_updated_at();

create trigger set_case_lifecycle_events_updated_at
before update on public.case_lifecycle_events
for each row execute function public.set_updated_at();

create trigger set_support_requests_updated_at
before update on public.support_requests
for each row execute function public.set_updated_at();

create trigger set_escalation_events_updated_at
before update on public.escalation_events
for each row execute function public.set_updated_at();

create trigger set_audit_logs_updated_at
before update on public.audit_logs
for each row execute function public.set_updated_at();

create trigger set_consent_records_updated_at
before update on public.consent_records
for each row execute function public.set_updated_at();

create trigger set_admin_notes_updated_at
before update on public.admin_notes
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.client_cases enable row level security;
alter table public.onboarding_submissions enable row level security;
alter table public.uploaded_documents enable row level security;
alter table public.payments enable row level security;
alter table public.service_periods enable row level security;
alter table public.case_lifecycle_events enable row level security;
alter table public.support_requests enable row level security;
alter table public.escalation_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.consent_records enable row level security;
alter table public.admin_notes enable row level security;

-- Placeholder RLS policies. They are intentionally client-self scoped until
-- production role claims and service-role workflows are implemented.

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "client_cases_select_own"
on public.client_cases for select
to authenticated
using (profile_id = auth.uid());

create policy "client_cases_insert_own"
on public.client_cases for insert
to authenticated
with check (profile_id = auth.uid());

create policy "onboarding_submissions_select_own"
on public.onboarding_submissions for select
to authenticated
using (profile_id = auth.uid());

create policy "onboarding_submissions_insert_own"
on public.onboarding_submissions for insert
to authenticated
with check (profile_id = auth.uid());

create policy "onboarding_submissions_update_own_draft"
on public.onboarding_submissions for update
to authenticated
using (profile_id = auth.uid() and status in ('draft', 'needs_more_information'))
with check (profile_id = auth.uid());

create policy "uploaded_documents_select_own"
on public.uploaded_documents for select
to authenticated
using (profile_id = auth.uid());

create policy "uploaded_documents_insert_own"
on public.uploaded_documents for insert
to authenticated
with check (profile_id = auth.uid());

create policy "uploaded_documents_update_own_metadata"
on public.uploaded_documents for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "payments_select_own"
on public.payments for select
to authenticated
using (profile_id = auth.uid());

create policy "payments_insert_own_placeholder"
on public.payments for insert
to authenticated
with check (profile_id = auth.uid());

create policy "service_periods_select_own"
on public.service_periods for select
to authenticated
using (profile_id = auth.uid());

create policy "case_lifecycle_events_select_own"
on public.case_lifecycle_events for select
to authenticated
using (profile_id = auth.uid());

create policy "support_requests_select_own"
on public.support_requests for select
to authenticated
using (profile_id = auth.uid());

create policy "support_requests_insert_own"
on public.support_requests for insert
to authenticated
with check (profile_id = auth.uid());

create policy "support_requests_update_own_open"
on public.support_requests for update
to authenticated
using (profile_id = auth.uid() and status in ('open', 'waiting_on_client'))
with check (profile_id = auth.uid());

create policy "escalation_events_select_own"
on public.escalation_events for select
to authenticated
using (profile_id = auth.uid());

create policy "escalation_events_insert_own_placeholder"
on public.escalation_events for insert
to authenticated
with check (profile_id = auth.uid());

create policy "audit_logs_select_own"
on public.audit_logs for select
to authenticated
using (profile_id = auth.uid());

create policy "consent_records_select_own"
on public.consent_records for select
to authenticated
using (profile_id = auth.uid());

create policy "consent_records_insert_own"
on public.consent_records for insert
to authenticated
with check (profile_id = auth.uid());

create policy "admin_notes_no_direct_client_access"
on public.admin_notes for select
to authenticated
using (false);
