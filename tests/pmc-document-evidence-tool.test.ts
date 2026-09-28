import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ picture:vi.fn(), audit:vi.fn() }));
vi.mock("@/lib/analytical-picture/queries", () => ({getCaseAnalyticalPicture:mock.picture}));
vi.mock("@/lib/audit/log", () => ({writeAuditLog:mock.audit}));
import { DOCUMENT_EVIDENCE_TOOL, readCaseDocumentEvidence } from "@/lib/assistant/document-evidence-tool";
import { availableConversationTools, executeConversationArchiveTool, withConversationArchive } from "@/lib/assistant/conversation-archive";
import { runVoiceSiteTool, voiceSiteTools } from "@/lib/assistant/voice-site-tools";
const scope = {profileId:"11111111-1111-4111-8111-111111111111",private:true,caseId:"22222222-2222-4222-8222-222222222222"};
beforeEach(()=>{vi.clearAllMocks();mock.audit.mockResolvedValue({status:"inserted"});mock.picture.mockResolvedValue({status:"ready",picture:{extractedEvidence:Array.from({length:93},(_,i)=>({id:`e-${i}`,provenance:{page:i+1},trustState:"SOURCE_ONLY"})),documents:[],comparisons:[],missingContext:[]}});});
describe("shared selected-Case document evidence",()=>{
 it("offers the same paginated read operation in staff text and voice",async()=>{
  const text=await withConversationArchive(scope, async()=>{expect(availableConversationTools().some(t=>t.name===DOCUMENT_EVIDENCE_TOOL.name)).toBe(true);return executeConversationArchiveTool(DOCUMENT_EVIDENCE_TOOL.name,{offset:40,limit:40});});
  const actor={scope:"karen" as const,profileId:scope.profileId,caseId:scope.caseId,tier:"registered" as const,email:"karen@example.test"};
  expect(voiceSiteTools("karen",actor).some(t=>t.name===DOCUMENT_EVIDENCE_TOOL.name)).toBe(true);
  const voice=await runVoiceSiteTool(actor,DOCUMENT_EVIDENCE_TOOL.name,{offset:40,limit:40},"UTC");
  expect(voice).toEqual(text);expect(text).toMatchObject({caseId:scope.caseId,total:93,count:40,nextOffset:80});
  expect(await readCaseDocumentEvidence(scope,{offset:80},"text")).toMatchObject({count:13,nextOffset:null});
 });
 it("cannot change Case or select somebody's profile through model arguments",async()=>{
  expect(await readCaseDocumentEvidence(scope,{caseId:"foreign"},"text")).toEqual({status:"invalid"});
  expect(await readCaseDocumentEvidence({...scope,private:false},{},"text")).toEqual({status:"forbidden"});
  expect(await readCaseDocumentEvidence({...scope,caseId:null},{},"text")).toMatchObject({status:"select_case"});expect(mock.picture).not.toHaveBeenCalled();
 });
 it("does not claim evidence is absent when lookup or audit fails",async()=>{
  mock.picture.mockResolvedValue({status:"unavailable"});expect(await readCaseDocumentEvidence(scope,{},"text")).toMatchObject({status:"unavailable"});
 });
});
