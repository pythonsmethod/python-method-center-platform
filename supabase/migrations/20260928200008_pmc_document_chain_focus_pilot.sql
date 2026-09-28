-- An empty allowlist keeps the existing live parser for every case. Enrol
-- only explicitly identified focus-group Cases after the deployment check.
create table if not exists public.pmc_document_chain_pilot_cases (
  case_id uuid primary key references public.client_cases(id) on delete cascade,
  enabled boolean not null default false,
  added_at timestamptz not null default now(),
  enabled_at timestamptz
);
alter table public.pmc_document_chain_pilot_cases enable row level security;
revoke all on public.pmc_document_chain_pilot_cases from public, anon, authenticated;
grant select, insert, update, delete on public.pmc_document_chain_pilot_cases to service_role;

create or replace function public.pmc_check_pilot_enrollment() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare was_enabled boolean := false;
begin
  if tg_op='UPDATE' then was_enabled := old.enabled; end if;
  if new.enabled and not was_enabled then
    -- Wait for an existing claim to finish before switching parsers.
    perform 1 from public.document_processing_jobs where case_id=new.case_id for update;
    if exists(select 1 from public.document_processing_jobs
      where case_id=new.case_id and status in ('processing','pre_extracting')) then
      raise exception 'PILOT_CASE_HAS_ACTIVE_READER';
    end if;
    new.enabled_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists pmc_pilot_enrollment_guard on public.pmc_document_chain_pilot_cases;
create trigger pmc_pilot_enrollment_guard before insert or update on public.pmc_document_chain_pilot_cases
for each row execute function public.pmc_check_pilot_enrollment();
revoke all on function public.pmc_check_pilot_enrollment() from public,anon,authenticated;

-- Keep the old global worker safe during and after the site rollout. It
-- cannot take a pilot Case, including a paused one. Both callers are
-- service-only; the transaction claims one queue row with SKIP LOCKED.
create or replace function public.claim_legacy_document_job(
  p_profile_id uuid default null, p_case_id uuid default null
) returns setof public.document_processing_jobs
language plpgsql security invoker set search_path = public, pg_temp as $$
declare chosen uuid;
begin
  update public.document_processing_jobs j
  set status='queued', locked_at=null, available_at=now(), updated_at=now(),
      last_error=coalesce(j.last_error,'WORKER_LEASE_EXPIRED')
  where j.status in ('processing','pre_extracting') and j.locked_at<now()-interval '10 minutes'
    and (p_profile_id is null or j.profile_id=p_profile_id)
    and (p_case_id is null or j.case_id=p_case_id)
    and not exists(select 1 from public.pmc_document_chain_pilot_cases p where p.case_id=j.case_id);

  select j.id into chosen from public.document_processing_jobs j
  join public.uploaded_documents d on d.id=j.document_id and d.case_id=j.case_id and d.profile_id=j.profile_id
  where j.status='queued' and j.available_at<=now() and d.archived_at is null
    and (p_profile_id is null or j.profile_id=p_profile_id)
    and (p_case_id is null or j.case_id=p_case_id)
    and not exists(select 1 from public.pmc_document_chain_pilot_cases p where p.case_id=j.case_id)
  order by j.created_at for update of j skip locked limit 1;
  if chosen is null then return; end if;
  return query update public.document_processing_jobs
  set status='processing', attempts=attempts+1, locked_at=clock_timestamp(), updated_at=now()
  where id=chosen returning *;
end; $$;

-- Old deployed code still calls this zero-argument RPC until the new site is
-- live, so its behavior must be restricted in the database as well.
create or replace function public.claim_document_processing_job()
returns setof public.document_processing_jobs
language sql security invoker set search_path = public, pg_temp as $$
  select * from public.claim_legacy_document_job(null,null);
$$;

create or replace function public.claim_pmc_document_job(
  p_profile_id uuid default null, p_case_id uuid default null
) returns setof public.document_processing_jobs
language plpgsql security invoker set search_path = public, pg_temp as $$
declare chosen uuid;
begin
  update public.document_processing_jobs j
  set status='queued', locked_at=null, available_at=now(), updated_at=now(), last_error='WORKER_LEASE_EXPIRED'
  where j.status in ('processing','pre_extracting') and j.locked_at<now()-interval '10 minutes'
    and (p_profile_id is null or j.profile_id=p_profile_id)
    and (p_case_id is null or j.case_id=p_case_id)
    and exists(select 1 from public.pmc_document_chain_pilot_cases p where p.case_id=j.case_id and p.enabled);

  select j.id into chosen from public.document_processing_jobs j
  join public.uploaded_documents d on d.id=j.document_id and d.case_id=j.case_id and d.profile_id=j.profile_id
  join public.pmc_document_chain_pilot_cases p on p.case_id=j.case_id and p.enabled
  where j.status='queued' and j.available_at<=now() and d.archived_at is null
    and (p_profile_id is null or j.profile_id=p_profile_id)
    and (p_case_id is null or j.case_id=p_case_id)
  order by j.created_at for update of j skip locked limit 1;
  if chosen is null then return; end if;
  return query update public.document_processing_jobs
  set status='processing', attempts=attempts+1, locked_at=clock_timestamp(), updated_at=now()
  where id=chosen returning *;
end; $$;

revoke all on function public.claim_legacy_document_job(uuid,uuid),
  public.claim_document_processing_job(),public.claim_pmc_document_job(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.claim_legacy_document_job(uuid,uuid),
  public.claim_document_processing_job(),public.claim_pmc_document_job(uuid,uuid) to service_role;
