import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite;
const q = async (sql: string, args: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, args)).rows;
const migration = readFileSync("supabase/migrations/20260924012755_pmc_document_chain.sql", "utf8");
beforeAll(async () => {
 db = new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create type document_intake_status as enum ('uploaded','queued','pre_extracting','processing','ready','identity_mismatch','needs_reupload','failed');
 create schema auth; create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create table profiles(id uuid primary key,role text not null default 'client');
 create table client_cases(id uuid primary key,profile_id uuid references profiles(id));
 create table uploaded_documents(id uuid primary key,profile_id uuid references profiles(id),case_id uuid references client_cases(id),document_type text,status text,document_status document_intake_status,storage_path text,original_filename text,metadata jsonb,created_at timestamptz default now(),archived_at timestamptz,identity_status text,identity_review_status text,duplicate_of_document_id uuid,version_of_document_id uuid);
 create table document_processing_jobs(id uuid primary key default gen_random_uuid(),document_id uuid unique references uploaded_documents(id),case_id uuid,profile_id uuid,status text,attempts int default 0,available_at timestamptz default now(),locked_at timestamptz,client_notified_at timestamptz,last_error text,updated_at timestamptz default now(),created_at timestamptz default now());
 create table document_extractions(id uuid primary key default gen_random_uuid(),document_id uuid unique,case_id uuid,profile_id uuid,source_fingerprint text,agreed_values jsonb,disputed_values jsonb,first_reading jsonb,second_reading jsonb,extracted_at timestamptz,content_classification text,content_fingerprint text);
 create table analysis_runs(id uuid primary key default gen_random_uuid(),case_id uuid,profile_id uuid,document_id uuid,extraction_model_version text not null,analysis_engine_version text not null,prompt_version text not null,rule_set_version text not null,threshold_set_version text not null,unit_unresolved boolean,human_review_count int,blocked jsonb,requests text[],trends jsonb,excluded jsonb,created_at timestamptz default now());
 create table lab_values(id uuid primary key default gen_random_uuid(),document_id uuid,case_id uuid,profile_id uuid,analysis_run_id uuid references analysis_runs(id),measured_on date,label_original text,analyte text,value_original numeric not null,unit_original text,reference_original text,reference_low numeric,reference_high numeric,unit_resolved text,unit_resolution_method text,value_canonical numeric,conversion_factor numeric,position_in_reference numeric,unresolved_reason text,reference_set_version text);
 create table case_ai_reviews(id uuid primary key default gen_random_uuid(),case_id uuid unique,summary text,draft text,documents_fingerprint text,documents_count int,created_by uuid,analysis_run_id uuid,created_at timestamptz default now());
 create table case_review_learning_events(id uuid primary key default gen_random_uuid(),case_id uuid,review_id uuid,ai_draft text,approved_text text,edit_operations jsonb,removed_fragments text[],added_fragments text[],documents_fingerprint text,approved_by uuid,approved_at timestamptz default clock_timestamp());
 create table case_messages(id uuid primary key default gen_random_uuid(),case_id uuid,profile_id uuid,sender_id uuid,sender_role text,body text,created_at timestamptz default now(),read_at timestamptz);
 create table admin_notes(id uuid primary key default gen_random_uuid(),case_id uuid,profile_id uuid,author_id uuid,visibility text,body text,metadata jsonb,created_at timestamptz default now());
 `);
 await db.exec(migration);
 await db.exec(migration);
 await db.exec(readFileSync("supabase/migrations/20260924015616_pmc_document_chain_settlement.sql", "utf8"));
 await db.exec(readFileSync("supabase/migrations/20260924020407_pmc_document_chain_lab_context.sql", "utf8"));
 await db.exec(readFileSync("supabase/migrations/20260924021210_pmc_document_chain_source_boundary.sql", "utf8"));
 await q("insert into profiles(id,role) values($1,'client'),($2,'client'),($3,'admin')", [id(1),id(2),id(3)]);
 await q("insert into client_cases values($1,$2),($3,$4)",[id(11),id(1),id(12),id(2)]);
}, 30000);
afterAll(async()=>{await db?.close();});
const register = (n: number, owner = 1, caseN = 11) => q("select * from register_pmc_document($1::jsonb)", [JSON.stringify({id:id(n),case_id:id(caseN),profile_id:id(owner),storage_path:`${id(owner)}/${id(caseN)}/${id(n)}/synthetic.pdf`,original_filename:"synthetic.pdf",metadata:{mime_type:"application/pdf"}})]);
const sourceHash = "a".repeat(64);
const row = { file:"synthetic.pdf",section:"LAB",label:"CRP",value:"5 mg/L",reference:"0-5",referenceConfirmed:true,confident:true,note:"",source:{level:"PAGE",page:1,sourceHash,excerpt:"CRP 5 mg/L",region:null}};
const extraction = {agreed_values:[row],disputed_values:[],first_reading:[row],second_reading:[row],content_classification:"CLINICAL_CONTENT"};
const run = {extraction_model_version:"synthetic-reader",analysis_engine_version:"pmc-test",prompt_version:"v1",rule_set_version:"v1",threshold_set_version:"v1",unit_unresolved:false,human_review_count:0,blocked:[],requests:[],trends:{},excluded:[]};
const source = {source_hash:sourceHash,page_count:1,pages:[{page:1,status:"COMPLETE",reasons:[]}],processor_version:"pmc-document-chain-v1"};
const values = [{measured_on:"2026-09-24",label_original:"CRP",analyte:"CRP",value_original:5,unit_original:"mg/L",unit_resolved:"mg/L",unit_resolution_method:"explicit",value_canonical:5,reference_set_version:"v1",value_printed:"5 mg/L",source_anchor:row.source}];
const claim = async(owner=1)=> (await q("select * from claim_pmc_document_job($1,null)",[id(owner)]))[0];
const complete = (job: Record<string,unknown>, override: unknown[]=values) => q("select complete_pmc_document($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb) as id", [job.id,job.locked_at,sourceHash,JSON.stringify(extraction),JSON.stringify(run),JSON.stringify(override),JSON.stringify(source)]);
let job:Record<string,unknown>;
let approval:unknown;
let fingerprint:unknown;
let review:Record<string,unknown>;
describe("PMC transaction path with entirely synthetic records",()=>{
 it("registers a source and one job atomically; retry reuses both",async()=>{
   await register(21); await register(21);
   expect((await q("select count(*)::int n from uploaded_documents"))[0].n).toBe(1);
   expect((await q("select count(*)::int n from document_processing_jobs"))[0].n).toBe(1);
 });
 it("rejects cross-owner registration",async()=>{await expect(register(22,2,11)).rejects.toThrow("DOCUMENT_OWNER_MISMATCH");});
 it("claims only the caller's work even when another queue entry is older",async()=>{
   await register(22,2,12); const other=await claim(2); expect(other.document_id).toBe(id(22));
   job=await claim(1); expect(job.document_id).toBe(id(21)); expect(await claim(1)).toBeUndefined();
 });
 it("requeues only the active lease using the real document status enum",async()=>{
   expect((await q("select settle_pmc_document_job($1,$2::timestamptz-interval '1 second','queued','retry',now(),null) s",[job.id,job.locked_at]))[0].s).toBe("lease_lost");
   expect((await q("select settle_pmc_document_job($1,$2,'queued','retry',now(),null) s",[job.id,job.locked_at]))[0].s).toBe("queued");
   job=await claim(); expect(job.status).toBe("processing");
 });
 it("rolls back every derived write when a laboratory value fails",async()=>{
   await expect(complete(job,[{...values[0],value_original:null}])).rejects.toThrow();
   expect((await q("select count(*)::int n from analysis_runs"))[0].n).toBe(0);
   expect((await q("select count(*)::int n from document_extractions"))[0].n).toBe(0);
 });
 it("commits original readings, page anchors, numeric projection and immutable snapshot together",async()=>{
   const saved=await complete(job); const reread=(await q("select document_snapshot from analysis_runs where id=$1",[saved[0].id]))[0];
   expect(reread.document_snapshot).toMatchObject({source,extraction});
   expect((await q("select document_status from uploaded_documents where id=$1",[id(21)]))[0].document_status).toBe("ready");
   expect((await q("select source_anchor from lab_values"))[0].source_anchor).toEqual(row.source);
 });
 it("reconciles a lost success response without changing ready evidence",async()=>{
   const settled=await q("select settle_pmc_document_job($1,$2,'failed','LOST_RESPONSE',now(),'failure') s",[job.id,job.locked_at]);
   expect(settled[0].s).toBe("ready");
   expect((await q("select count(*)::int n from case_messages"))[0].n).toBe(0);
   await expect(q("update analysis_runs set document_snapshot='{}'")).rejects.toThrow("DOCUMENT_SNAPSHOT_IMMUTABLE");
 });
 it("a completed lease cannot commit a second time",async()=>{await expect(complete(job)).rejects.toThrow("STALE_WORKER_LEASE");});
 it("creates an internal review and version-bound Karen decision",async()=>{
   fingerprint=(await q("select pmc_case_evidence_fingerprint($1) as f",[id(11)]))[0].f;
   await q("select save_pmc_case_review($1,$2,'No unresolved items','Internal draft',$3,(select id from analysis_runs limit 1))",[id(11),fingerprint,id(3)]);
   review=(await q("select * from case_ai_reviews"))[0];
   const args=[id(11),review.id,review.created_at,fingerprint,id(3),"Synthetic approved result",JSON.stringify({operations:[],removed:[],added:[]})];
   approval=(await q("select approve_pmc_case_review($1,$2,$3,$4,$5,$6,$7::jsonb) id",args))[0].id;
   expect((await q("select approve_pmc_case_review($1,$2,$3,$4,$5,$6,$7::jsonb) id",args))[0].id).toBe(approval);
   expect((await q("select count(*)::int n from case_messages"))[0].n).toBe(0);
 });
 it("publishes the approved text once and preserves the decision link on readback",async()=>{
   const a=(await q("select publish_pmc_case_review($1,$2,$3) id",[id(11),approval,id(3)]))[0].id;
   const b=(await q("select publish_pmc_case_review($1,$2,$3) id",[id(11),approval,id(3)]))[0].id;
   expect(a).toBe(b);
   expect((await q("select body,approved_review_event_id from case_messages where id=$1",[a]))[0]).toEqual({body:"Synthetic approved result",approved_review_event_id:approval});
   await expect(q("update case_messages set body='changed' where id=$1",[a])).rejects.toThrow("APPROVED_RESPONSE_IMMUTABLE");
 });
 it("rejects a different Case/actor and rejects a stale approval after re-extraction",async()=>{
   await expect(q("select publish_pmc_case_review($1,$2,$3)",[id(12),approval,id(3)])).rejects.toThrow();
   await expect(q("select publish_pmc_case_review($1,$2,$3)",[id(11),approval,id(2)])).rejects.toThrow();
   await q("update document_processing_jobs set status='queued' where id=$1",[job.id]);
   const next=await claim(); await complete(next);
   expect((await q("select count(*)::int n from analysis_runs"))[0].n).toBe(2);
   expect((await q("select count(*)::int n from lab_values"))[0].n).toBe(1);
   await expect(q("select publish_pmc_case_review($1,$2,$3)",[id(11),approval,id(3)])).rejects.toThrow("STALE_EVIDENCE");
   await expect(q("select approve_pmc_case_review($1,$2,$3,$4,$5,'stale',$6::jsonb)",[id(11),review.id,review.created_at,fingerprint,id(3),JSON.stringify({operations:[],removed:[],added:[]})])).rejects.toThrow("STALE_EVIDENCE");
 });
 it("does not expose write/approval RPCs to browser roles",async()=>{
   const grants=await q("select has_function_privilege('authenticated','public.complete_pmc_document(uuid,timestamptz,text,jsonb,jsonb,jsonb,jsonb)','execute') write,has_function_privilege('anon','public.publish_pmc_case_review(uuid,uuid,uuid)','execute') publish");
   expect(grants[0]).toEqual({write:false,publish:false});
 });
 it("allows an own-case original but denies cross-case paths and overwrite despite permissive legacy rules",async()=>{
   await db.exec("grant usage on schema storage,auth to authenticated; grant all on storage.objects,uploaded_documents to authenticated; grant select on client_cases to authenticated; create policy legacy_doc_insert on uploaded_documents for insert to authenticated with check(true); create policy legacy_storage_insert on storage.objects for insert to authenticated with check(true); create policy legacy_storage_update on storage.objects for update to authenticated using(true) with check(true);");
   await q("select set_config('request.jwt.claim.sub',$1,false)",[id(1)]);
   await db.exec("set role authenticated");
   try {
    await q("insert into storage.objects(bucket_id,name) values('client-documents',$1)",[`${id(1)}/${id(11)}/${id(41)}/synthetic.pdf`]);
    await expect(q("insert into storage.objects(bucket_id,name) values('client-documents',$1)",[`${id(1)}/${id(12)}/${id(42)}/foreign.pdf`])).rejects.toThrow("row-level security");
    expect((await q("update storage.objects set name='overwritten' returning id"))).toHaveLength(0);
    await expect(q("insert into uploaded_documents(id,case_id,profile_id) values($1,$2,$3)",[id(43),id(12),id(1)])).rejects.toThrow("row-level security");
   } finally { await db.exec("reset role"); }
 });

});
