import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({ service: vi.fn(), from: vi.fn(), remove: vi.fn(), lt: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));

import { purgeExpiredProductEvents } from "@/lib/product-analytics/retention";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lt.mockResolvedValue({ error: null });
  mocks.remove.mockReturnValue({ lt: mocks.lt });
  mocks.from.mockReturnValue({ delete: mocks.remove });
  mocks.service.mockReturnValue({ from: mocks.from });
});
afterEach(() => vi.unstubAllEnvs());

describe("product analytics retention", () => {
  it("does not touch storage while collection is disabled", async () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "false");
    expect(await purgeExpiredProductEvents()).toBe("disabled");
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it("deletes only product events older than 90 days", async () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true");
    vi.stubEnv("PRODUCT_ANALYTICS_SECRET", "a".repeat(32));
    expect(await purgeExpiredProductEvents(new Date("2026-09-13T00:00:00Z"))).toBe("completed");
    expect(mocks.from).toHaveBeenCalledWith("product_events");
    expect(mocks.remove).toHaveBeenCalledWith();
    expect(mocks.lt).toHaveBeenCalledWith("occurred_at", "2026-06-15T00:00:00.000Z");
  });

  it("fails closed without returning database diagnostics", async () => {
    vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true");
    vi.stubEnv("PRODUCT_ANALYTICS_SECRET", "a".repeat(32));
    mocks.lt.mockResolvedValue({ error: { message: "secret database detail" } });
    expect(await purgeExpiredProductEvents()).toBe("unavailable");
  });

  it("reuses the existing daily authenticated cron instead of adding a schedule", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.crons).toContainEqual({ path: "/api/cron/assistant-outreach", schedule: "20 15 * * *" });
    expect(config.crons).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "/api/cron/product-analytics-retention" })
    ]));
  });
});
