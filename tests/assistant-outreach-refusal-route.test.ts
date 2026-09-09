import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audience: vi.fn(), stop: vi.fn(), save: vi.fn(), ai: vi.fn(), locale: "ru" as "ru" | "en"
}));
vi.mock("@/lib/assistant/tiers", () => ({ resolveAssistantAudience: mocks.audience }));
vi.mock("@/lib/assistant/history", () => ({ saveAssistantExchange: mocks.save }));
vi.mock("@/lib/assistant/outreach", async (original) => ({
  ...await original<typeof import("@/lib/assistant/outreach")>(), stopAssistantOutreach: mocks.stop
}));
vi.mock("@/lib/assistant/router", () => ({ askAnham: mocks.ai, askAssistantTeam: mocks.ai, chooseAnhamMode: vi.fn() }));
vi.mock("@/lib/i18n/api-errors", async (original) => ({
  ...await original<typeof import("@/lib/i18n/api-errors")>(), apiErrorLocale: async () => mocks.locale
}));
import { POST } from "@/app/api/assistant/client/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.locale = "ru";
  mocks.audience.mockResolvedValue({ profileId: "owner", caseId: null, tier: "registered" });
  mocks.stop.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
});
const request = (text: string) => new Request("https://example.test/api/assistant/client", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages: [{ role: "user", content: text }] })
});

describe("explicit refusal before AI processing", () => {
  it.each(["ru", "en"] as const)("persists and acknowledges %s refusal without an AI provider", async (locale) => {
    mocks.locale = locale;
    const text = locale === "ru" ? "Не пишите мне больше" : "Please stop messaging me";
    const response = await POST(request(text));
    expect(response.status).toBe(200);
    expect(mocks.stop).toHaveBeenCalledWith("owner");
    expect(mocks.ai).not.toHaveBeenCalled();
    const { reply } = await response.json();
    expect(reply).toContain(locale === "ru" ? "отключены" : "are off");
    expect(mocks.save).toHaveBeenCalledWith({ profileId: "owner", caseId: null, tier: "registered", question: text, answer: reply, locale });
  });
  it("does not falsely acknowledge a failed preference write", async () => {
    mocks.stop.mockRejectedValue(new Error("write failed"));
    const response = await POST(request("unsubscribe"));
    expect(response.status).toBe(503);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });
});
