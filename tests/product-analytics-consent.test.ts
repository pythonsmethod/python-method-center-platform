import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  values: {} as Record<string, string>,
  service: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => mocks.values[key] ? { value: mocks.values[key] } : undefined
  })
}));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));

import { POST } from "@/app/api/analytics/consent/route";

function request(body: string, origin = "https://example.com") {
  return new Request("https://example.com/api/analytics/consent", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.values = {};
  mocks.service.mockReturnValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe("analytics consent boundary", () => {
  it("rejects cross-origin, malformed and oversized requests", async () => {
    expect((await POST(request('{"granted":true}', "https://evil.example"))).status).toBe(403);
    expect((await POST(request('{"granted":"yes"}'))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ granted: true, padding: "x".repeat(300) })))).status).toBe(400);
  });

  it("fails closed when collection is disabled", async () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "false");
    expect((await POST(request('{"granted":true}'))).status).toBe(503);
  });

  it("issues server-signed HttpOnly consent and journey cookies only when enabled", async () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true");
    vi.stubEnv("PRODUCT_ANALYTICS_SECRET", "a".repeat(32));
    const response = await POST(request('{"granted":true}'));
    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie().join("\n");
    expect(cookies).toContain("pm-analytics-consent=v1");
    expect(cookies).toContain("pm-analytics-journey=");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=lax");
  });
});
