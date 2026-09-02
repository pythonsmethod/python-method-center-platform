-- The analysis pipeline lands in the schema: the header pass, whose
-- document a file is, duplicates and versions, and the run that ties
-- modules 1, 3 and 4 together with the five version fields.
--
-- No second state machine. The specification's new states are states of a
-- DOCUMENT or of a RUN, not of the case: a case in active support that
-- receives a new file must not fall back to "pre-extracting". So the
-- document queue, which already is the document's state machine, gains two
-- states, and "unit unresolved" is a fact recorded on the run.

-- 1. The document's own states.
alter type public.document_intake_status add value if not exists 'identity_mismatch';

alter table public.document_processing_jobs
  drop constraint if exists document_processing_jobs_status_check;
alter table public.document_processing_jobs
  add constraint document_processing_jobs_status_check
  check (status in ('queued', 'pre_extracting', 'processing', 'ready', 'identity_mismatch', 'needs_reupload', 'failed'));

-- 2. What the header pass found, kept on the document. The header is read
-- before the full transcription and may end the job before one exists, so
-- it cannot live on the extraction row.
alter table public.uploaded_documents
  add column if not exists header jsonb,
  add column if not exists identity_status text not null default 'unchecked'
    check (identity_status in ('unchecked', 'match', 'mismatch', 'unknown')),
  add column if not exists identity_reasons text[] not null default '{}',
  add column if not exists duplicate_of_document_id uuid references public.uploaded_documents(id) on delete set null,
  add column if not exists version_of_document_id uuid references public.uploaded_documents(id) on delete set null;

comment on column public.uploaded_documents.header is
  'The cheap first pass: name, date of birth, laboratory, accession, dates, language — as printed, plus ISO dates where readable. Values are never here.';
comment on column public.uploaded_documents.identity_status is
  'Whether the header names this person. "mismatch" stops the document before full reading; "unknown" is not a match — it goes to a person.';
comment on column public.uploaded_documents.version_of_document_id is
  'Set when this file is a corrected issue of an earlier report (same laboratory order). The earlier report''s values leave the timeline so a correction is never drawn as a change in the person.';

-- 3. The run. One row per analysis pass over a case, with everything that
-- produced it — the five fields of section 6.3, each required and each
-- non-empty, as a constraint rather than a convention.
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- The document whose arrival caused this run.
  document_id uuid references public.uploaded_documents(id) on delete set null,

  extraction_model_version text not null check (char_length(trim(extraction_model_version)) > 0),
  analysis_engine_version text not null check (char_length(trim(analysis_engine_version)) > 0),
  prompt_version text not null check (char_length(trim(prompt_version)) > 0),
  rule_set_version text not null check (char_length(trim(rule_set_version)) > 0),
  threshold_set_version text not null check (char_length(trim(threshold_set_version)) > 0),

  -- The specification's UNIT_UNRESOLVED, as a fact about the run.
  unit_unresolved boolean not null default false,
  human_review_count integer not null default 0 check (human_review_count >= 0),
  blocked jsonb not null default '[]'::jsonb,
  requests text[] not null default '{}',
  trends jsonb not null default '{}'::jsonb,
  excluded jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),

  constraint analysis_runs_shapes check (
    jsonb_typeof(blocked) = 'array'
    and jsonb_typeof(trends) = 'object'
    and jsonb_typeof(excluded) = 'array'
  )
);

comment on table public.analysis_runs is
  'One pass of the analysis pipeline over a case. Carries the five version fields every interpretation must be traceable to. Service-only.';

create index if not exists analysis_runs_case_idx
  on public.analysis_runs (case_id, created_at desc);

alter table public.analysis_runs enable row level security;
revoke all on public.analysis_runs from anon, authenticated;

-- 4. Every stored value knows which run wrote it, and every interpretation
-- knows which run it read.
alter table public.lab_values
  add column if not exists analysis_run_id uuid references public.analysis_runs(id) on delete set null;

create index if not exists lab_values_run_idx on public.lab_values (analysis_run_id);

alter table public.case_ai_reviews
  add column if not exists analysis_run_id uuid references public.analysis_runs(id) on delete set null;

comment on column public.case_ai_reviews.analysis_run_id is
  'The run this reading was made from. Nullable only for readings made before the pipeline existed; the code refuses to write a new one without it.';

-- 5. The queue's lease reclaim must know the new in-flight state, or a
-- worker that died reading a header would leave its job stuck forever.
create or replace function public.claim_document_processing_job()
returns setof public.document_processing_jobs
language plpgsql
security definer
set search_path = public
as $$
declare claimed_id uuid;
begin
  update public.document_processing_jobs
  set status = 'queued', available_at = now(), locked_at = null,
      last_error = coalesce(last_error, 'Worker lease expired'), updated_at = now()
  where status in ('processing', 'pre_extracting') and locked_at < now() - interval '10 minutes';

  select id into claimed_id
  from public.document_processing_jobs
  where status = 'queued' and available_at <= now()
  order by created_at
  for update skip locked
  limit 1;

  if claimed_id is null then return; end if;

  return query
  update public.document_processing_jobs
  set status = 'processing', attempts = attempts + 1, locked_at = now(), updated_at = now()
  where id = claimed_id
  returning *;
end;
$$;
