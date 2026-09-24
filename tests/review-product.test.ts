import { describe, expect, it } from "vitest";
import { buildGuestSystemPrompt } from "@/lib/assistant/prompts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { OFFER_VERSION } from "@/lib/legal/offer";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";
import { REFUND_CONTENT } from "@/lib/legal/policy-content";
import {
  getPaymentPlans,
  PERSONAL_SUPPORT_MONTHLY_USD,
  REVIEW_PRODUCT,
  REVIEW_TOTAL_USD
} from "@/lib/payments/config";
import { isPlanProduct } from "@/lib/payments/service-period";
import { productFromAmount, productFromMetadata } from "@/lib/payments/stripe";
import { navRoutes } from "@/lib/routes";
import sitemap from "@/app/sitemap";

const clause = (locale: "ru" | "en") =>
  OFFER_CONTENT[locale].sections.flatMap((s) => s.paragraphs ?? []).join("\n");

describe("condition assessment — permanent 299 USD one-time service", () => {
  it("is the first current service and is never a support period", () => {
    for (const locale of ["ru", "en"] as const) {
      const [first] = getPaymentPlans(locale);
      expect(first.product).toBe(REVIEW_PRODUCT);
      expect(first.priceLine).toContain("299 USD");
    }

    expect(REVIEW_TOTAL_USD).toBe(299);
    expect(productFromAmount(29900, "usd")).toBe(REVIEW_PRODUCT);
    expect(productFromAmount(50000, "usd")).toBeNull();
    expect(productFromMetadata({ product: "condition_assessment" })).toBe(
      REVIEW_PRODUCT
    );
    expect(isPlanProduct(REVIEW_PRODUCT)).toBe(false);
  });

  it("publishes exactly two current services", () => {
    const plans = getPaymentPlans("en");
    expect(plans).toHaveLength(2);
    expect(plans.map((plan) => plan.product)).toEqual([
      "preliminary_assessment",
      "personal_support"
    ]);
    expect(plans[1].priceLine).toContain("$1,300");
    expect(PERSONAL_SUPPORT_MONTHLY_USD).toBe(1300);
    expect(plans[1].supportOptions).toHaveLength(12);
  });

  it("uses oferta-v9 with the new payment and gift terms in both languages", () => {
    expect(OFFER_VERSION).toBe("oferta-v9");

    expect(clause("ru")).toContain("299 USD, разовая оплата");
    expect(clause("ru")).toContain("1 300 USD");
    expect(clause("ru")).toContain("30-дневный");
    expect(clause("ru")).toContain("предоставляется клиенту в подарок");
    expect(clause("ru")).toContain("Доставка подарочной формулы включена");
    expect(clause("ru")).not.toContain("200 капсул");
    expect(clause("ru")).not.toContain("600 капсул");

    expect(clause("en")).toContain("299 USD as a one-time payment");
    expect(clause("en")).toContain("1,300 USD");
    expect(clause("en")).toContain("30-day");
    expect(clause("en")).toContain("complimentary gift");
    expect(clause("en")).toContain("Delivery of the complimentary formula is included");
    expect(clause("en")).not.toContain("200 capsules");
    expect(clause("en")).not.toContain("600 capsules");
  });

  it("teaches Anham the new price without exposing capsule quantity", async () => {
    const prompt = await buildGuestSystemPrompt();
    expect(prompt).toContain("299 USD");
    expect(prompt).toContain("$1,300");
    expect(prompt).toContain("30-днев");
    expect(prompt).not.toContain("200 капсул");
    expect(prompt).not.toContain("600 капсул");
    expect(prompt).not.toContain("$180");
    expect(prompt).not.toContain("$1440");
    expect(prompt).not.toContain("$3855");
  });
});

describe("public copy consistency", () => {
  it("contains no free assessment, retired fixed-plan pricing or capsule quantity", () => {
    for (const locale of ["ru", "en"] as const) {
      const d = getDictionary(locale);
      const text = [
        JSON.stringify(d.review),
        JSON.stringify(d.reviewDetails),
        JSON.stringify(d.payment),
        JSON.stringify(d.nav),
        JSON.stringify(d.meta),
        JSON.stringify(d.landing.paths),
        d.professor.ctaText,
        d.professor.ctaReview
      ].join("\n");

      expect(text, locale).not.toMatch(/бесплатн/i);
      expect(text, locale).not.toMatch(/\bfree\b/i);
      expect(text, locale).not.toMatch(/\$1[ ,]?440|\$3[ ,]?855/i);
      expect(text, locale).not.toMatch(/200\s+(капсул|capsules)/i);
      expect(text, locale).not.toMatch(/600\s+(капсул|capsules)/i);
    }
  });

  it("keeps refund terms aligned with the current two-service model", () => {
    const refund = (locale: "ru" | "en") =>
      REFUND_CONTENT[locale].sections
        .flatMap((s) => [s.heading, ...(s.paragraphs ?? [])])
        .join("\n");

    expect(refund("ru")).toContain("1 300 USD");
    expect(refund("ru")).toContain("Продление сопровождения");
    expect(refund("ru")).not.toContain("1 440 USD");
    expect(refund("ru")).not.toContain("3 855 USD");

    expect(refund("en")).toContain("1,300 USD");
    expect(refund("en")).toContain("Extending Personal Support");
    expect(refund("en")).not.toContain("1,440 USD");
    expect(refund("en")).not.toContain("3,855 USD");
  });

  it("keeps the retired standalone review route out of navigation and sitemap", () => {
    expect(navRoutes.some((route) => route.href === "/review")).toBe(false);
    expect(sitemap().some((entry) => entry.url.endsWith("/review"))).toBe(false);
  });
});
