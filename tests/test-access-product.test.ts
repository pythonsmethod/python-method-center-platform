import { describe, expect, it } from "vitest";
import {
  PLAN_100D_TOTAL_USD,
  PLAN_5W_TOTAL_USD,
  TEST_ACCESS_TOTAL_USD
} from "@/lib/payments/config";
import { productFromAmount, servicePeriodEnd } from "@/lib/payments/stripe";

describe("test access product", () => {
  it("recognises exactly $3 as the tester product", () => {
    expect(productFromAmount(TEST_ACCESS_TOTAL_USD * 100, "usd")).toBe(
      "test_access"
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
    expect(productFromAmount(TEST_ACCESS_TOTAL_USD * 100, "eur")).toBeNull();
  });

  it("opens test access for two weeks", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");

    expect(servicePeriodEnd("test_access", start).toISOString()).toBe(
      "2026-08-15T00:00:00.000Z"
    );
  });
});
