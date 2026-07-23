import { describe, expect, it } from "vitest";
import {
  PLAN_DURATION_DAYS,
  productFromAmount,
  servicePeriodEnd
} from "@/lib/payments/stripe";

describe("productFromAmount", () => {
  it("maps the 5-week total ($1,440) to support_5_weeks", () => {
    expect(productFromAmount(144000, "usd")).toBe("support_5_weeks");
  });

  it("maps the 100-day total ($3,675) to support_15_weeks", () => {
    expect(productFromAmount(367500, "USD")).toBe("support_15_weeks");
  });

  it("returns null for unknown amounts (manual review, never guess)", () => {
    expect(productFromAmount(500, "usd")).toBeNull();
    expect(productFromAmount(144001, "usd")).toBeNull();
    expect(productFromAmount(0, "usd")).toBeNull();
    expect(productFromAmount(null, "usd")).toBeNull();
  });

  it("returns null for non-USD currencies", () => {
    expect(productFromAmount(144000, "eur")).toBeNull();
  });
});

describe("servicePeriodEnd", () => {
  it("adds 35 days for the 5-week plan", () => {
    const start = new Date("2026-07-23T00:00:00Z");
    const end = servicePeriodEnd("support_5_weeks", start);
    expect(end.toISOString()).toBe("2026-08-27T00:00:00.000Z");
  });

  it("adds 100 days for the 100-day plan", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = servicePeriodEnd("support_15_weeks", start);
    const diffDays = (end.getTime() - start.getTime()) / 86_400_000;
    expect(diffDays).toBe(PLAN_DURATION_DAYS.support_15_weeks);
  });
});
