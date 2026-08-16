import { describe, expect, it } from "vitest";
import {
  PLAN_100D_TOTAL_USD,
  PLAN_5W_TOTAL_USD
} from "@/lib/payments/config";
import { productFromAmount, servicePeriodEnd } from "@/lib/payments/stripe";

describe("published payment products", () => {
  it("no longer recognises the retired $3 tester payment", () => {
    expect(productFromAmount(300, "usd")).toBeNull();
  });

  it("keeps an already-issued focus-group period valid for 14 days", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");

    expect(servicePeriodEnd("test_access", start).toISOString()).toBe(
      "2026-08-15T00:00:00.000Z"
    );
  });

  it("keeps the real plans untouched", () => {
    expect(productFromAmount(PLAN_5W_TOTAL_USD * 100, "usd")).toBe(
      "support_5_weeks"
    );
    expect(productFromAmount(PLAN_100D_TOTAL_USD * 100, "usd")).toBe(
      "support_15_weeks"
    );
  });

  it("sends a near-miss amount to manual review instead of guessing", () => {
    expect(productFromAmount(299, "usd")).toBeNull();
    expect(productFromAmount(500, "usd")).toBeNull();
    expect(productFromAmount(300, "eur")).toBeNull();
  });
});
