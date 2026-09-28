-- Synthetic staging-only transaction. Never reads an existing client or document.
-- This validates the deployed schema/RPC path, not a human Karen session or OCR.
begin;
do $$
declare owner_id uuid:=gen_random_uuid(); actor_id uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid(); did uuid:=gen_random_uuid();
 job public.document_processing_jobs; rid uuid; review public.case_ai_reviews; aid uuid; mid uuid; again uuid; fp text;
 sha text:=repeat('a',64); src jsonb; extracted jsonb; result_values jsonb; anchor jsonb;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(owner_id,'synthetic-'||owner_id||'@example.invalid','{}'),(actor_id,'synthetic-'||actor_id||'@example.invalid','{}');
 insert into public.profiles(id,role,full_name) values(owner_id,'client','SYNTHETIC TEST'),(actor_id,'admin','SYNTHETIC REVIEWER') on conflict(id) do update set role=excluded.role,full_name=excluded.full_name;
 select id into cid from public.client_cases where profile_id=owner_id;
 if cid is null then insert into public.client_cases(profile_id) values(owner_id) returning id into cid; end if;
 execute 'set local role service_role';
 perform public.register_pmc_document(jsonb_build_object('id',did,'case_id',cid,'profile_id',owner_id,'storage_path',owner_id||'/'||cid||'/'||did||'/synthetic.pdf','original_filename','synthetic.pdf','metadata',jsonb_build_object('mime_type','application/pdf')));
 select * into strict job from public.claim_pmc_document_job(owner_id,cid);
 -- An expired worker cannot reset somebody else's lease.
 if public.settle_pmc_document_job(job.id,job.locked_at-interval '1 second','failed','TEST',now(),null)<>'lease_lost' then raise exception 'STALE_LEASE_NOT_BLOCKED'; end if;
 if public.settle_pmc_document_job(job.id,job.locked_at,'queued','SYNTHETIC_RETRY',now(),null)<>'queued' then raise exception 'REQUEUE_FAILED'; end if;
 select * into strict job from public.claim_pmc_document_job(owner_id,cid);
 anchor:=jsonb_build_object('level','PAGE','page',1,'sourceHash',sha,'excerpt','CRP 5 mg/L','region',null);
 src:=jsonb_build_object('source_hash',sha,'page_count',1,'pages',jsonb_build_array(jsonb_build_object('page',1,'status','COMPLETE','reasons','[]'::jsonb)));
 extracted:=jsonb_build_object('agreed_values',jsonb_build_array(jsonb_build_object('file','synthetic.pdf','section','LAB','label','CRP','value','5 mg/L','source',anchor)),'disputed_values','[]'::jsonb,'first_reading','[]'::jsonb,'second_reading','[]'::jsonb,'content_classification','CLINICAL_CONTENT');
 result_values:=jsonb_build_array(jsonb_build_object('measured_on','2026-09-24','label_original','CRP','analyte','crp','value_original',5,'value_printed','5 mg/L','unit_original','mg/L','unit_resolved','mg/L','unit_resolution_method','explicit','value_canonical',5,'conversion_factor',1,'reference_set_version','synthetic','source_anchor',anchor));
 rid:=public.complete_pmc_document(job.id,job.locked_at,sha,extracted,'{"extraction_model_version":"synthetic","analysis_engine_version":"synthetic","prompt_version":"synthetic","rule_set_version":"synthetic","threshold_set_version":"synthetic","unit_unresolved":false,"human_review_count":0,"blocked":[],"requests":[],"trends":{},"excluded":[]}'::jsonb,result_values,src);
 if not exists(select 1 from public.analysis_runs where id=rid and document_snapshot->'source'->>'source_hash'=sha) then raise exception 'SNAPSHOT_READBACK_FAILED'; end if;
 if public.settle_pmc_document_job(job.id,job.locked_at,'failed','LOST_RESPONSE',now(),null)<>'ready' then raise exception 'SUCCESS_RECONCILIATION_FAILED'; end if;
 fp:=public.pmc_case_evidence_fingerprint(cid);
 perform public.save_pmc_case_review(cid,fp,'','Synthetic internal picture',actor_id,rid);
 select * into strict review from public.case_ai_reviews where case_id=cid;
 aid:=public.approve_pmc_case_review(cid,review.id,review.created_at,fp,actor_id,'Synthetic approved response','{"operations":[],"removed":[],"added":[]}'::jsonb);
 mid:=public.publish_pmc_case_review(cid,aid,actor_id); again:=public.publish_pmc_case_review(cid,aid,actor_id);
 if mid<>again or not exists(select 1 from public.case_messages where id=mid and approved_review_event_id=aid and body='Synthetic approved response') then raise exception 'PUBLICATION_READBACK_FAILED'; end if;
 if has_function_privilege('authenticated','public.complete_pmc_document(uuid,timestamptz,text,jsonb,jsonb,jsonb,jsonb)','execute') or has_function_privilege('anon','public.publish_pmc_case_review(uuid,uuid,uuid)','execute') then raise exception 'BROWSER_RPC_EXPOSED'; end if;
 execute 'reset role';
end; $$;
select 'PASS: isolated synthetic registration, scoped claim, source snapshot, lost-response reconciliation, version-bound approval, linked idempotent publication; rolled back' as result;
rollback;
