import { describe, expect, it } from "vitest";
import {
  PERSONAL_SUPPORT_MONTHLY_USD,
  PLAN_100D_TOTAL_USD,
  PLAN_5W_TOTAL_USD
} from "@/lib/payments/config";
import { productFromAmount, servicePeriodEnd } from "@/lib/payments/stripe";

describe("published and historical payment products", () => {
  it("no longer recognises the retired $3 tester payment", () => {
    expect(productFromAmount(300, "usd")).toBeNull();
  });

  it("keeps an already-issued focus-group period valid for 14 days", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    expect(servicePeriodEnd("test_access", start).toISOString()).toBe(
      "2026-08-15T00:00:00.000Z"
    );
  });

  it("recognises current Personal Support totals", () => {
    expect(productFromAmount(PERSONAL_SUPPORT_MONTHLY_USD * 100, "usd")).toBe(
      "personal_support"
    );
    expect(
      productFromAmount(PERSONAL_SUPPORT_MONTHLY_USD * 6 * 100, "usd")
    ).toBe("personal_support");
  });

  it("keeps historical fixed-plan payments readable", () => {
    expect(productFromAmount(PLAN_5W_TOTAL_USD * 100, "usd")).toBe(
      "support_5_weeks"
    );
    expect(productFromAmount(PLAN_100D_TOTAL_USD * 100, "usd")).toBe(
      "support_15_weeks"
    );
  });

  it("sends near-miss amounts to manual review", () => {
    expect(productFromAmount(129999, "usd")).toBeNull();
    expect(productFromAmount(130000, "eur")).toBeNull();
  });
});
