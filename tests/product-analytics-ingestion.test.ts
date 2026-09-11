import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ record: vi.fn(), server: vi.fn(), allow: vi.fn() }));
vi.mock("@/lib/product-analytics/record", () => ({ recordProductEvent: mocks.record }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
import { POST } from "@/app/api/analytics/events/route";
import { setBrowserAnalyticsConsent, trackProductEvent } from "@/lib/product-analytics/browser";

function request(body: unknown, origin = "https://example.com") {
  return new Request("https://example.com/api/analytics/events", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); mocks.record.mockResolvedValue(true); mocks.server.mockResolvedValue(null); });
describe("analytics collection boundary", () => {
  it("rejects forged completion events, arbitrary properties, oversized bodies and foreign origins", async () => {
    for (const event of ["registration_completed", "onboarding_completed", "chat_completed"]) expect((await POST(request({ event, locale: "ru" }))).status).toBe(400);
    expect((await POST(request({ event: "landing_view", locale: "en", email: "secret" }))).status).toBe(400);
    expect((await POST(request({ data: "x".repeat(300) }))).status).toBe(400);
    expect((await POST(request({ event: "landing_view", locale: "en" }, "https://evil.com"))).status).toBe(403);
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("requires client authentication for protected page views", async () => {
    expect((await POST(request({ event: "cabinet_view", locale: "en" }))).status).toBe(403);
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("sends only the event vocabulary and locale to the consent-checking recorder", async () => {
    expect((await POST(request({ event: "landing_view", locale: "en" }))).status).toBe(204);
    expect(mocks.record).toHaveBeenCalledWith("landing_view", "en");
  });
  it("does not even issue collection requests before consent or after withdrawal", () => {
    const fetch = vi.fn(() => Promise.resolve({})); vi.stubGlobal("window", {}); vi.stubGlobal("fetch", fetch);
    setBrowserAnalyticsConsent(false); trackProductEvent("landing_view", "ru"); expect(fetch).not.toHaveBeenCalled();
    setBrowserAnalyticsConsent(true); trackProductEvent("landing_view", "ru"); expect(fetch).toHaveBeenCalledTimes(1);
    setBrowserAnalyticsConsent(false); trackProductEvent("landing_view", "ru"); expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
