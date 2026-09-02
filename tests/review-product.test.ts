import { describe, expect, it } from "vitest";
import { buildGuestSystemPrompt } from "@/lib/assistant/prompts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { OFFER_VERSION } from "@/lib/legal/offer";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";
import { REFUND_CONTENT } from "@/lib/legal/policy-content";
import { getPaymentPlans, REVIEW_PRODUCT, REVIEW_TOTAL_USD } from "@/lib/payments/config";
import { isPlanProduct } from "@/lib/payments/service-period";
import { productFromAmount, productFromMetadata } from "@/lib/payments/stripe";
import { navRoutes } from "@/lib/routes";
import sitemap from "@/app/sitemap";

// The analyses review is a paid format at 500 USD, set by the founder on
// 2 September 2026 when the launch promotion that offered it free ended.
// These tests hold the site, the contract, the assistant and the payment
// machinery to that one fact — and keep the word "free" from creeping back
// into any of them.

const clause = (locale: "ru" | "en") =>
  OFFER_CONTENT[locale].sections.flatMap((s) => s.paragraphs ?? []).join("\n");

describe("разбор анализов — платный формат за 500 USD", () => {
  it("стоит первым среди тарифов, с ценой и итогом", () => {
    for (const locale of ["ru", "en"] as const) {
      const [first] = getPaymentPlans(locale);

      expect(first.product).toBe(REVIEW_PRODUCT);
      expect(first.priceLine).toContain("500");
      // The fee is inside the price, so no second number appears anywhere.
      expect(first.priceLine).not.toContain("525");
    }
  });

  it("узнаётся по сумме и по метке в оплате, но не открывает периода сопровождения", () => {
    expect(REVIEW_TOTAL_USD).toBe(500);
    expect(productFromAmount(50000, "usd")).toBe(REVIEW_PRODUCT);
    expect(productFromAmount(52500, "usd")).toBeNull();
    expect(productFromMetadata({ product: "preliminary_assessment" })).toBe(REVIEW_PRODUCT);
    expect(productFromMetadata({ product: "review" })).toBe(REVIEW_PRODUCT);
    expect(isPlanProduct(REVIEW_PRODUCT)).toBe(false);
  });

  it("описан в договоре с ценой, и договор получил новую версию", () => {
    expect(OFFER_VERSION).toBe("oferta-v6");
    expect(clause("ru")).toContain("Разбор анализов — 500 USD");
    expect(clause("ru")).toContain("Итог по формату «Разбор анализов»: 500 USD.");
    expect(clause("ru")).toContain("включён в эту цену");
    expect(clause("ru")).not.toContain("525");
    expect(clause("en")).toContain("Analyses review — 500 USD");
    expect(clause("en")).toContain("Total for the analyses review: 500 USD.");
    expect(clause("en")).not.toContain("525");
  });

  it("ассистент называет цену и не предлагает бесплатного", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("$500");
    expect(prompt).not.toContain("$525");
    expect(prompt).not.toMatch(/бесплатн(ая|ый|ую|о) (предварительн|оценк|разбор)/i);
  });
});

describe("следа бесплатного не осталось", () => {
  it("на сайте: тарифы, разбор, навигация, страница Professor Python", () => {
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
      expect(text, locale).not.toMatch(/акци|promotion|first clients|early clients/i);
    }
  });

  it("в договоре и условиях возврата", () => {
    // The formula on the 100-day plan is a gift and its delivery is free —
    // that stays. What must be gone are the sentences that called the
    // review itself free, in the exact words the promotion used.
    for (const gone of [
      "Предварительная аналитика ресурсного состояния — бесплатно",
      "Предварительная аналитика бесплатна",
      "бесплатная предварительная аналитика"
    ]) {
      expect(clause("ru")).not.toContain(gone);
    }

    for (const gone of ["free of charge", "preliminary analysis is free", "a free preliminary analysis"]) {
      expect(clause("en")).not.toContain(gone);
    }

    const refund = (locale: "ru" | "en") =>
      REFUND_CONTENT[locale].sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? [])]).join("\n");

    expect(refund("ru")).not.toContain("бесплатный формат");
    expect(refund("ru")).not.toContain("попробовать бесплатно");
    expect(refund("en")).not.toContain("free format");
    expect(refund("en")).not.toContain("without paying");
  });

  it("отдельной страницы у акции больше нет: ни в меню, ни в карте сайта", () => {
    expect(navRoutes.some((route) => route.href === "/review")).toBe(false);
    expect(sitemap().some((entry) => entry.url.endsWith("/review"))).toBe(false);
  });
});
