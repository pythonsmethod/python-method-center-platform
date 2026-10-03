import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { renderPublishedReport, type PublishedReport } from "@/lib/cases/report-pdf";
const mocks = vi.hoisted(()=>({user:vi.fn(),from:vi.fn(),report:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:async()=>({auth:{getUser:mocks.user}})}));
vi.mock("@/lib/supabase/service",()=>({createSupabaseServiceClient:()=>({from:mocks.from})}));
vi.mock("@/lib/auth/require-karen",()=>({canAccessProfessorMessages:(email:string)=>email==="karen@example.test"}));
vi.mock("@/lib/cases/published-report",()=>({ensurePublishedReport:mocks.report}));
import { GET } from "@/app/api/cases/report/route";
const caseId="11111111-1111-4111-8111-111111111111",approvalId="22222222-2222-4222-8222-222222222222";
const report:PublishedReport={id:approvalId,approved_at:"2026-10-02T12:00:00Z",documents_fingerprint:"pmc1:"+"a".repeat(32),approved_text:"Синтетический пример. Карен проверяет источник.\nSynthetic example. Karen reviews the source.\nCRP: 5 mg/L — печатное значение, без диагноза.",report_snapshot:{version:"1",documents:[{id:"source",name:"synthetic.pdf",uploadedAt:"2026-10-02T11:00:00Z",pageCount:2,sourceHash:"b".repeat(64),header:{collectionDatePrinted:"01/02/2026"}}]}};
const font=readFileSync("public/fonts/Ubuntu-R.ttf");
beforeEach(()=>{
 vi.clearAllMocks();mocks.user.mockResolvedValue({data:{user:{id:"client",email:"client@example.test"}},error:null});
 mocks.from.mockImplementation((table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==="profiles"?{role:"client",status:"active"}:{profile_id:"client"},error:null})};return q;});
 mocks.report.mockResolvedValue(new Uint8Array([37,80,68,70]));
});
const request=(query=`case=${caseId}&approval=${approvalId}&locale=en`,headers={})=>new Request(`https://pmc.example/api/cases/report?${query}`,{headers});
it.each(["ru","en"] as const)("renders an immutable multipage-safe PDF with Cyrillic and exact approved text (%s)",async locale=>{
 const bytes=await renderPublishedReport(report,locale,font);
 expect(bytes).toEqual(await renderPublishedReport(report,locale,font));
 expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
 mkdirSync("output/pdf",{recursive:true});writeFileSync(`output/pdf/synthetic-published-${locale}.pdf`,bytes);
});
it("rejects missing snapshots and unsupported characters rather than drop content",async()=>{
 await expect(renderPublishedReport({...report,report_snapshot:{version:"0",documents:[]}},"ru",font)).rejects.toThrow();
 await expect(renderPublishedReport({...report,approved_text:"\u{1f9ec}"},"en",font)).rejects.toThrow("UNSUPPORTED_REPORT_CHARACTER");
});
it("denies unauthenticated, malformed/oversized and wrong-owner access",async()=>{
 mocks.user.mockResolvedValueOnce({data:{user:null},error:null});expect((await GET(request())).status).toBe(401);
 expect((await GET(request("case=bad&approval=bad"))).status).toBe(400);
 expect((await GET(request(undefined,{"Content-Length":"9000000"}))).status).toBe(400);
 mocks.from.mockImplementation((table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==="profiles"?{role:"client",status:"active"}:{profile_id:"another-tenant"},error:null})};return q;});
 expect((await GET(request())).status).toBe(403);expect(mocks.report).not.toHaveBeenCalled();
});
it.each(["suspended","closed","registered",null])("denies inactive or uncertain accounts (%s)",async status=>{
 mocks.from.mockImplementation(()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{role:"client",status},error:null})};return q;});
 expect((await GET(request())).status).toBe(403);expect(mocks.report).not.toHaveBeenCalled();
});
it("denies staff outside Karen and never serves a draft",async()=>{
 mocks.user.mockResolvedValue({data:{user:{id:"staff",email:"other@example.test"}},error:null});
 mocks.from.mockImplementation((table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==="profiles"?{role:"admin",status:"active"}:{profile_id:"client"},error:null})};return q;});
 expect((await GET(request())).status).toBe(403);
 mocks.user.mockResolvedValue({data:{user:{id:"staff",email:"karen@example.test"}},error:null});mocks.report.mockRejectedValue(new Error("NOT_PUBLISHED"));
 expect((await GET(request())).status).toBe(409);
});
it("returns the published PDF with private no-store and attachment headers",async()=>{
 const r=await GET(request());expect(r.status).toBe(200);expect(r.headers.get("Content-Type")).toBe("application/pdf");expect(r.headers.get("Cache-Control")).toBe("private, no-store");expect(mocks.report).toHaveBeenCalledWith(approvalId,"en",caseId);
});
