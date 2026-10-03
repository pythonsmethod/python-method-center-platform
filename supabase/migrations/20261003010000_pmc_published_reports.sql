-- Generated output only. Originals, Cases and the approval/learning ledger remain canonical.
alter table public.case_review_learning_events add column if not exists report_snapshot jsonb;
alter table public.case_review_learning_events add column if not exists report_files jsonb not null default '{}'::jsonb;

create or replace function public.pmc_capture_report_snapshot() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.case_id::text,4924));
 if public.pmc_case_evidence_fingerprint(new.case_id)<>new.documents_fingerprint then raise exception 'STALE_EVIDENCE'; end if;
 new.report_snapshot := jsonb_build_object('version','1','documents',coalesce((
   select jsonb_agg(jsonb_build_object('id',d.id,'name',d.original_filename,'uploadedAt',d.created_at,
     'header',d.header,'sourceHash',r.document_snapshot->'source'->>'source_hash',
     'pageCount',r.document_snapshot->'source'->'page_count') order by d.created_at,d.id)
   from public.uploaded_documents d left join lateral (
     select document_snapshot from public.analysis_runs where document_id=d.id order by created_at desc,id desc limit 1
   ) r on true where d.case_id=new.case_id and d.archived_at is null),'[]'::jsonb));
 return new;
end; $$;
create trigger pmc_report_snapshot before insert on public.case_review_learning_events
 for each row execute function public.pmc_capture_report_snapshot();

create or replace function public.pmc_report_immutable() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if (to_jsonb(new)-'report_files') is distinct from (to_jsonb(old)-'report_files') then raise exception 'APPROVAL_IMMUTABLE'; end if;
 if not new.report_files @> old.report_files then raise exception 'REPORT_IMMUTABLE'; end if;
 return new;
end; $$;
create trigger pmc_report_immutable before update on public.case_review_learning_events
 for each row execute function public.pmc_report_immutable();

create or replace function public.save_pmc_report_file(p_approval uuid,p_locale text,p_file jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare a public.case_review_learning_events;
begin
 if p_locale is null or p_locale not in ('ru','en') or jsonb_typeof(p_file) is distinct from 'object'
   or p_file->>'version' is distinct from '1' or coalesce(p_file->>'sha256','') !~ '^[a-f0-9]{64}$'
   or p_file->>'path' is distinct from p_approval::text||'/'||p_locale||'-v1.pdf'
   or p_file - array['version','path','sha256'] <> '{}'::jsonb then raise exception 'INVALID_REPORT'; end if;
 select * into strict a from public.case_review_learning_events where id=p_approval for update;
 if a.report_snapshot is null or not exists(select 1 from public.case_messages where approved_review_event_id=a.id
   and case_id=a.case_id and body=a.approved_text) then raise exception 'NOT_PUBLISHED'; end if;
 if a.report_files ? p_locale then
   if a.report_files->p_locale<>p_file then raise exception 'REPORT_CONFLICT'; end if;
   return a.report_files->p_locale;
 end if;
 update public.case_review_learning_events set report_files=report_files||jsonb_build_object(p_locale,p_file) where id=a.id;
 return p_file;
end; $$;
revoke all on function public.pmc_capture_report_snapshot(),public.pmc_report_immutable(),public.save_pmc_report_file(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_pmc_report_file(uuid,text,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('case-reports','case-reports',false,5000000,array['application/pdf']) on conflict(id) do nothing;
-- Restrictive policies also deny access if a legacy permissive policy is present.
create policy pmc_reports_server_only on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'case-reports') with check(bucket_id<>'case-reports');
