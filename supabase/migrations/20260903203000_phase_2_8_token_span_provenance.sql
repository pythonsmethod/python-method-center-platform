-- Phase 2.8 repository-only schema. Do not apply to production until the PHI gate is approved.
-- Provenance augments immutable facts; it never changes their source or verification state.

alter table public.canonical_lab_facts
  add column if not exists token_provenance jsonb;

alter table public.clinical_evidence_items
  add column if not exists token_provenance jsonb;

alter table public.canonical_lab_facts
  add constraint canonical_lab_facts_token_provenance_object
  check (token_provenance is null or jsonb_typeof(token_provenance) = 'object');

alter table public.clinical_evidence_items
  add constraint clinical_evidence_items_token_provenance_object
  check (token_provenance is null or jsonb_typeof(token_provenance) = 'object');

comment on column public.canonical_lab_facts.token_provenance is
  'Provider-neutral P3/P4 exact token/span provenance. Nullable means no exact provenance claim.';

comment on column public.clinical_evidence_items.token_provenance is
  'Provider-neutral P3/P4 exact token/span provenance. Nullable means no exact provenance claim.';
