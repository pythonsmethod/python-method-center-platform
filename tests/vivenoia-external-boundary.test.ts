import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { readExternalDocument, validateExternalResult, externalRequestHash, type ExternalDocumentRequest } from "@/lib/vivenoia/external-document-analysis";
const r:ExternalDocumentRequest={version:"1",operationId:"stable-op",tenantId:"pmc-synthetic-staging",applicationId:"pmc-document-worker",actorId:"pmc-document-worker",subjectId:"synthetic",locale:"ru",stage:"header",source:{id:"synthetic:document",version:"a".repeat(64),hash:"a".repeat(64),page:1,pageCount:2,mediaType:"application/pdf",contentHash:"b".repeat(64),data:"JVBERi0="}};
const receipt={tenantId:r.tenantId,applicationId:r.applicationId,actorId:r.actorId,subjectId:r.subjectId,sourceId:r.source.id,sourceVersion:r.source.version,sourceHash:r.source.hash,contentHash:r.source.contentHash,page:1,pageCount:2,provider:"google-document-ai+openai",model:"gpt-4.1-nano",processorVersion:"pretrained-ocr-v2.1-2024-08-07",policyVersion:"synthetic-v1",verification:"NOT_VERIFIED",usage:{inputTokens:100,outputTokens:30},attemptId:"11111111-1111-4111-8111-111111111111",rawEvidenceRef:"workflow:11111111-1111-4111-8111-111111111111"};
const response=()=>({version:"1",operationId:r.operationId,requestHash:externalRequestHash(r),outcome:"complete",text:"Printed text",receipt:{...receipt}});
beforeEach(()=>{vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_URL","https://staging.vivenoia.com/api/document-analysis");vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_TOKEN","s".repeat(43));vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_ENABLED","synthetic-staging");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://thylrayzjczsxlyqhtfc.supabase.co");});
afterEach(()=>vi.unstubAllEnvs());
it("dispatches to the separate fixed runtime with scoped source metadata, no private prompts and redirects denied",async()=>{
 const send=vi.fn<typeof fetch>(async()=>Response.json(response()));expect((await readExternalDocument(r,send)).outcome).toBe("complete");
 expect(send).toHaveBeenCalledOnce();const [url,init]=send.mock.calls[0];expect(url).toBe("https://staging.vivenoia.com/api/document-analysis");expect(init?.redirect).toBe("error");expect(JSON.parse(String(init?.body))).toEqual(r);
 expect(String(init?.body)).not.toMatch(/system|knowledge|methodology|questionnaire|history/);
});
it.each(["tenantId","applicationId","actorId","subjectId","sourceId","sourceVersion","sourceHash","contentHash","page","pageCount","verification"])("rejects altered receipt %s",key=>{const v=response();(v.receipt as Record<string,unknown>)[key]="foreign";expect(validateExternalResult(v,r).outcome).toBe("failed");});
it("rejects wrong operation and incomplete usage",()=>{expect(validateExternalResult({...response(),operationId:"another"},r).outcome).toBe("failed");expect(validateExternalResult({...response(),receipt:{...receipt,usage:null}},r).outcome).toBe("failed");});
it.each(["https://pythonmethodcenter.com/api/document-analysis","https://evil.example/api/document-analysis"])("denies unreviewed host %s before dispatch",async endpoint=>{vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_URL",endpoint);const send=vi.fn<typeof fetch>();expect((await readExternalDocument(r,send)).outcome).toBe("failed");expect(send).not.toHaveBeenCalled();});
it("denies production database, unknown outcomes and oversized replies without fallback",async()=>{
 const send=vi.fn<typeof fetch>(async()=>{throw new Error("timeout");});vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://zdrfttgwnyorifmpqgwe.supabase.co");expect((await readExternalDocument(r,send)).outcome).toBe("failed");expect(send).not.toHaveBeenCalled();
 vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://thylrayzjczsxlyqhtfc.supabase.co");expect(await readExternalDocument(r,send)).toEqual({outcome:"failed",code:"REMOTE_OUTCOME_UNKNOWN"});expect(send).toHaveBeenCalledOnce();
 const large=vi.fn<typeof fetch>(async()=>new Response("x".repeat(33000)));expect((await readExternalDocument(r,large)).outcome).toBe("failed");expect(large).toHaveBeenCalledOnce();
});

it("uses deployment protection only for the exact server-approved owned candidate",async()=>{
 const endpoint="https://vivenoia-core-staging-7d0gyg9dl-pythonsmethods-projects.vercel.app/api/document-analysis";
 vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_URL",endpoint);vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_PREVIEW_URL",endpoint);vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_PREVIEW_BYPASS","synthetic-protection-token");
 const send=vi.fn<typeof fetch>(async()=>Response.json(response()));expect((await readExternalDocument(r,send)).outcome).toBe("complete");
 expect(send.mock.calls[0][1]?.headers).toHaveProperty("x-vercel-protection-bypass","synthetic-protection-token");
 send.mockClear();vi.stubEnv("VIVENOIA_DOCUMENT_ANALYSIS_PREVIEW_URL",endpoint.replace("7d0gyg9dl","aaaaaaaaa"));expect((await readExternalDocument(r,send)).outcome).toBe("failed");expect(send).not.toHaveBeenCalled();
});
