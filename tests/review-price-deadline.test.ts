import { describe, expect, it } from "vitest";
import { getReviewCopy, reviewPriceUsd, REVIEW_PRICE_USD } from "@/lib/config/review";
import { getPaymentPlans } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { productFromAmount } from "@/lib/payments/stripe";

describe("permanent condition-assessment pricing", () => {
  it("stays 299 USD across dates", () => {

    for (const date of [
      new Date("2026-09-19T00:00:00Z"),
      new Date("2026-12-01T08:00:00Z"),
      new Date("2027-12-01T08:00:00Z")
    ]) {
      expect(reviewPriceUsd(date)).toBe(299);
      expect(getPaymentPlans("ru", date)[0].priceLine).toContain("299 USD");
    }

    expect(REVIEW_PRICE_USD).toBe(299);
  });

  it.each(["ru", "en"] as const)("keeps %s copy at 299 USD", (locale) => {
    expect(getDictionary(locale).payment.planReviewPrice).toContain("299 USD");
    expect(getReviewCopy(locale).price).toContain("299 USD");
    expect(getDictionary(locale).review.text).toContain(
      locale === "ru" ? "реабилитации" : "rehabilitation"
    );
  });

  it("recognizes the current review total but not the retired 500 total", () => {
    expect(productFromAmount(29900, "usd")).toBe("preliminary_assessment");
    expect(productFromAmount(50000, "usd")).toBeNull();
    expect(productFromAmount(31395, "usd")).toBeNull();
  });
});
