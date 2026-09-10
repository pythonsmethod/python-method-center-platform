import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ context: vi.fn(), audience: vi.fn(), guard: vi.fn(), ask: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/assistant/tiers", () => ({ resolveAssistantAudience: f.audience }));
vi.mock("@/lib/assistant/guard", () => ({ guardAssistantRequest: f.guard, guardAnhamDeepRequest: async () => false }));
vi.mock("@/lib/assistant/router", () => ({ askAnham: f.ask, askAssistantTeam: f.ask, chooseAnhamMode: () => "standard" }));
vi.mock("@/lib/assistant/history", () => ({ saveAssistantExchange: f.save }));
vi.mock("@/lib/assistant/prompts", () => ({ buildGuestSystemPrompt: async () => "", buildPaidClientSystemPrompt: async () => "", buildRegisteredSystemPrompt: async () => "", ATTACHMENT_READING_ACCURACY_RULE: "" }));
vi.mock("@/lib/assistant/red-flags", () => ({ extractRedFlag: (reply: string) => ({ cleanedReply: reply, category: null }), resolveRedFlag: () => null, recordRedFlagEvent: vi.fn() }));
vi.mock("@/lib/notifications/notify", () => ({ adminLink: () => "", notifyTeam: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/assistant/conversation-context", () => ({ conversationContext: f.context }));
import { POST } from "@/app/api/assistant/client/route";
const request = (extra = {}) => new Request("http://localhost/api/assistant/client", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }], locale: "en", ...extra }) });
beforeEach(() => {
  vi.clearAllMocks();
  f.audience.mockResolvedValue({ tier: "client", profileId: "client-id", caseId: "case-id" });
  f.guard.mockResolvedValue({ allowed: true });
  f.ask.mockResolvedValue({ status: "ok", reply: "Answer" });
  f.context.mockResolvedValue("Saved conversation: earlier topic");
  f.save.mockResolvedValue({ saved: true, messages: [{ role: "user", content: "Hello", created_at: "2026-09-09T00:00:00Z" }] });
});
describe("client history integration", () => {
  it("adds stored context to the model using server-resolved identity and case", async () => {
    await POST(request({ profileId: "attacker", caseId: "other-case" }));
    expect(f.context).toHaveBeenCalledWith({ profileId: "client-id", private: false, caseId: "case-id" }, "Hello");
    expect(f.ask.mock.calls[0][0]).toContain("Saved conversation: earlier topic");
  });
  it.each(["registered", "client"])("stores %s replies under the authenticated account", async tier => {
    f.audience.mockResolvedValue({ tier, profileId: "client-id", caseId: "case-id" });
    const response = await POST(request({ displayText: "Visible original" }));
    expect((await response.json()).saved).toBe(true);
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ profileId: "client-id", caseId: "case-id", tier, question: "Visible original", answer: "Answer", locale: "en" }));
  });
  it("stores displayed guard replies too", async () => {
    f.guard.mockResolvedValue({ allowed: false, message: "Please try later" });
    expect((await (await POST(request())).json()).saved).toBe(true);
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ answer: "Please try later" }));
    expect(f.ask).not.toHaveBeenCalled();
  });
  it("does not store guests", async () => {
    f.audience.mockResolvedValue({ tier: "guest", profileId: null, caseId: null });
    await POST(request()); expect(f.save).not.toHaveBeenCalled();
    expect(f.context).not.toHaveBeenCalled();
  });
  it("does not store intermediate attachment batches", async () => { await POST(request({ transient: true })); expect(f.save).not.toHaveBeenCalled(); });
  it("exposes an unacknowledged save", async () => {
    f.context.mockResolvedValue("Saved conversation: earlier topic");
  f.save.mockResolvedValue({ saved: false });
    expect(await (await POST(request())).json()).toEqual({ reply: "Answer", saved: false });
  });
});
