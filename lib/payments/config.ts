import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPaypalLink } from "@/lib/payments/paypal";

// Pricing set by the founder (23.07.2026): 5 weeks $1,200 (+5% service fee
// + $180 formula delivery — Karen sends his formula as a gift with the
// plan); 100 days $3,500 (+5% service fee). Stripe Payment Links must be
// created with the resulting totals: $1,440 and $3,675.
export const PLAN_5W_TOTAL_USD = 1440;
export const PLAN_100D_TOTAL_USD = 3675;

// Test access for invited testers: the real paid path end to end — Stripe,
// the webhook, the cabinet, the personal AI of a paying client — for the
// price of a coffee. Never shown on the public payment page; it lives on
// /payment/test, which is only reachable by direct link.
export const TEST_ACCESS_TOTAL_USD = 3;
export const TEST_ACCESS_DAYS = 14;

export type PaymentPlan = {
  product: "support_5_weeks" | "support_15_weeks" | "test_access";
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

// Returns the test plan only when its Payment Link is configured, so the
// page disappears by itself once the link is removed from Vercel.
export function getTestAccessPlan(locale: Locale = "ru"): PaymentPlan | null {
  const t = getDictionary(locale).paymentTest;
  const paymentLinkUrl = readPaymentLink(
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_TEST
  );

  if (!paymentLinkUrl) {
    return null;
  }

  return {
    product: "test_access",
    title: t.planTitle,
    description: t.planDesc,
    priceLine: t.planPrice,
    paymentLinkUrl,
    paypalUrl: getPaypalLink("test_access")
  };
}

export function getPaymentPlans(locale: Locale = "ru"): PaymentPlan[] {
  const t = getDictionary(locale).payment;
  const testPlan = getTestAccessPlan(locale);

  const plans: PaymentPlan[] = [
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
      product: "support_15_weeks",
      title: t.plan100Title,
      description: t.plan100Desc,
      priceLine: t.plan100Price,
      paymentLinkUrl: readPaymentLink(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W
      ),
      paypalUrl: getPaypalLink("support_15_weeks")
    }
  ];

  // The test tariff stands among the real ones on purpose: testers should
  // choose a plan exactly as a client does. It disappears the moment its
  // Payment Link is removed from the environment — that is how it is
  // switched off before the public launch.
  if (testPlan) {
    plans.push(testPlan);
  }

  return plans;
}
