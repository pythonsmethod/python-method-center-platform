-- Phase 2: provider-neutral, service-only canonical laboratory facts.
-- This extends uploaded_documents/client_cases; it does not create a second Case model
-- and does not connect the table to the production document worker yet.

create table if not exists public.canonical_fact_extractions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.uploaded_documents(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_fingerprint text not null,
  extraction_provider text not null,
  extraction_version text not null,
  parser_version text not null,
  raw_response_location text,
  counters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_document_id, source_fingerprint, extraction_provider, extraction_version, parser_version),
  constraint canonical_fact_extractions_counters_object check (jsonb_typeof(counters) = 'object')
);

create table if not exists public.canonical_lab_facts (
  id uuid primary key,
  extraction_id uuid not null references public.canonical_fact_extractions(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_document_id uuid not null references public.uploaded_documents(id) on delete cascade,
  fact_fingerprint text not null,
  source_page integer not null check (source_page > 0),
  source_coordinates jsonb,
  original_test_name text not null,
  normalized_test_name text,
  standard_code text,
  value_original text not null,
  value_numeric numeric,
  value_comparator text check (value_comparator is null or value_comparator in ('<', '>', '<=', '>=')),
  unit_original text,
  unit_normalized text,
  reference_original text,
  reference_low numeric,
  reference_high numeric,
  lab_flag_original text,
  order_date date,
  collection_date date,
  received_date date,
  result_date date,
  report_date date,
  laboratory_name text,
  method text,
  extraction_confidence double precision check (extraction_confidence is null or extraction_confidence between 0 and 1),
  verification_status text not null check (verification_status in ('VERIFIED', 'NEEDS_REVIEW', 'REJECTED')),
  verification_issues jsonb not null default '[]'::jsonb,
  normalization_status text not null check (normalization_status in ('NORMALIZED', 'UNRESOLVED')),
  comparability_status text not null check (comparability_status in ('HIGH', 'MODERATE', 'LIMITED', 'NOT_COMPARABLE')),
  extraction_provider text not null,
  extraction_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (extraction_id, fact_fingerprint),
  constraint canonical_lab_facts_coordinates_object check (source_coordinates is null or jsonb_typeof(source_coordinates) = 'object'),
  constraint canonical_lab_facts_issues_array check (jsonb_typeof(verification_issues) = 'array'),
  constraint canonical_lab_facts_reference_order check (reference_low is null or reference_high is null or reference_low <= reference_high)
);

create index if not exists canonical_fact_extractions_document_idx
  on public.canonical_fact_extractions (source_document_id, created_at desc);
create index if not exists canonical_lab_facts_case_idx
  on public.canonical_lab_facts (case_id, collection_date, source_page);
create index if not exists canonical_lab_facts_review_idx
  on public.canonical_lab_facts (verification_status, created_at)
  where verification_status <> 'VERIFIED';

create trigger set_canonical_fact_extractions_updated_at
before update on public.canonical_fact_extractions
for each row execute function public.set_updated_at();

create trigger set_canonical_lab_facts_updated_at
before update on public.canonical_lab_facts
for each row execute function public.set_updated_at();

alter table public.canonical_fact_extractions enable row level security;
alter table public.canonical_lab_facts enable row level security;
revoke all on public.canonical_fact_extractions from anon, authenticated;
revoke all on public.canonical_lab_facts from anon, authenticated;

create policy "canonical_fact_extractions_service_only"
  on public.canonical_fact_extractions for all to anon, authenticated
  using (false) with check (false);
create policy "canonical_lab_facts_service_only"
  on public.canonical_lab_facts for all to anon, authenticated
  using (false) with check (false);

comment on table public.canonical_fact_extractions is
  'Versioned, idempotent extraction runs for one immutable uploaded document. Service-only until the PHI production gate is approved.';
comment on table public.canonical_lab_facts is
  'Source-preserving canonical laboratory facts with verification, normalization and visual provenance. Contains no medical interpretation.';
