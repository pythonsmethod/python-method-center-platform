import {expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/service",()=>({createSupabaseServiceClient:()=>({from:()=>{const q={select:()=>q,eq:()=>q,in:()=>q,or:()=>q,order:()=>q,limit:async()=>({error:null,data:[{id:"private",title:"private",content:"SYNTHETIC_PRIVATE_METHOD_SECRET",collection:"method"},{id:"public",title:"general",content:"SYNTHETIC_PUBLIC_GUIDANCE",collection:"general"}]})};return q;}})}));
import {getKnowledgeForPrompt} from "@/lib/assistant/knowledge";
it("never puts a misclassified method entry into client model context",async()=>{const context=await getKnowledgeForPrompt("client");expect(context).not.toContain("SYNTHETIC_PRIVATE_METHOD_SECRET");expect(context).toContain("SYNTHETIC_PUBLIC_GUIDANCE");});
it("keeps method material available only in the private staff context",async()=>{expect(await getKnowledgeForPrompt("staff")).toContain("SYNTHETIC_PRIVATE_METHOD_SECRET");});
