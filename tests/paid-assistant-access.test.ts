import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPaidSupportProduct } from "@/lib/assistant/tiers";
import {
  getPaymentPlans,
  PERSONAL_SUPPORT_PRODUCT
} from "@/lib/payments/config";

describe("strongest assistant access", () => {
  it("publishes only the current assessment and Personal Support products", () => {
    const ru = getPaymentPlans("ru");
    const en = getPaymentPlans("en");

    expect(ru.map((plan) => plan.product)).toEqual([
      "preliminary_assessment",
      PERSONAL_SUPPORT_PRODUCT
    ]);
    expect(en.map((plan) => plan.product)).toEqual([
      "preliminary_assessment",
      PERSONAL_SUPPORT_PRODUCT
    ]);
    expect(ru[1].title).toBe("Личное сопровождение");
    expect(en[1].title).toBe("Personal Support");
    expect(ru[1].priceLine).toContain("$1,300");
    expect(en[1].priceLine).toContain("$1,300");
  });

  it("is unlocked by current Personal Support and historical paid support", () => {
    expect(isPaidSupportProduct("personal_support")).toBe(true);
    expect(isPaidSupportProduct("support_5_weeks")).toBe(true);
    expect(isPaidSupportProduct("support_15_weeks")).toBe(true);
  });

  it("is not unlocked by one-off or archived test access", () => {
    expect(isPaidSupportProduct("preliminary_assessment")).toBe(false);
    expect(isPaidSupportProduct("test_access")).toBe(false);
    expect(isPaidSupportProduct(null)).toBe(false);
  });

  it("routes only the client tier through Anham orchestration", () => {
    const route = readFileSync("app/api/assistant/client/route.ts", "utf8");

    expect(route).toContain('client: { provider: "best"');
    expect(route).toContain('audience.tier === "client"');
    expect(route).toContain("await askAnham(");
    expect(route).toContain("guardAnhamDeepRequest");
  });
});
