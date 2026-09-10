import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANHAM_RESPONSE_STYLE } from "@/lib/assistant/response-style";

const mocks = vi.hoisted(() => ({
  provider: vi.fn(), save: vi.fn(), audience: vi.fn(), role: vi.fn(), guard: vi.fn()
}));
vi.mock("@/lib/assistant/claude", async (original) => ({
  ...await original<typeof import("@/lib/assistant/claude")>(),
  askClaude: mocks.provider, hasClaudeEnv: () => true
}));
vi.mock("@/lib/assistant/router", () => ({
  askAssistantTeam: mocks.provider, askAnham: mocks.provider, askKarenAssistant: mocks.provider,
  chooseAnhamMode: () => "deep", isAssistantProvider: () => true
}));
vi.mock("@/lib/assistant/knowledge-search", () => ({ searchKnowledgeArchive: async () => ({ context: "", matches: 0, unavailable: false }) }));
vi.mock("@/lib/assistant/knowledge", () => ({ getKnowledgeForPrompt: async () => "" }));
vi.mock("@/lib/assistant/guard", () => ({ guardAssistantRequest: mocks.guard, guardAnhamDeepRequest: async () => true }));
vi.mock("@/lib/assistant/history", () => ({ saveAssistantExchange: mocks.save }));
vi.mock("@/lib/assistant/tiers", () => ({ resolveAssistantAudience: mocks.audience }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: async () => ({ status: "authorized", email: "staff@example.test" }) }));
vi.mock("@/lib/auth/require-karen", () => ({ resolvePrivateAssistantRole: mocks.role }));
vi.mock("@/lib/auth/require-founder", () => ({ canSeeProviderNames: () => false }));
vi.mock("@/lib/assistant/case-context", () => ({ buildCaseContext: async () => "Synthetic case only" }));
vi.mock("@/lib/i18n/api-errors", () => ({ apiErrorLocale: async () => "en", apiError: () => "**Service unavailable**", assistantFailure: () => "Service unavailable" }));

import { POST as client } from "@/app/api/assistant/client/route";
import { POST as staff } from "@/app/api/assistant/staff/route";

let sequence = 0;
const request = (locale: "ru" | "en", attached = false) => new Request("https://example.test/api/assistant/client", {
  method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${++sequence}` },
  body: JSON.stringify({ locale, messages: [{ role: "user", content: "Synthetic question" }],
    ...(attached ? { attachments: [{ name: "synthetic.txt", mediaType: "text/plain", data: "VGVzdA==" }] } : {})
  })
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provider.mockResolvedValue({ status: "ok", reply: "## Fact\n**TSH**: <3,2 mIU/L.\n\n- Needs Karen's review." });
  mocks.guard.mockResolvedValue({ allowed: true });
  mocks.audience.mockResolvedValue({ tier: "client", profileId: "synthetic", caseId: null, context: "Synthetic context" });
});

describe("server response style across audiences and languages", () => {
  it.each(["ru", "en"] as const)("uses the %s request locale for numeric annotations", async (locale) => {
    mocks.provider.mockResolvedValue({ status: "ok", reply: "~~5 mg~~\n\n- .5 mg/L\n> 5*10^9/L" });
    const expected = `${locale === "ru" ? "(зачёркнуто: 5 mg)" : "(struck out: 5 mg)"}\n\n- .5 mg/L\n> 5*10^9/L`;
    expect((await (await client(request(locale))).json()).reply).toBe(expected);
    mocks.role.mockReturnValue("karen");
    expect((await (await staff(request(locale))).json()).reply).toBe(expected);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ answer: expected, locale }));
  });

  for (const locale of ["ru", "en"] as const) {
    it.each(["guest", "registered", "client"])(`normalizes ${locale} %s replies before display and persistence`, async (tier) => {
      mocks.audience.mockResolvedValue({ tier, profileId: tier === "guest" ? null : "synthetic", caseId: null, context: null });
      const response = await client(request(locale));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.reply).toBe("Fact\nTSH: <3,2 mIU/L.\n\nNeeds Karen's review.");
      expect(mocks.provider.mock.calls[0][0]).toContain(ANHAM_RESPONSE_STYLE);
      if (tier === "guest") expect(mocks.save).not.toHaveBeenCalled();
      else expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ answer: body.reply, locale, question: "Synthetic question" }));
    });

    it.each(["founder", "karen"])(`normalizes ${locale} %s working replies with and without files`, async (role) => {
      mocks.role.mockReturnValue(role);
      for (const attached of [false, true]) {
        const response = await staff(request(locale, attached));
        expect((await response.json()).reply).toBe("Fact\nTSH: <3,2 mIU/L.\n\nNeeds Karen's review.");
        const prompt = mocks.provider.mock.lastCall?.[0];
        expect(prompt).toContain(ANHAM_RESPONSE_STYLE);
        expect(prompt).toContain(locale === "en" ? "Reply in English" : "Отвечай по-русски");
      }
    });
  }

  it("normalizes direct attachment output for a paid client", async () => {
    const response = await client(request("ru", true));
    expect((await response.json()).reply).not.toMatch(/[#*]/);
    expect(mocks.provider.mock.lastCall?.[3]).toEqual([{ name: "synthetic.txt", mediaType: "text/plain", data: "VGVzdA==" }]);
  });

  it("normalizes deterministic guard replies without calling a model", async () => {
    mocks.guard.mockResolvedValue({ allowed: false, message: "**Pause** — try later." });
    expect((await (await client(request("en"))).json()).reply).toBe("Pause, try later.");
    expect(mocks.provider).not.toHaveBeenCalled();
  });

  it("preserves the provider failure instead of converting it to a success", async () => {
    mocks.provider.mockResolvedValue({ status: "error", message: "Provider failed" });
    const response = await client(request("en"));
    expect(response.status).toBe(502);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects formatting-only output before storing an empty answer", async () => {
    mocks.provider.mockResolvedValue({ status: "ok", reply: "---\n\n***" });
    expect((await client(request("en"))).status).toBe(502);
    mocks.role.mockReturnValue("karen");
    expect((await staff(request("en"))).status).toBe(502);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("switches both ways on the same route without leaking the previous language instruction", async () => {
    mocks.role.mockReturnValue("karen");
    for (const locale of ["ru", "en", "ru"] as const) {
      await staff(request(locale));
      const prompt = mocks.provider.mock.lastCall?.[0];
      expect(prompt.endsWith(locale === "en" ? "Active interface language: English. Reply in English." : "Активный язык интерфейса: русский. Отвечай по-русски.")).toBe(true);
    }
  });
});
