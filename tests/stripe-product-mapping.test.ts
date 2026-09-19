import { describe, expect, it } from "vitest";
import {
  PLAN_DURATION_DAYS,
  personalSupportMonthsFromAmount,
  productFromAmount,
  productFromMetadata,
  resolveStripeProduct,
  servicePeriodEnd,
  supportMonthsFromMetadata
} from "@/lib/payments/stripe";

describe("current payment mapping", () => {
  it("maps 1-12 exact 1,300 USD periods to one Personal Support product", () => {
    expect(productFromAmount(130000, "usd")).toBe("personal_support");
    expect(productFromAmount(390000, "USD")).toBe("personal_support");
    expect(personalSupportMonthsFromAmount(390000, "usd")).toBe(3);
    expect(personalSupportMonthsFromAmount(1_560_000, "usd")).toBe(12);
    expect(productFromAmount(1_690_000, "usd")).toBeNull();
  });

  it("uses Payment Link metadata before amount and reads selected months", () => {
    expect(productFromMetadata({ product: "personal_support" })).toBe(
      "personal_support"
    );
    expect(
      resolveStripeProduct({
        metadata: { product: "personal_support", months: "6" },
        amountCents: 1,
        currency: "usd"
      })
    ).toBe("personal_support");
    expect(
      supportMonthsFromMetadata(
        { product: "personal_support", months: "6" },
        1,
        "usd"
      )
    ).toBe(6);
  });

  it("rejects unknown, malformed and non-USD totals", () => {
    expect(productFromAmount(130001, "usd")).toBeNull();
    expect(productFromAmount(0, "usd")).toBeNull();
    expect(productFromAmount(null, "usd")).toBeNull();
    expect(productFromAmount(130000, "eur")).toBeNull();
  });
});

describe("legacy payment compatibility", () => {
  it("still recognizes already-issued 5-week and 100-day links", () => {
    expect(productFromAmount(144000, "usd")).toBe("support_5_weeks");
    expect(productFromAmount(385500, "usd")).toBe("support_15_weeks");
    expect(productFromMetadata({ product: "support_5_weeks" })).toBe(
      "support_5_weeks"
    );
    expect(productFromMetadata({ product: "support_100_days" })).toBe(
      "support_15_weeks"
    );
  });
});

describe("servicePeriodEnd", () => {
  it("uses 30 paid days per selected Personal Support month", () => {
    const start = new Date("2026-09-19T00:00:00Z");
    expect(servicePeriodEnd("personal_support", start, 1).toISOString()).toBe(
      "2026-10-19T00:00:00.000Z"
    );
    expect(servicePeriodEnd("personal_support", start, 3).toISOString()).toBe(
      "2026-12-18T00:00:00.000Z"
    );
  });

  it("preserves legacy durations for historical periods", () => {
    expect(PLAN_DURATION_DAYS.support_5_weeks).toBe(35);
    expect(PLAN_DURATION_DAYS.support_15_weeks).toBe(100);
  });
});
