import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Pricing set by the founder (23.07.2026): 5 weeks $1,200 (+5% service fee
// + $180 formula delivery — Karen sends his formula as a gift with the
// plan); 100 days $3,500 (+5% service fee). Stripe Payment Links must be
// created with the resulting totals: $1,440 and $3,675.
export const PLAN_5W_TOTAL_USD = 1440;
export const PLAN_100D_TOTAL_USD = 3675;

// The analyses review, set by the founder (02.09.2026) at $500 as a paid
// format in its own right, once the launch promotion that offered it free
// had ended. Unlike the two support programmes, the 5% service fee is
// included in this price rather than added to it — 500 is what the person
// pays, so the Stripe Payment Link must be created for exactly $500. The
// contract says so in clause 3.
export const REVIEW_PRICE_USD = 500;
export const REVIEW_TOTAL_USD = 500;

// The database id of the review predates its price: it was created for the
// free preliminary assessment and is kept so that earlier records stay
// readable. Never show the id; show the plan's title.
export const REVIEW_PRODUCT = "preliminary_assessment" as const;

// Legacy database/payment id. Never show this value as "15 weeks" to users:
// the canonical public name and actual duration are both 100 days.
export const SUPPORT_100_DAY_PRODUCT = "support_15_weeks" as const;

export type PaymentPlan = {
  product: typeof REVIEW_PRODUCT | "support_5_weeks" | typeof SUPPORT_100_DAY_PRODUCT;
  title: string;
  description: string;
  priceLine: string;
  paymentLinkUrl: string | null;
};

function readPaymentLink(value: string | undefined): string | null {
  const url = value?.trim();

  if (!url || !url.startsWith("https://")) {
    return null;
  }

  return url;
}

export function getPaymentPlans(locale: Locale = "ru"): PaymentPlan[] {
  const t = getDictionary(locale).payment;

  return [
    {
      product: REVIEW_PRODUCT,
      title: t.planReviewTitle,
      description: t.planReviewDesc,
      priceLine: t.planReviewPrice,
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_REVIEW
      )
    },
    {
      product: "support_5_weeks",
      title: t.plan5Title,
      description: t.plan5Desc,
      priceLine: t.plan5Price,
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W
      )
    },
    {
      product: SUPPORT_100_DAY_PRODUCT,
      title: t.plan100Title,
      description: t.plan100Desc,
      priceLine: t.plan100Price,
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W
      )
    }
  ];
}
