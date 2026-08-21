import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPaidSupportProduct } from "@/lib/assistant/tiers";
import {
  getPaymentPlans,
  SUPPORT_100_DAY_PRODUCT
} from "@/lib/payments/config";

describe("strongest assistant access", () => {
  it("keeps the legacy id but presents the long plan as 100 days", () => {
    const ruPlan = getPaymentPlans("ru").find(
      (plan) => plan.product === SUPPORT_100_DAY_PRODUCT
    );
    const enPlan = getPaymentPlans("en").find(
      (plan) => plan.product === SUPPORT_100_DAY_PRODUCT
    );

    expect(SUPPORT_100_DAY_PRODUCT).toBe("support_15_weeks");
    expect(ruPlan?.title).toBe("Сопровождение — 100 дней");
    expect(enPlan?.title).toBe("Support — 100 days");
    expect(ruPlan?.title).not.toContain("15 недель");
    expect(enPlan?.title).not.toContain("15 weeks");
  });

  it("is unlocked by every current support tariff", () => {
    expect(isPaidSupportProduct("support_5_weeks")).toBe(true);
    expect(isPaidSupportProduct("support_15_weeks")).toBe(true);
  });

  it("is not unlocked by one-off or archived products", () => {
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
