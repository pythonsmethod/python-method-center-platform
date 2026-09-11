import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ init: vi.fn(), set_config: vi.fn(), opt_in_capturing: vi.fn(), capture: vi.fn(), stopSessionRecording: vi.fn(), opt_out_capturing: vi.fn(), getAndClearBuffer: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { init: m.init } }));
beforeEach(() => {
  vi.clearAllMocks(); vi.resetModules();
  vi.stubGlobal("window", { location: { pathname: "/", href: "https://example.com/" } });
  vi.stubGlobal("document", { cookie: "" });
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HEATMAPS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-only"); vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
  m.init.mockReturnValue({ ...m, heatmaps: { getAndClearBuffer: m.getAndClearBuffer } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("optional heatmap SDK lifecycle", () => {
  it("never initializes on a private route or with the flag disabled", async () => {
    const { startLandingHeatmaps } = await import("@/lib/product-analytics/heatmaps");
    window.location.pathname = "/cabinet"; startLandingHeatmaps("ru");
    window.location.pathname = "/"; vi.stubEnv("NEXT_PUBLIC_POSTHOG_HEATMAPS_ENABLED", "false"); startLandingHeatmaps("ru");
    await Promise.resolve(); expect(m.init).not.toHaveBeenCalled();
  });
  it("pins capture policy and stops listeners, discards buffers and opts out on departure", async () => {
    const { startLandingHeatmaps } = await import("@/lib/product-analytics/heatmaps");
    const stop = startLandingHeatmaps("en");
    await vi.waitFor(() => expect(m.init).toHaveBeenCalled());
    const config = m.init.mock.calls[0][1];
    expect(config).toMatchObject({ autocapture: false, capture_pageview: false, disable_session_recording: true, advanced_disable_flags: true, disable_external_dependency_loading: true, person_profiles: "never", persistence: "memory" });
    document.cookie = "pm-analytics-denied=1";
    expect(config.before_send({ uuid: "id", event: "$pageview", properties: {} })).toBeNull();
    stop();
    expect(m.getAndClearBuffer).toHaveBeenCalled(); expect(m.opt_out_capturing).toHaveBeenCalled();
    expect(config.before_send({ uuid: "id", event: "$pageview", properties: {} })).toBeNull();
  });
  it("cancels delayed initialization when the user leaves before import finishes", async () => {
    const { startLandingHeatmaps } = await import("@/lib/product-analytics/heatmaps");
    startLandingHeatmaps("ru")();
    await new Promise(resolve => setTimeout(resolve, 20)); expect(m.init).not.toHaveBeenCalled();
  });
});
