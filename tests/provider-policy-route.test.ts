import { beforeEach, expect, it, vi } from "vitest";
const f=vi.hoisted(()=>({ask:vi.fn(), audience:vi.fn(), save:vi.fn()}));
vi.mock("@/lib/assistant/tiers",()=>({resolveAssistantAudience:f.audience}));
vi.mock("@/lib/assistant/guard",()=>({guardAssistantRequest:async()=>({allowed:true}),guardAnhamDeepRequest:async()=>false}));
vi.mock("@/lib/assistant/router",()=>({askAnham:f.ask,askAssistantTeam:f.ask,askKarenAssistant:f.ask,chooseAnhamMode:()=>"standard"}));
vi.mock("@/lib/assistant/history",()=>({saveAssistantExchange:f.save}));
vi.mock("@/lib/assistant/prompts",()=>({buildGuestSystemPrompt:async()=>"",buildRegisteredSystemPrompt:async()=>"",buildPaidClientSystemPrompt:async()=>"",buildStaffSystemPrompt:async()=>"",ATTACHMENT_READING_ACCURACY_RULE:""}));
vi.mock("@/lib/i18n/locale",()=>({getLocale:async()=>"ru"}));
vi.mock("@/lib/auth/require-staff",()=>({getStaffUserState:async()=>({status:"authorized",userId:"synthetic",email:"test@example.test"})}));
vi.mock("@/lib/auth/require-karen",()=>({resolvePrivateAssistantRole:()=>"karen"}));
vi.mock("@/lib/auth/require-founder",()=>({canSeeProviderNames:()=>false}));
vi.mock("@/lib/assistant/case-context",()=>({buildCaseContext:async()=>""}));
import {POST as client} from "@/app/api/assistant/client/route";
import {POST as staff} from "@/app/api/assistant/staff/route";
import {providerPolicyRefusal} from "@/lib/assistant/policy-refusal";
beforeEach(()=>{vi.clearAllMocks();f.audience.mockResolvedValue({tier:"guest",profileId:null});f.save.mockResolvedValue(undefined);});
it.each([["client",client],["staff",staff]] as const)("%s follows EN-RU-EN interface locale instead of prompt language",async (_name,post)=>{
 for(const locale of ["en","ru","en"] as const){
  f.ask.mockResolvedValue(providerPolicyRefusal("ru"));
  const response=await post(new Request("https://example.test/api/assistant",{method:"POST",body:JSON.stringify({messages:[{role:"user",content:"synthetic"}],locale})}));
  expect(response.status).toBe(200);expect((await response.json()).reply).toBe(providerPolicyRefusal(locale).reply);
 }
});
