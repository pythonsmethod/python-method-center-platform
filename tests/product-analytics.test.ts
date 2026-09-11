import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsPeriod, pageEvent, isBrowserEvent, ANALYTICS_RULES } from "@/lib/product-analytics/contract";
import { newJourney, readJourney } from "@/lib/product-analytics/session";
import { sanitizeHeatmapEvent } from "@/lib/product-analytics/heatmaps";
import { localizedHref, readLocaleFromPath } from "@/lib/i18n/routing";
import type { CaptureResult } from "posthog-js";
const recording = vi.hoisted(() => ({ values: {} as Record<string, string>, service: vi.fn(), rpc: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (key: string) => recording.values[key] ? { value: recording.values[key] } : undefined }) }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: recording.service }));

afterEach(() => vi.unstubAllEnvs());
describe("product analytics privacy and semantics", () => {
  it("starts disabled and rejects missing/short signing keys", () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "false");
    expect(newJourney()).toBeNull();
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true"); vi.stubEnv("PRODUCT_ANALYTICS_SECRET", "short");
    expect(newJourney()).toBeNull();
  });
  it("accepts only signed, unexpired server-issued browser journeys", () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true"); vi.stubEnv("PRODUCT_ANALYTICS_SECRET", "a".repeat(32));
    const now = Date.now(); const token = newJourney(now)!;
    expect(readJourney(token, now)).toMatch(/^[a-f0-9-]{36}$/);
    expect(readJourney(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"), now)).toBeNull();
    expect(readJourney(token, now + 31 * 86400000)).toBeNull();
  });
  it("keeps route and step when switching RU to EN and back", () => {
    for (const route of ["/", "/login", "/onboarding", "/cabinet", "/cabinet/health"]) {
      const en = localizedHref(route, "en");
      expect(pageEvent(en)).toBe(pageEvent(route));
      expect(readLocaleFromPath(en).path).toBe(route);
      expect(localizedHref(readLocaleFromPath(en).path, "ru")).toBe(route);
    }
    expect(pageEvent("/admin/cases/private-id")).toBeNull();
    expect(pageEvent("/auth/callback")).toBeNull();
    expect(isBrowserEvent("registration_completed")).toBe(false);
    expect(isBrowserEvent("chat_completed")).toBe(false);
  });
  it("rejects excessive, reversed and future windows", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    expect(analyticsPeriod(null, null, now)?.previousStart).toBe("2026-07-11T00:00:00.000Z");
    for (const [start, end] of [["bad", null], ["2026-09-10", null], ["2026-01-01", null], [null, "2026-10-01"]]) expect(analyticsPeriod(start, end, now)).toBeNull();
  });
  it("drops private pages, replay and autocapture even if remote configuration enables them", () => {
    for (const name of ["$snapshot", "$autocapture", "$identify", "$exception"]) expect(sanitizeHeatmapEvent({ uuid: "id", event: name, properties: {} }, "https://example.com/")).toBeNull();
    expect(sanitizeHeatmapEvent({ uuid: "id", event: "$$heatmap", properties: {} }, "https://example.com/cabinet")).toBeNull();
  });
  it("rebuilds heatmaps from bounded coordinates and strips all text, queries and person properties", () => {
    const event: CaptureResult = { uuid: "id", event: "$$heatmap", $set: { email: "secret" }, properties: {
      email: "secret", $referrer: "secret", distinct_id: "random-id", $viewport_width: 1200,
      $heatmap_data: { "https://example.com/?email=secret#secret": [{ x: 1, y: 2, type: "click", text: "secret", target_fixed: false }], "https://example.com/cabinet": [{ x: 5, y: 6, type: "click" }] }
    } };
    const result = sanitizeHeatmapEvent(event, "https://example.com/?token=secret");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result?.properties.$heatmap_data).toEqual({ "https://example.com/": [{ x: 1, y: 2, type: "click", target_fixed: false }] });
    expect(result?.$set).toBeUndefined();
  });
  it("requires evidence and separates row counters from conversion and unknown from zero", () => {
    expect(ANALYTICS_RULES).toContain("не ноль");
    expect(ANALYTICS_RULES).toContain("не когортная воронка");
    expect(ANALYTICS_RULES).toContain("configured_link_only");
  });
  it("honors immediate denial even when an older signed grant remains after a failed withdrawal request", async () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true"); vi.stubEnv("PRODUCT_ANALYTICS_SECRET", "a".repeat(32));
    recording.values = { "pm-analytics-consent": "v1", "pm-analytics-journey": newJourney()!, "pm-analytics-denied": "1" };
    const { recordProductEvent } = await import("@/lib/product-analytics/record");
    expect(await recordProductEvent("chat_completed", "en")).toBe(false);
    expect(recording.service).not.toHaveBeenCalled();
    delete recording.values["pm-analytics-denied"];
    recording.rpc.mockResolvedValue({ error: null }); recording.service.mockReturnValue({ rpc: recording.rpc });
    expect(await recordProductEvent("chat_completed", "en")).toBe(true);
    expect(recording.rpc.mock.calls[0][1]).toEqual({ p_journey: readJourney(recording.values["pm-analytics-journey"]), p_event: "chat_completed", p_locale: "en" });
  });
});
