import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ staff: vi.fn(), service: vi.fn(), rpc: vi.fn(), from: vi.fn(), count: { error: null as unknown, count: 4 as number | null } }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: mocks.staff }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));
vi.mock("@/lib/i18n/api-errors", () => ({ apiErrorLocale: async () => "en", apiError: (code: string) => code }));
import { getProductAnalytics, providerLinks, analyticsPromptContext } from "@/lib/product-analytics/summary";
import { GET } from "@/app/api/analytics/summary/route";

beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs();
  mocks.staff.mockResolvedValue({ status: "authorized", role: "admin", email: "dubrovenkoanna@gmail.com", userId: "founder" });
  mocks.count = { count: 4, error: null };
  mocks.rpc.mockResolvedValue({ data: { steps: [], daily: [{ day: "2026-09-01", events: 4 }] }, error: null });
  mocks.from.mockImplementation(() => {
    const chain = { select: vi.fn(() => chain), gte: vi.fn(() => chain), lt: vi.fn(() => chain), eq: vi.fn(() => chain), then: (resolve: (v: unknown) => unknown) => Promise.resolve(mocks.count).then(resolve) };
    return chain;
  });
  mocks.service.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
});

describe("founder aggregate data boundary", () => {
  it.each([
    { status: "unauthenticated" }, { status: "forbidden" },
    { status: "authorized", role: "support", email: "dubrovenkoanna@gmail.com" },
    { status: "authorized", role: "admin", email: "other@example.com" }
  ])("denies %j before touching service-role data", async (state) => {
    mocks.staff.mockResolvedValue(state);
    expect(await getProductAnalytics()).toEqual({ status: "forbidden" });
    expect(mocks.service).not.toHaveBeenCalled();
    const response = await GET(new Request("https://example.com/api/analytics/summary"));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("returns source-labelled counts for three explicit windows, without raw row reads", async () => {
    const result = await getProductAnalytics();
    expect(result.status).toBe("authorized");
    if (result.status !== "authorized") return;
    expect(result.current.operational?.[0].value).toBe(4);
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
    expect(mocks.from.mock.calls.map(([table]) => table)).not.toContain("client_cases");
    const compact = analyticsPromptContext(result);
    expect(JSON.stringify(compact)).not.toContain('"daily"');
    const response = await GET(new Request("https://example.com/api/analytics/summary"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("keeps missing schema and failed counters unknown, while preserving actual zero", async () => {
    mocks.count = { count: null, error: { message: "secret diagnostic" } };
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "missing function" } });
    const failed = await getProductAnalytics();
    expect(JSON.stringify(failed)).not.toContain("secret diagnostic");
    if (failed.status !== "authorized") return;
    expect(failed.current.operational?.[0].value).toBeNull();
    expect(failed.current.funnel?.status).toBe("unavailable");
    mocks.count = { count: 0, error: null };
    const empty = await getProductAnalytics();
    if (empty.status === "authorized") expect(empty.current.operational?.[0].value).toBe(0);
  });
  it("does not invent a provider connection from dashboard links", async () => {
    expect(providerLinks()).toEqual([]);
    vi.stubEnv("PRODUCT_ANALYTICS_HEATMAP_URL", "https://us.posthog.com/project/123/heatmaps");
    expect(providerLinks()[0].status).toBe("configured_link_only");
    for (const url of ["javascript:alert(1)", "https://evil.com/", "https://us.posthog.com/?token=secret", "https://user:pass@us.posthog.com/"]) {
      vi.stubEnv("PRODUCT_ANALYTICS_HEATMAP_URL", url); expect(providerLinks()).toEqual([]);
    }
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true"); vi.stubEnv("PRODUCT_ANALYTICS_SECRET", "a".repeat(32));
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HEATMAPS_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test"); vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
    const configured = await getProductAnalytics();
    if (configured.status === "authorized") expect(configured.provider).toMatchObject({ status: "configured_unverified", links: [] });
  });
});
