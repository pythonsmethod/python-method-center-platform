alter type public.document_intake_status add value if not exists 'processing';
alter type public.document_intake_status add value if not exists 'needs_reupload';
alter type public.document_intake_status add value if not exists 'failed';

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema if not exists private;

create table if not exists public.document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.uploaded_documents(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'needs_reupload', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  client_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_processing_jobs_next_idx
  on public.document_processing_jobs (status, available_at, created_at);
alter table public.document_processing_jobs enable row level security;
revoke all on public.document_processing_jobs from anon, authenticated;

create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.uploaded_documents(id) on delete cascade,
  case_id uuid not null references public.client_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_fingerprint text not null,
  agreed_values jsonb not null default '[]'::jsonb,
  disputed_values jsonb not null default '[]'::jsonb,
  first_reading jsonb not null default '[]'::jsonb,
  second_reading jsonb not null default '[]'::jsonb,
  extracted_at timestamptz not null default now(),
  constraint document_extractions_arrays check (
    jsonb_typeof(agreed_values) = 'array'
    and jsonb_typeof(disputed_values) = 'array'
    and jsonb_typeof(first_reading) = 'array'
    and jsonb_typeof(second_reading) = 'array'
  )
);

create index if not exists document_extractions_case_idx
  on public.document_extractions (case_id, extracted_at);
alter table public.document_extractions enable row level security;
revoke all on public.document_extractions from anon, authenticated;

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
  where status = 'processing' and locked_at < now() - interval '10 minutes';

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

revoke all on function public.claim_document_processing_job() from public, anon, authenticated;
grant execute on function public.claim_document_processing_job() to service_role;

comment on table public.document_processing_jobs is
  'Service-only retryable work queue for reading each uploaded medical document independently.';
comment on table public.document_extractions is
  'Service-only double-read transcription results. Every value remains traceable to one source document.';

insert into public.document_processing_jobs (document_id, case_id, profile_id)
select id, case_id, profile_id from public.uploaded_documents
where archived_at is null
on conflict (document_id) do nothing;

update public.uploaded_documents
set document_status = 'queued'
where archived_at is null;

create or replace function private.invoke_document_processing_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  worker_key text;
begin
  select decrypted_secret into worker_url
  from vault.decrypted_secrets
  where name = 'document_processing_worker_url';

  select decrypted_secret into worker_key
  from vault.decrypted_secrets
  where name = 'document_processing_worker_key';

  if worker_url is null or worker_key is null then
    return;
  end if;

  perform net.http_get(
    url := worker_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_key),
    timeout_milliseconds := 300000
  );
end;
$$;

revoke all on function private.invoke_document_processing_worker() from public, anon, authenticated;

select cron.schedule(
  'process-uploaded-medical-documents',
  '* * * * *',
  'select private.invoke_document_processing_worker();'
);
