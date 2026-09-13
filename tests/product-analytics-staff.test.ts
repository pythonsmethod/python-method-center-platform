import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ staff: vi.fn(), summary: vi.fn(), ask: vi.fn() }));
vi.mock("@/lib/auth/require-private-assistant", () => ({ getPrivateAssistantUserState: m.staff }));
vi.mock("@/lib/product-analytics/summary", () => ({ getProductAnalytics: m.summary, analyticsPromptContext: (value: unknown) => value }));
vi.mock("@/lib/assistant/prompts", () => ({ buildStaffSystemPrompt: async () => "BASE", ATTACHMENT_READING_ACCURACY_RULE: "FILES" }));
vi.mock("@/lib/assistant/router", () => ({ askKarenAssistant: m.ask, askAssistantTeam: m.ask, isAssistantProvider: () => false }));
vi.mock("@/lib/assistant/claude", () => ({ sanitizeChatMessages: (v: unknown) => v, hasClaudeEnv: () => false, askClaude: m.ask }));
vi.mock("@/lib/assistant/case-context", () => ({ buildCaseContext: async () => null }));
vi.mock("@/lib/i18n/api-errors", () => ({ apiErrorLocale: async () => "en", apiError: () => "No access" }));
import { POST } from "@/app/api/assistant/staff/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("KAREN_EMAILS", "karen@example.com");
  m.staff.mockResolvedValue({ status: "authorized", role: "admin", email: "dubrovenkoanna@gmail.com", userId: "founder" });
  m.summary.mockResolvedValue({ status: "authorized", measured: 4 });
  m.ask.mockResolvedValue({ status: "ok", reply: "A measured answer" });
});
const request = () => new Request("https://example.com/api/assistant/staff", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Where do people drop off?" }], analytics: { measured: 99999 } }) });
describe("analytics reaches only the founder assistant through server context", () => {
  it("injects the fresh server result and ignores caller-supplied analytics", async () => {
    expect((await POST(request())).status).toBe(200);
    const system = m.ask.mock.calls[0][0] as string;
    expect(system).toContain("PRODUCT_ANALYTICS"); expect(system).toContain('"measured":4');
    expect(system).not.toContain("99999"); expect(system).toContain("Active interface language: English");
  });
  it("never reads or injects product analytics for Karen", async () => {
    m.staff.mockResolvedValue({ status: "authorized", role: "admin", email: "karen@example.com" });
    expect((await POST(request())).status).toBe(200);
    expect(m.summary).not.toHaveBeenCalled(); expect(m.ask.mock.calls[0][0]).not.toContain("PRODUCT_ANALYTICS");
  });
  it("rejects other staff without reading analytics or calling an LLM", async () => {
    m.staff.mockResolvedValue({ status: "authorized", role: "support", email: "support@example.com" });
    expect((await POST(request())).status).toBe(403);
    expect(m.summary).not.toHaveBeenCalled(); expect(m.ask).not.toHaveBeenCalled();
  });
});
