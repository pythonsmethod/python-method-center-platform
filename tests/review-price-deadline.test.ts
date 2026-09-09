import { afterEach, describe, expect, it, vi } from "vitest";
import { getReviewCopy, reviewPriceUsd, REVIEW_PRICE_END } from "@/lib/config/review";
import { getPaymentPlans } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { productFromAmount } from "@/lib/payments/stripe";
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe("dated review pricing", () => {
  it("switches at midnight Los Angeles, never sending 500 customers to the 299 link", () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK_REVIEW_299", "https://buy.stripe.com/review299");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK_REVIEW_500", "");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK_REVIEW", "");
    const before = new Date(Date.parse(REVIEW_PRICE_END)-1);
    const after = new Date(REVIEW_PRICE_END);
    expect(reviewPriceUsd(before)).toBe(299);
    expect(reviewPriceUsd(after)).toBe(500);
    expect(getPaymentPlans("ru", before)[0].paymentLinkUrl).toContain("review299");
    expect(getPaymentPlans("ru", after)[0].paymentLinkUrl).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PAYMENT_LINK_REVIEW", "https://buy.stripe.com/review500");
    expect(getPaymentPlans("en", after)[0].paymentLinkUrl).toContain("review500");
  });
  it.each(["ru", "en"] as const)("refreshes %s copy in a running process", locale => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    expect(getDictionary(locale).payment.planReviewPrice).toContain("299 USD");
    expect(getDictionary(locale).review.text).toContain(locale === "ru" ? "реабилитации" : "rehabilitation");
    vi.setSystemTime(new Date(REVIEW_PRICE_END));
    expect(getDictionary(locale).payment.planReviewPrice).toBe("500 USD");
    expect(getDictionary(locale).landing.paths.reviewNote).toBe("500 USD");
    expect(getReviewCopy(locale).price).toBe("500 USD");
  });
  it("recognizes both review totals and the 100-day total without adding 5%", () => {
    expect(productFromAmount(29900,"usd")).toBe("preliminary_assessment");
    expect(productFromAmount(50000,"usd")).toBe("preliminary_assessment");
    expect(productFromAmount(31395,"usd")).toBeNull();
    expect(productFromAmount(385500,"usd")).toBe("support_15_weeks");
  });
});
