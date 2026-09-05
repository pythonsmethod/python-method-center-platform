-- Phase 2.5B only. Do not apply to production without a separate approval.
create table if not exists public.clinical_document_metadata (
  source_document_id uuid primary key references public.uploaded_documents(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  document_type text not null check (document_type in ('LAB','RADIOLOGY','PATHOLOGY','PROCEDURE','CLINICAL_NOTE','REPORT','OTHER','UNKNOWN')),
  classification_confidence double precision,
  classification_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(classification_reasons) = 'array'),
  layout_family text,
  language text,
  version_kind text not null default 'UNKNOWN' check (version_kind in ('ORIGINAL','ADDENDUM','CORRECTED','UNKNOWN')),
  page_count integer not null check (page_count > 0),
  has_tables boolean not null default false,
  repeated_identity_header boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_evidence_items (
  id uuid primary key default gen_random_uuid(),
  evidence_fingerprint text not null,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  source_document_id uuid not null references public.uploaded_documents(id) on delete cascade,
  document_type text not null,
  evidence_type text not null,
  original_text text not null,
  normalized_text text,
  numeric_value numeric,
  coded_value text,
  laterality text check (laterality is null or laterality in ('LEFT','RIGHT','BILATERAL')),
  anatomical_site text,
  event_date date,
  date_kind text check (date_kind is null or date_kind in ('EXAM','PROCEDURE','COLLECTED','RECEIVED','FINAL','ADDENDUM','COMPARISON','PRINTED')),
  source_page integer not null check (source_page > 0),
  source_coordinates jsonb,
  extraction_confidence double precision,
  verification_status text not null check (verification_status in ('VERIFIED','NEEDS_REVIEW','REJECTED')),
  normalization_status text not null check (normalization_status in ('NORMALIZED','UNRESOLVED')),
  extraction_provider_version text not null,
  parser_version text not null,
  canonical_lab_fact_id uuid references public.canonical_lab_facts(id) on delete set null,
  case_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_document_id, evidence_fingerprint, extraction_provider_version, parser_version)
);

create index if not exists clinical_evidence_case_timeline_idx on public.clinical_evidence_items (case_id, event_date, source_page);
create index if not exists clinical_evidence_review_idx on public.clinical_evidence_items (verification_status) where verification_status = 'NEEDS_REVIEW';

alter table public.clinical_document_metadata enable row level security;
alter table public.clinical_evidence_items enable row level security;
revoke all on public.clinical_document_metadata, public.clinical_evidence_items from anon, authenticated;

create policy "clinical_document_metadata_service_only" on public.clinical_document_metadata for all to anon, authenticated using (false) with check (false);
create policy "clinical_evidence_items_service_only" on public.clinical_evidence_items for all to anon, authenticated using (false) with check (false);

comment on table public.clinical_evidence_items is 'Source-grounded non-lab clinical evidence. This table is not medical interpretation.';
