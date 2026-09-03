-- Phase 2.7 staging schema only. Do not apply to production without a separate decision.
create table if not exists public.verification_policy_versions (
  version text primary key,
  policy_document jsonb not null check (jsonb_typeof(policy_document) = 'object'),
  shadow_only boolean not null default true check (shadow_only),
  created_at timestamptz not null default now()
);

create table if not exists public.clinical_trust_decisions (
  id uuid primary key default gen_random_uuid(),
  fact_id text not null,
  evidence_class text not null,
  input_verification_state text not null check (input_verification_state in ('VERIFIED','NEEDS_REVIEW','REJECTED')),
  confidence_dimensions jsonb not null check (jsonb_typeof(confidence_dimensions) = 'object'),
  provenance_level text not null check (provenance_level in ('P0','P1','P2','P3','P4')),
  deterministic_checks jsonb not null check (jsonb_typeof(deterministic_checks) = 'array'),
  cross_check_results jsonb not null check (jsonb_typeof(cross_check_results) = 'array'),
  failed_gates jsonb not null check (jsonb_typeof(failed_gates) = 'array'),
  final_verification_state text not null check (final_verification_state in ('VERIFIED','NEEDS_REVIEW','REJECTED','SOURCE_ONLY')),
  reason_codes jsonb not null check (jsonb_typeof(reason_codes) = 'array'),
  policy_version text not null references public.verification_policy_versions(version),
  shadow_decision boolean not null default true check (shadow_decision),
  would_auto_verify boolean not null,
  evaluated_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (fact_id, policy_version, evaluated_at)
);

create table if not exists public.clinical_human_review_calibration (
  id uuid primary key default gen_random_uuid(),
  fact_id text not null,
  reviewer_id text not null,
  reviewer_role text not null,
  reviewed_at timestamptz not null,
  source_confirmed_value jsonb,
  review_outcome text not null check (review_outcome in ('CONFIRMED','CORRECTED','REJECTED','UNRESOLVED')),
  disagreement_reason text,
  adjudicated boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists clinical_trust_decisions_fact_idx on public.clinical_trust_decisions (fact_id, evaluated_at desc);
create index if not exists clinical_trust_decisions_shadow_idx on public.clinical_trust_decisions (policy_version, would_auto_verify);
create index if not exists clinical_human_review_fact_idx on public.clinical_human_review_calibration (fact_id, reviewed_at desc);

alter table public.verification_policy_versions enable row level security;
alter table public.clinical_trust_decisions enable row level security;
alter table public.clinical_human_review_calibration enable row level security;
revoke all on public.verification_policy_versions, public.clinical_trust_decisions, public.clinical_human_review_calibration from anon, authenticated;

create policy "verification_policy_versions_service_only" on public.verification_policy_versions for all to anon, authenticated using (false) with check (false);
create policy "clinical_trust_decisions_service_only" on public.clinical_trust_decisions for all to anon, authenticated using (false) with check (false);
create policy "clinical_human_review_service_only" on public.clinical_human_review_calibration for all to anon, authenticated using (false) with check (false);

create function public.prevent_clinical_trust_history_mutation() returns trigger
language plpgsql
set search_path = ''
as $$ begin raise exception 'Clinical trust history is append-only'; end $$;
revoke all on function public.prevent_clinical_trust_history_mutation() from public, anon, authenticated;
create trigger clinical_trust_decisions_append_only before update or delete on public.clinical_trust_decisions for each row execute function public.prevent_clinical_trust_history_mutation();
create trigger verification_policy_versions_append_only before update or delete on public.verification_policy_versions for each row execute function public.prevent_clinical_trust_history_mutation();

comment on table public.clinical_trust_decisions is 'Append-only Phase 2.7 shadow trust decisions; does not mutate source or canonical facts.';
