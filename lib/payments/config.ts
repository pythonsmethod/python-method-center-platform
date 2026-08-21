import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPaypalLink } from "@/lib/payments/paypal";

// Pricing set by the founder (23.07.2026): 5 weeks $1,200 (+5% service fee
// + $180 formula delivery — Karen sends his formula as a gift with the
// plan); 100 days $3,500 (+5% service fee). Stripe Payment Links must be
// created with the resulting totals: $1,440 and $3,675.
export const PLAN_5W_TOTAL_USD = 1440;
export const PLAN_100D_TOTAL_USD = 3675;

// Legacy database/payment id. Never show this value as "15 weeks" to users:
// the canonical public name and actual duration are both 100 days.
export const SUPPORT_100_DAY_PRODUCT = "support_15_weeks" as const;

export type PaymentPlan = {
  product: "support_5_weeks" | typeof SUPPORT_100_DAY_PRODUCT;
  title: string;
  description: string;
  priceLine: string;
  paymentLinkUrl: string | null;
  // Second way to pay for the same plan. Confirmed by a human, so it is
  // offered as an alternative, never as the main button.
  paypalUrl?: string | null;
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
      product: "support_5_weeks",
      title: t.plan5Title,
      description: t.plan5Desc,
      priceLine: t.plan5Price,
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W
      ),
      paypalUrl: getPaypalLink("support_5_weeks")
    },
    {
      product: SUPPORT_100_DAY_PRODUCT,
      title: t.plan100Title,
      description: t.plan100Desc,
      priceLine: t.plan100Price,
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W
      ),
      paypalUrl: getPaypalLink(SUPPORT_100_DAY_PRODUCT)
    }
  ];
}
