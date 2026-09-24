-- Literal specimen/method context is separate from numeric normalization.
alter table public.lab_values add column if not exists comparison_context jsonb;
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
 insert into public.lab_values(document_id,case_id,profile_id,analysis_run_id,measured_on,label_original,analyte,value_original,unit_original,reference_original,reference_low,reference_high,unit_resolved,unit_resolution_method,value_canonical,conversion_factor,position_in_reference,unresolved_reason,reference_set_version,value_printed,source_anchor,comparison_context)
 values(job.document_id,job.case_id,job.profile_id,rid,(item->>'measured_on')::date,item->>'label_original',item->>'analyte',(item->>'value_original')::numeric,item->>'unit_original',item->>'reference_original',(item->>'reference_low')::numeric,(item->>'reference_high')::numeric,item->>'unit_resolved',item->>'unit_resolution_method',(item->>'value_canonical')::numeric,(item->>'conversion_factor')::numeric,(item->>'position_in_reference')::numeric,item->>'unresolved_reason',item->>'reference_set_version',item->>'value_printed',item->'source_anchor',item->'comparison_context');
 end loop;
 update public.uploaded_documents set document_status='ready',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('processing_source',p_source,'latest_analysis_run_id',rid) where id=job.document_id;
 update public.document_processing_jobs set status='ready',locked_at=null,last_error=null,progress='{}'::jsonb,updated_at=now() where id=job.id;
 return rid;
end; $$;
