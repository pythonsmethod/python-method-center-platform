-- Existing PMC pipeline only. No new Case/evidence system or provider switch.
alter table public.document_processing_jobs add column if not exists progress jsonb not null default '{}'::jsonb;
alter table public.lab_values add column if not exists value_printed text;
alter table public.lab_values add column if not exists source_anchor jsonb;
alter table public.analysis_runs add column if not exists document_snapshot jsonb;
alter table public.case_messages add column if not exists approved_review_event_id uuid references public.case_review_learning_events(id);
create unique index if not exists case_messages_one_approved_response on public.case_messages(approved_review_event_id) where approved_review_event_id is not null;

create or replace function public.pmc_lock_case_evidence() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(new.case_id, old.case_id)::text, 4924));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
drop trigger if exists pmc_source_write_lock on public.uploaded_documents;
create trigger pmc_source_write_lock before insert or update or delete on public.uploaded_documents for each row execute function public.pmc_lock_case_evidence();
drop trigger if exists pmc_extraction_write_lock on public.document_extractions;
create trigger pmc_extraction_write_lock before insert or update or delete on public.document_extractions for each row execute function public.pmc_lock_case_evidence();
drop trigger if exists pmc_review_write_lock on public.admin_notes;
create trigger pmc_review_write_lock before insert or update or delete on public.admin_notes for each row execute function public.pmc_lock_case_evidence();

create or replace function public.pmc_case_evidence_fingerprint(p_case_id uuid) returns text
language sql stable security invoker set search_path = public, pg_temp as $$
  select 'pmc1:' || md5(coalesce((select string_agg(jsonb_build_array(d.id,d.created_at,d.document_status,d.identity_status,d.identity_review_status,d.duplicate_of_document_id,d.version_of_document_id,d.metadata->'processing_source',e.id,e.extracted_at,e.source_fingerprint,e.agreed_values,e.disputed_values)::text, '|' order by d.id)
  from public.uploaded_documents d left join public.document_extractions e on e.document_id=d.id
  where d.case_id=p_case_id and d.archived_at is null), '') || '::' ||
  coalesce((select string_agg(jsonb_build_array(id,metadata)::text,'|' order by id) from public.admin_notes where case_id=p_case_id and metadata->>'kind'='case_picture_evidence_review'),''));
$$;

create or replace function public.register_pmc_document(p_document jsonb) returns setof public.uploaded_documents
language plpgsql security invoker set search_path = public, pg_temp as $$
declare doc public.uploaded_documents; cid uuid := (p_document->>'case_id')::uuid; pid uuid := (p_document->>'profile_id')::uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(cid::text,4924));
 if not exists(select 1 from public.client_cases where id=cid and profile_id=pid) then raise exception 'DOCUMENT_OWNER_MISMATCH'; end if;
 if p_document->>'storage_path' not like pid::text || '/' || cid::text || '/' || (p_document->>'id') || '/%' then raise exception 'DOCUMENT_PATH_MISMATCH'; end if;
 insert into public.uploaded_documents(id,profile_id,case_id,document_type,status,document_status,storage_path,original_filename,metadata)
 values((p_document->>'id')::uuid,pid,cid,'other','uploaded','queued',p_document->>'storage_path',p_document->>'original_filename',p_document->'metadata')
 on conflict(id) do nothing;
 select * into strict doc from public.uploaded_documents where id=(p_document->>'id')::uuid;
 if doc.profile_id<>pid or doc.case_id<>cid or doc.storage_path<>p_document->>'storage_path' or doc.archived_at is not null then raise exception 'DOCUMENT_CONFLICT'; end if;
 insert into public.document_processing_jobs(document_id,case_id,profile_id,status,available_at) values(doc.id,cid,pid,'queued',now()) on conflict(document_id) do nothing;
 return next doc;
end; $$;

create or replace function public.claim_pmc_document_job(p_profile_id uuid default null, p_case_id uuid default null) returns setof public.document_processing_jobs
language plpgsql security invoker set search_path = public, pg_temp as $$
declare chosen uuid;
begin
 update public.document_processing_jobs set status='queued', locked_at=null, available_at=now(), updated_at=now(),last_error='WORKER_LEASE_EXPIRED'
 where status in ('processing','pre_extracting') and locked_at<now()-interval '10 minutes'
 and (p_profile_id is null or profile_id=p_profile_id) and (p_case_id is null or case_id=p_case_id);
 select j.id into chosen from public.document_processing_jobs j join public.uploaded_documents d on d.id=j.document_id and d.case_id=j.case_id and d.profile_id=j.profile_id
 where j.status='queued' and j.available_at<=now() and d.archived_at is null
 and (p_profile_id is null or j.profile_id=p_profile_id) and (p_case_id is null or j.case_id=p_case_id)
 order by j.created_at for update of j skip locked limit 1;
 if chosen is null then return; end if;
 return query update public.document_processing_jobs set status='processing',attempts=attempts+1,locked_at=clock_timestamp(),updated_at=now() where id=chosen returning *;
end; $$;

create or replace function public.complete_pmc_document(p_job_id uuid,p_lease timestamptz,p_source_hash text,p_extraction jsonb,p_run jsonb,p_values jsonb,p_source jsonb) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare job public.document_processing_jobs; rid uuid; item jsonb;
begin
 select * into strict job from public.document_processing_jobs where id=p_job_id;
 perform pg_advisory_xact_lock(hashtextextended(job.case_id::text,4924));
 select * into strict job from public.document_processing_jobs where id=p_job_id for update;
 if job.status not in ('processing','pre_extracting') or job.locked_at is distinct from p_lease then raise exception 'STALE_WORKER_LEASE'; end if;
 if p_source_hash !~ '^[a-f0-9]{64}$' or not exists(select 1 from public.uploaded_documents where id=job.document_id and case_id=job.case_id and profile_id=job.profile_id and archived_at is null) then raise exception 'SOURCE_INVALID'; end if;
 if p_source->>'source_hash' is distinct from p_source_hash or coalesce((p_source->>'page_count')::int,0) not between 1 and 250 or (p_source->>'page_count')::int<>jsonb_array_length(p_source->'pages') or exists(select 1 from jsonb_array_elements(p_source->'pages') with ordinality p(item,idx) where (p.item->>'page')::int is distinct from p.idx::int or coalesce(p.item->>'status','') not in ('COMPLETE','PARTIAL','UNREADABLE','NOT_READ')) then raise exception 'SOURCE_COVERAGE_INVALID'; end if;
 insert into public.analysis_runs(case_id,profile_id,document_id,extraction_model_version,analysis_engine_version,prompt_version,rule_set_version,threshold_set_version,unit_unresolved,human_review_count,blocked,requests,trends,excluded,document_snapshot)
 values(job.case_id,job.profile_id,job.document_id,p_run->>'extraction_model_version',p_run->>'analysis_engine_version',p_run->>'prompt_version',p_run->>'rule_set_version',p_run->>'threshold_set_version',(p_run->>'unit_unresolved')::boolean,(p_run->>'human_review_count')::int,p_run->'blocked',array(select jsonb_array_elements_text(p_run->'requests')),p_run->'trends',p_run->'excluded',jsonb_build_object('source',p_source,'extraction',p_extraction,'lab_values',p_values,'processor_version','pmc-document-chain-v1')) returning id into rid;
 insert into public.document_extractions(document_id,case_id,profile_id,source_fingerprint,agreed_values,disputed_values,first_reading,second_reading,extracted_at,content_classification,content_fingerprint)
 values(job.document_id,job.case_id,job.profile_id,p_source_hash,p_extraction->'agreed_values',p_extraction->'disputed_values',p_extraction->'first_reading',p_extraction->'second_reading',now(),p_extraction->>'content_classification',p_extraction->>'content_fingerprint')
 on conflict(document_id) do update set source_fingerprint=excluded.source_fingerprint,agreed_values=excluded.agreed_values,disputed_values=excluded.disputed_values,first_reading=excluded.first_reading,second_reading=excluded.second_reading,extracted_at=excluded.extracted_at,content_classification=excluded.content_classification,content_fingerprint=excluded.content_fingerprint;
 delete from public.lab_values where document_id=job.document_id;
 for item in select value from jsonb_array_elements(p_values) loop
 insert into public.lab_values(document_id,case_id,profile_id,analysis_run_id,measured_on,label_original,analyte,value_original,unit_original,reference_original,reference_low,reference_high,unit_resolved,unit_resolution_method,value_canonical,conversion_factor,position_in_reference,unresolved_reason,reference_set_version,value_printed,source_anchor)
 values(job.document_id,job.case_id,job.profile_id,rid,(item->>'measured_on')::date,item->>'label_original',item->>'analyte',(item->>'value_original')::numeric,item->>'unit_original',item->>'reference_original',(item->>'reference_low')::numeric,(item->>'reference_high')::numeric,item->>'unit_resolved',item->>'unit_resolution_method',(item->>'value_canonical')::numeric,(item->>'conversion_factor')::numeric,(item->>'position_in_reference')::numeric,item->>'unresolved_reason',item->>'reference_set_version',item->>'value_printed',item->'source_anchor');
 end loop;
 update public.uploaded_documents set document_status='ready',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('processing_source',p_source,'latest_analysis_run_id',rid) where id=job.document_id;
 update public.document_processing_jobs set status='ready',locked_at=null,last_error=null,progress='{}'::jsonb,updated_at=now() where id=job.id;
 return rid;
end; $$;

create or replace function public.save_pmc_case_review(p_case_id uuid,p_fingerprint text,p_summary text,p_draft text,p_actor uuid,p_run uuid) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare rid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_case_id::text,4924));
 if public.pmc_case_evidence_fingerprint(p_case_id)<>p_fingerprint then raise exception 'STALE_EVIDENCE'; end if;
 if exists(select 1 from public.uploaded_documents where case_id=p_case_id and archived_at is null and document_status<>'ready') then raise exception 'READING_INCOMPLETE'; end if;
 insert into public.case_ai_reviews(case_id,summary,draft,documents_fingerprint,documents_count,created_by,analysis_run_id,created_at)
 values(p_case_id,p_summary,p_draft,p_fingerprint,(select count(*) from public.uploaded_documents where case_id=p_case_id and archived_at is null),p_actor,p_run,clock_timestamp())
 on conflict(case_id) do update set summary=excluded.summary,draft=excluded.draft,documents_fingerprint=excluded.documents_fingerprint,documents_count=excluded.documents_count,created_by=excluded.created_by,analysis_run_id=excluded.analysis_run_id,created_at=excluded.created_at returning id into rid;
 return rid;
end; $$;

create or replace function public.approve_pmc_case_review(p_case_id uuid,p_review_id uuid,p_review_created_at timestamptz,p_fingerprint text,p_actor uuid,p_text text,p_diff jsonb) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare review public.case_ai_reviews; aid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_case_id::text,4924));
 select * into strict review from public.case_ai_reviews where id=p_review_id and case_id=p_case_id;
 if review.created_at<>p_review_created_at or review.documents_fingerprint<>p_fingerprint or public.pmc_case_evidence_fingerprint(p_case_id)<>p_fingerprint then raise exception 'STALE_EVIDENCE'; end if;
 if length(trim(p_text))=0 or length(p_text)>8000 then raise exception 'INVALID_CONCLUSION'; end if;
 select id into aid from public.case_review_learning_events where review_id=review.id and documents_fingerprint=p_fingerprint and ai_draft=review.draft and approved_text=p_text and approved_by=p_actor order by approved_at desc limit 1;
 if aid is not null then return aid; end if;
 insert into public.case_review_learning_events(case_id,review_id,ai_draft,approved_text,edit_operations,removed_fragments,added_fragments,documents_fingerprint,approved_by)
 values(p_case_id,review.id,review.draft,p_text,p_diff->'operations',array(select jsonb_array_elements_text(p_diff->'removed')),array(select jsonb_array_elements_text(p_diff->'added')),p_fingerprint,p_actor) returning id into aid;
 return aid;
end; $$;

create or replace function public.publish_pmc_case_review(p_case_id uuid,p_approval_id uuid,p_actor uuid) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare approval public.case_review_learning_events; review public.case_ai_reviews; mid uuid; owner_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_case_id::text,4924));
 select * into strict approval from public.case_review_learning_events where id=p_approval_id and case_id=p_case_id and approved_by=p_actor;
 select * into strict review from public.case_ai_reviews where id=approval.review_id and case_id=p_case_id;
 if approval.documents_fingerprint<>public.pmc_case_evidence_fingerprint(p_case_id) or approval.documents_fingerprint<>review.documents_fingerprint or approval.ai_draft<>review.draft then raise exception 'STALE_EVIDENCE'; end if;
 if exists(select 1 from public.case_review_learning_events where review_id=review.id and approved_at>approval.approved_at) then raise exception 'SUPERSEDED_DECISION'; end if;
 select profile_id into strict owner_id from public.client_cases where id=p_case_id;
 insert into public.case_messages(case_id,profile_id,sender_id,sender_role,body,approved_review_event_id)
 values(p_case_id,owner_id,p_actor,(select role from public.profiles where id=p_actor),approval.approved_text,approval.id)
 on conflict(approved_review_event_id) where approved_review_event_id is not null do nothing;
 select id into strict mid from public.case_messages where approved_review_event_id=approval.id;
 return mid;
end; $$;

create or replace function public.pmc_immutable_response() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if old.approved_review_event_id is not null and (new.body is distinct from old.body or new.approved_review_event_id is distinct from old.approved_review_event_id or new.case_id is distinct from old.case_id or new.profile_id is distinct from old.profile_id) then raise exception 'APPROVED_RESPONSE_IMMUTABLE'; end if;
 return new;
end; $$;
drop trigger if exists pmc_approved_response_immutable on public.case_messages;
create trigger pmc_approved_response_immutable before update on public.case_messages for each row execute function public.pmc_immutable_response();

-- All RPCs are server-only, invoker rights; no browser can claim jobs, save facts or approve.
revoke all on function public.pmc_lock_case_evidence(),public.pmc_immutable_response(),public.pmc_case_evidence_fingerprint(uuid),public.register_pmc_document(jsonb),public.claim_pmc_document_job(uuid,uuid),public.complete_pmc_document(uuid,timestamptz,text,jsonb,jsonb,jsonb,jsonb),public.save_pmc_case_review(uuid,text,text,text,uuid,uuid),public.approve_pmc_case_review(uuid,uuid,timestamptz,text,uuid,text,jsonb),public.publish_pmc_case_review(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.pmc_case_evidence_fingerprint(uuid),public.register_pmc_document(jsonb),public.claim_pmc_document_job(uuid,uuid),public.complete_pmc_document(uuid,timestamptz,text,jsonb,jsonb,jsonb,jsonb),public.save_pmc_case_review(uuid,text,text,text,uuid,uuid),public.approve_pmc_case_review(uuid,uuid,timestamptz,text,uuid,text,jsonb),public.publish_pmc_case_review(uuid,uuid,uuid) to service_role;

create or replace function public.save_pmc_evidence_review(p_case_id uuid,p_document_id uuid,p_actor uuid,p_evidence_id text,p_snapshot jsonb,p_token text,p_decision text,p_correction text) returns uuid
language plpgsql security invoker set search_path=public,pg_temp as $$
declare extraction public.document_extractions; actual_row jsonb; idx int; nid uuid; owner_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_case_id::text,4924));
 if p_decision not in ('CONFIRMED','CORRECTED','REJECTED') or (p_decision='CORRECTED' and (length(trim(coalesce(p_correction,'')))=0 or length(p_correction)>2000)) then raise exception 'INVALID_DECISION'; end if;
 select * into strict extraction from public.document_extractions where document_id=p_document_id and case_id=p_case_id;
 idx := (p_snapshot->>'rowIndex')::int;
 if idx<0 or p_snapshot->>'rowKind' not in ('agreed','disputed') then raise exception 'INVALID_ROW'; end if;
 actual_row := case when p_snapshot->>'rowKind'='agreed' then extraction.agreed_values->idx else extraction.disputed_values->idx end;
 if actual_row is null or actual_row is distinct from p_snapshot->'row' or extraction.id::text<>p_snapshot->>'extractionId' or extraction.document_id::text<>p_snapshot->>'documentId' or extraction.extracted_at is distinct from (p_snapshot->>'extractedAt')::timestamptz then raise exception 'STALE_EVIDENCE'; end if;
 if p_evidence_id<>extraction.id::text || '-' || (p_snapshot->>'rowKind') || '-' || idx::text then raise exception 'INVALID_EVIDENCE_ID'; end if;
 select profile_id into strict owner_id from public.client_cases where id=p_case_id;
 select id into nid from public.admin_notes where case_id=p_case_id and author_id=p_actor and metadata->>'snapshot_token'=p_token and metadata->>'decision'=p_decision and coalesce(metadata->>'correction','')=coalesce(p_correction,'') order by created_at desc limit 1;
 if nid is not null then return nid; end if;
 insert into public.admin_notes(case_id,profile_id,author_id,visibility,body,metadata)
 values(p_case_id,owner_id,p_actor,'karen_and_admin',case when p_decision='CORRECTED' then p_correction else p_decision end,
 jsonb_build_object('kind','case_picture_evidence_review','evidence_id',p_evidence_id,'document_id',p_document_id,'decision',p_decision,'correction',case when p_decision='CORRECTED' then p_correction else null end,'snapshot',p_snapshot,'snapshot_token',p_token,'source_verified_for_training',false,'training_eligible',false)) returning id into nid;
 return nid;
end; $$;
revoke all on function public.save_pmc_evidence_review(uuid,uuid,uuid,text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.save_pmc_evidence_review(uuid,uuid,uuid,text,jsonb,text,text,text) to service_role;


-- Settle failures only for the lease that failed; success takes precedence over
-- a lost network acknowledgement. User notification is part of the transaction.
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
 update public.uploaded_documents set document_status=p_status where id=job.document_id;
 if p_message is not null and job.client_notified_at is null then
  insert into public.case_messages(case_id,profile_id,sender_id,sender_role,body) values(job.case_id,job.profile_id,null,'system',p_message);
  update public.document_processing_jobs set client_notified_at=now() where id=job.id;
 end if;
 return p_status;
end; $$;
revoke all on function public.settle_pmc_document_job(uuid,timestamptz,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.settle_pmc_document_job(uuid,timestamptz,text,text,timestamptz,text) to service_role;

create or replace function public.pmc_immutable_snapshot() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if old.document_snapshot is not null and new is distinct from old then raise exception 'DOCUMENT_SNAPSHOT_IMMUTABLE'; end if;
 return new;
end; $$;
drop trigger if exists pmc_document_snapshot_immutable on public.analysis_runs;
create trigger pmc_document_snapshot_immutable before update on public.analysis_runs for each row execute function public.pmc_immutable_snapshot();
revoke all on function public.pmc_immutable_snapshot() from public,anon,authenticated;
