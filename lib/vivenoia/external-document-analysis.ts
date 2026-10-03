import {createHash} from "node:crypto";
export type ExternalDocumentRequest={version:"1";operationId:string;tenantId:string;applicationId:string;actorId:string;subjectId:string;locale:"ru"|"en";stage:"header"|"literal-first"|"literal-second";source:{id:string;version:string;hash:string;page:number;pageCount:number;mediaType:string;contentHash:string;data:string}};
export type ExternalDocumentReceipt={tenantId:string;applicationId:string;actorId:string;subjectId:string;sourceId:string;sourceVersion:string;sourceHash:string;contentHash:string;page:number;pageCount:number;provider:string;model:string;processorVersion:string;policyVersion:string;verification:"NOT_VERIFIED";usage:{inputTokens:number;outputTokens:number}|null;attemptId:string;rawEvidenceRef:string|null};
export type ExternalReadResult={outcome:"complete";text:string;receipt:ExternalDocumentReceipt}|{outcome:"failed";code:string;receipt?:ExternalDocumentReceipt};
export function externalRequestHash(r:ExternalDocumentRequest):string {return createHash("sha256").update(JSON.stringify([r.version,r.operationId,r.tenantId,r.applicationId,r.actorId,r.subjectId,r.locale,r.stage,r.source.id,r.source.version,r.source.hash,r.source.page,r.source.pageCount,r.source.mediaType,r.source.contentHash])).digest("hex");}
export function validateExternalResult(value:unknown,r:ExternalDocumentRequest):ExternalReadResult {
 if(!value||typeof value!=="object")return {outcome:"failed",code:"INVALID_EXTERNAL_RESPONSE"};
 const result=value as {version?:string;operationId?:string;requestHash?:string;outcome?:string;text?:string;code?:string;receipt?:ExternalDocumentReceipt};
 const receipt=result.receipt;
 if(result.version!=="1"||result.operationId!==r.operationId||result.requestHash!==externalRequestHash(r)||!receipt||receipt.tenantId!==r.tenantId||receipt.applicationId!==r.applicationId||receipt.actorId!==r.actorId||receipt.subjectId!==r.subjectId||receipt.sourceId!==r.source.id||receipt.sourceVersion!==r.source.version||receipt.sourceHash!==r.source.hash||receipt.contentHash!==r.source.contentHash||receipt.page!==r.source.page||receipt.pageCount!==r.source.pageCount||receipt.verification!=="NOT_VERIFIED"||typeof receipt.policyVersion!=="string"||!receipt.policyVersion||!receipt.provider||!receipt.model||!receipt.processorVersion||!/^[a-f0-9-]{36}$/.test(receipt.attemptId))return {outcome:"failed",code:"INVALID_EXTERNAL_RESPONSE"};
 if(result.outcome==="failed")return {outcome:"failed",code:"REMOTE_EXECUTION_FAILED",receipt};
 if(result.outcome!=="complete"||typeof result.text!=="string"||!result.text.trim()||Buffer.byteLength(result.text)>16000||!receipt.rawEvidenceRef||!receipt.usage||![receipt.usage.inputTokens,receipt.usage.outputTokens].every(n=>Number.isSafeInteger(n)&&n>=0))return {outcome:"failed",code:"INVALID_EXTERNAL_RESPONSE"};
 return {outcome:"complete",text:result.text,receipt};
}
export async function readExternalDocument(r:ExternalDocumentRequest,dispatch:typeof fetch=fetch):Promise<ExternalReadResult>{
 if(typeof window!=="undefined")throw new Error("SERVER_ONLY");
 const endpoint=process.env.VIVENOIA_DOCUMENT_ANALYSIS_URL,token=process.env.VIVENOIA_DOCUMENT_ANALYSIS_TOKEN;
 const preview=process.env.VIVENOIA_DOCUMENT_ANALYSIS_PREVIEW_URL,bypass=process.env.VIVENOIA_DOCUMENT_ANALYSIS_PREVIEW_BYPASS;
 const approvedPreview=!!preview&&/^https:\/\/vivenoia-core-staging-[a-z0-9]{9}-pythonsmethods-projects\.vercel\.app\/api\/document-analysis$/.test(preview)&&endpoint===preview&&!!bypass&&/^[A-Za-z0-9_-]{20,256}$/.test(bypass);
 if(endpoint!=="https://staging.vivenoia.com/api/document-analysis"&&!approvedPreview||!token||!/^[A-Za-z0-9_-]{43,128}$/.test(token)||process.env.VIVENOIA_DOCUMENT_ANALYSIS_ENABLED!=="synthetic-staging")return {outcome:"failed",code:"EXTERNAL_RUNTIME_NOT_CONFIGURED"};
 if(process.env.NEXT_PUBLIC_SUPABASE_URL!=="https://thylrayzjczsxlyqhtfc.supabase.co")return {outcome:"failed",code:"STAGING_DATABASE_REQUIRED"};
 try {
  const response=await dispatch(endpoint!,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",...(approvedPreview?{"x-vercel-protection-bypass":bypass!}:{})},body:JSON.stringify(r),redirect:"error",signal:AbortSignal.timeout(95000),cache:"no-store"});
  if(!response.ok){await response.body?.cancel();return {outcome:"failed",code:response.status===429?"BUDGET_OR_RATE_UNAVAILABLE":response.status===409?"RECONCILE_REMOTE_OPERATION":"REMOTE_UNAVAILABLE"};}
  if(!response.body) return {outcome:"failed",code:"INVALID_EXTERNAL_RESPONSE"};
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>32768){await reader.cancel();return {outcome:"failed",code:"INVALID_EXTERNAL_RESPONSE"};}chunks.push(next.value);}}
  finally{reader.releaseLock();}
  return validateExternalResult(JSON.parse(Buffer.concat(chunks).toString("utf8")),r);
 }catch{return {outcome:"failed",code:"REMOTE_OUTCOME_UNKNOWN"};}
}
