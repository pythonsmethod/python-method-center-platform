import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { PRIMARY_FOUNDER_EMAIL } from "@/lib/auth/require-founder";
import { ANSWER_SCHEMA, CORE_INSTRUCTIONS, canUseEnvironment, extractOutput, isBranch, parseAnswer, resolvedBranches, validateLinks } from "@/lib/nexora/core";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const noCache = {"Cache-Control":"private, no-store, max-age=0","Vary":"Cookie","X-Content-Type-Options":"nosniff"};
class HubError extends Error { constructor(public code:string, public status:number){super(code);} }
function json(data:unknown,status=200){ return Response.json(data,{status,headers:noCache}); }
async function owner(){
  const auth=await createSupabaseServerClient(); if(!auth)throw new HubError("auth_not_configured",503);
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user)throw new HubError("sign_in_required",401);
  // The server-verified Auth identity is authoritative, never a client profile email.
  if(!user.email_confirmed_at||user.email?.toLowerCase()!==PRIMARY_FOUNDER_EMAIL.toLowerCase())throw new HubError("owner_only",403);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||"";
  if(!canUseEnvironment(url,process.env.NEXORA_RUNTIME_ENABLED))throw new HubError("staging_only",503);
  const db=createSupabaseServiceClient();if(!db)throw new HubError("database_not_configured",503);
  const profile=await db.from("profiles").select("id,status").eq("id",user.id).maybeSingle();
  if(profile.error||!profile.data)throw new HubError("profile_not_ready",503);
  if(["suspended","closed"].includes(profile.data.status))throw new HubError("account_unavailable",403);
  return {id:user.id,db};
}
function sameOrigin(req:Request){
  const origin=req.headers.get("origin");
  if(!origin || origin!==new URL(req.url).origin || req.headers.get("x-nexora-client")!=="hub-v1")throw new HubError("invalid_origin",403);
}
async function limitedBytes(req:Request,max:number){
  const reader=req.body?.getReader();if(!reader)throw new HubError("empty_request",400);
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HubError("request_too_large",413);}chunks.push(value);}
  const out=new Uint8Array(size);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out;
}
async function bodyJSON(req:Request){if(!req.headers.get("content-type")?.includes("application/json"))throw new HubError("json_required",400);try{return JSON.parse(new TextDecoder().decode(await limitedBytes(req,24000)));}catch(e){if(e instanceof HubError)throw e;throw new HubError("invalid_json",400);}}
function text(v:unknown,max:number,required=true){if(typeof v!=="string"||v.length>max||(required&&!v.trim()))throw new HubError("invalid_input",400);return v.trim();}
async function quota(db:NonNullable<ReturnType<typeof createSupabaseServiceClient>>,id:string,action:string){const r=await db.rpc("hcs_hub_reserve_quota",{p_profile:id,p_action:action});if(r.error)throw new HubError("quota_not_configured",503);if(r.data!==true)throw new HubError("hourly_limit",429);}
async function provider(path:string,body:unknown,multipart=false){
  const key=process.env.OPENAI_API_KEY;if(!key)throw new HubError("openai_key_missing",503);
  const r=await fetch("https://api.openai.com/v1/"+path,{method:"POST",headers:{Authorization:`Bearer ${key}`,...(multipart?{}:{"Content-Type":"application/json"})},body:multipart?body as FormData:JSON.stringify(body),signal:AbortSignal.timeout(48000)});
  if(!r.ok){await r.body?.cancel();throw new HubError("model_unavailable",502);}return r.json();
}
export async function GET(req:Request,{params}:{params:Promise<{action:string}>}){
  try{const {id,db}=await owner();const {action}=await params;const branch=new URL(req.url).searchParams.get("branch")||"core";if(!isBranch(branch))throw new HubError("invalid_branch",400);
    if(action==="status"){
      const [settings,skills,runs]=await Promise.all([db.from("hcs_hub_settings").select("branch_urls").eq("profile_id",id).maybeSingle(),db.from("hcs_skills").select("slug,definition").neq("status","deprecated"),db.from("hcs_runs").select("id",{count:"exact",head:true}).eq("profile_id",id)]);
      if(settings.error||skills.error||runs.error)throw new HubError("schema_not_ready",503);
      const skillCount=(skills.data||[]).filter(s=>typeof s.definition?.instructions==="string"&&s.definition.instructions.length>20).length;
      return json({ready:!!process.env.OPENAI_API_KEY&&skillCount>0,key_ready:!!process.env.OPENAI_API_KEY,model:process.env.NEXORA_MODEL||"gpt-5.6-sol",skill_count:skillCount,run_count:runs.count||0,branches:resolvedBranches(settings.data?.branch_urls),scope:"personal-only",drive_sync:false,branch_data_sync:false});
    }
    if(action==="history"){
      const r=await db.from("hcs_runs").select("id,request_text,plan,result,status,created_at").eq("profile_id",id).eq("context->>branch",branch).eq("context->>surface","nexora-hub-v1").order("created_at",{ascending:false}).limit(40);
      if(r.error)throw new HubError("history_unavailable",503);return json({runs:r.data||[]});
    }
    throw new HubError("not_found",404);
  }catch(e){return json({error:e instanceof HubError?e.code:"service_unavailable"},e instanceof HubError?e.status:503);}
}
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){
  let reservedRun:string|null=null;let session:Awaited<ReturnType<typeof owner>>|null=null;
  try{sameOrigin(req);session=await owner();const {id,db}=session;const {action}=await params;
    if(action==="transcribe"){
      const bytes=await limitedBytes(req,6*1024*1024);
      const form=await new Response(bytes,{headers:{"Content-Type":req.headers.get("content-type")||""}}).formData();
      const file=form.get("file");if(!(file instanceof File)||file.size<100||file.size>5*1024*1024||!/^audio\/(webm|mp4|ogg|mpeg|wav|x-wav)(;|$)/i.test(file.type)||form.get("consent")!=="true")throw new HubError("invalid_audio",400);
      await quota(db,id,"transcribe");
      const upload=new FormData();const ext=file.type.includes("mp4")?"mp4":file.type.includes("ogg")?"ogg":file.type.includes("wav")?"wav":file.type.includes("mpeg")?"mp3":"webm";
      upload.append("file",file,`voice.${ext}`);upload.append("model","gpt-4o-mini-transcribe");upload.append("language",form.get("lang")==="en"?"en":"ru");
      const result=await provider("audio/transcriptions",upload,true);
      return json({text:text(result.text,6000,false),audio_stored:false});
    }
    const b=await bodyJSON(req);if(!b||typeof b!=="object"||Array.isArray(b))throw new HubError("invalid_body",400);
    if(action==="settings"){
      let urls;try{urls=validateLinks(b.urls);}catch{throw new HubError("invalid_url",400);}
      const r=await db.from("hcs_hub_settings").upsert({profile_id:id,branch_urls:urls,updated_at:new Date().toISOString()},{onConflict:"profile_id"});if(r.error)throw new HubError("settings_unavailable",503);return json({saved:true});
    }
    if(action==="feedback"){
      const runId=text(b.run_id,36);if(!/^[a-f\d-]{36}$/i.test(runId))throw new HubError("invalid_run",400);
      const outcome=text(b.outcome,2000),lesson=text(b.lesson??"",1000,false);
      const r=await db.rpc("hcs_hub_record_feedback",{p_profile:id,p_run:runId,p_outcome:outcome,p_lesson:lesson});
      if(r.error){if(["P0001","23505"].includes(r.error.code))throw new HubError("already_recorded_or_unavailable",409);throw new HubError("feedback_unavailable",503);}return json({saved:true,event_id:r.data});
    }
    if(action!=="chat")throw new HubError("not_found",404);
    if(b.consent!==true)throw new HubError("consent_required",400);
    const message=text(b.message,6000),requestId=text(b.request_id,64);if(!/^[a-f\d-]{36}$/i.test(requestId))throw new HubError("invalid_request_id",400);
    const branch=isBranch(b.branch)?b.branch:null;if(!branch)throw new HubError("invalid_branch",400);
    if(!process.env.OPENAI_API_KEY)throw new HubError("openai_key_missing",503);
    const mode=b.mode==="without_ceiling"?"without_ceiling":"normal";
    const existing=await db.from("hcs_runs").select("id,plan,status").eq("profile_id",id).eq("context->>request_id",requestId).maybeSingle();
    if(existing.error)throw new HubError("database_unavailable",503);
    if(existing.data){if(existing.data.plan?.answer)return json({...parseAnswer(existing.data.plan),run_id:existing.data.id,replayed:true});throw new HubError("request_already_started",409);}
    await quota(db,id,"chat");
    const started=await db.from("hcs_runs").insert({profile_id:id,request_text:message,context:{surface:"nexora-hub-v1",branch,mode,request_id:requestId,consent:{version:"nexora-personal-v1",accepted_at:new Date().toISOString()}},status:"planned"}).select("id").single();
    if(started.error){if(started.error.code==="23505")throw new HubError("request_already_started",409);throw new HubError("run_not_saved",503);}reservedRun=started.data.id;
    const domain=(branch==="anham"||branch==="python-method-center")?"anham":"way";
    const historyQuery=db.from("hcs_runs").select("id,request_text,plan,result,context,created_at").eq("profile_id",id).eq("context->>surface","nexora-hub-v1").neq("id",reservedRun).in("status",["running","completed"]).order("created_at",{ascending:false}).limit(10);
    if(branch!=="core")historyQuery.eq("context->>branch",branch);
    const [skillResult,historyResult,settings]=await Promise.all([db.from("hcs_skills").select("slug,name,domain,definition").in("domain",["core",domain]).neq("status","deprecated").limit(24),historyQuery,db.from("hcs_hub_settings").select("branch_urls").eq("profile_id",id).maybeSingle()]);
    if(skillResult.error||historyResult.error||settings.error)throw new HubError("context_unavailable",503);
    const skills=(skillResult.data||[]).filter(s=>typeof s.definition?.instructions==="string").map(s=>({source_id:`skill:${s.slug}`,slug:s.slug,name:s.name,instructions:s.definition.instructions.slice(0,4500)}));
    if(!skills.length)throw new HubError("skill_instructions_missing",503);
    const past=(historyResult.data||[]).map(r=>({source_id:`turn:${r.id}`,date:r.created_at,branch:r.context?.branch,question:r.request_text,answer:r.plan?.answer||"",self_reported_outcome:r.result?.outcome||null,user_confirmed_next_time_lesson:r.result?.lesson||null}));
    const branchList=resolvedBranches(settings.data?.branch_urls).map(x=>({...x,source_id:`branch:${x.id}`}));
    const model=process.env.NEXORA_MODEL||"gpt-5.6-sol";
    const result=await provider("responses",{model,store:false,instructions:CORE_INSTRUCTIONS,input:JSON.stringify({language:b.lang==="en"?"English":"Russian",current_branch:branch,mode,request:message,skills,branches:branchList,personal_history:past,limits:{live_branch_data:false,full_drive_sync:false}}),reasoning:{effort:mode==="without_ceiling"?"high":"medium"},max_output_tokens:4500,text:{format:{type:"json_schema",name:"nexora_hub_reply",strict:true,schema:ANSWER_SCHEMA}}});
    const answer=parseAnswer(JSON.parse(extractOutput(result)));
    const sourceIds=new Set([...skills.map(s=>s.source_id),...past.map(p=>p.source_id),...branchList.map(x=>x.source_id)]);answer.sources=answer.sources.filter(s=>sourceIds.has(s));answer.skills=answer.skills.filter(s=>skills.some(v=>v.slug===s));
    const saved=await db.from("hcs_runs").update({plan:answer,selected_skills:answer.skills,selected_capabilities:[{name:answer.capability,status:"hypothesis"}],selected_conductors:["human",domain,"memory","evidence"],status:"running"}).eq("id",reservedRun).eq("profile_id",id);
    if(saved.error)throw new HubError("answer_not_saved",503);
    return json({...answer,run_id:reservedRun,model});
  }catch(e){if(session&&reservedRun){await session.db.from("hcs_runs").update({status:"failed",result:{error:e instanceof HubError?e.code:"request_failed"}}).eq("id",reservedRun).eq("profile_id",session.id);}return json({error:e instanceof HubError?e.code:"service_unavailable"},e instanceof HubError?e.status:503);}
}
