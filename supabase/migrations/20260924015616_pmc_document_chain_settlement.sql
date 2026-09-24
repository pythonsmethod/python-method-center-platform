-- The deployed document state uses an enum; retain its type boundary.
create or replace function public.settle_pmc_document_job(p_job_id uuid,p_lease timestamptz,p_status text,p_error text,p_available_at timestamptz,p_message text) returns text
language plpgsql security invoker set search_path=public,pg_temp as $$
declare job public.document_processing_jobs;
begin
 select * into strict job from public.document_processing_jobs where id=p_job_id;
 perform pg_advisory_xact_lock(hashtextextended(job.case_id::text,4924));
 select * into strict job from public.document_processing_jobs where id=p_job_id for update;
 if job.status='ready' and exists(select 1 from public.uploaded_documents d join public.analysis_runs r on r.id=(d.metadata->>'latest_analysis_run_id')::uuid where d.id=job.document_id and d.document_status='ready' and r.document_id=d.id and r.document_snapshot->'source'->>'source_hash'=d.metadata->'processing_source'->>'source_hash') then return 'ready'; end if;
 if job.status not in ('processing','pre_extracting') or job.locked_at is distinct from p_lease then return 'lease_lost'; end if;
 if p_status not in ('queued','identity_mismatch','needs_reupload','failed') then raise exception 'INVALID_JOB_STATE'; end if;
 update public.document_processing_jobs set status=p_status,locked_at=null,last_error=p_error,available_at=p_available_at,updated_at=now() where id=job.id;
 update public.uploaded_documents set document_status=p_status::public.document_intake_status where id=job.document_id;
 if p_message is not null and job.client_notified_at is null then
  insert into public.case_messages(case_id,profile_id,sender_id,sender_role,body) values(job.case_id,job.profile_id,null,'system',p_message);
  update public.document_processing_jobs set client_notified_at=now() where id=job.id;
 end if;
 return p_status;
end; $$;
revoke all on function public.settle_pmc_document_job(uuid,timestamptz,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.settle_pmc_document_job(uuid,timestamptz,text,text,timestamptz,text) to service_role;
