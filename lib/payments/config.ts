import { getReviewCopy, REVIEW_PRICE_USD } from "@/lib/config/review";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Legacy totals remain exported because historical Stripe events, tests and
// archived records still contain the former products. They are no longer sold.
export const PLAN_5W_TOTAL_USD = 1440;
export const PLAN_100D_TOTAL_USD = 3855;

export const PERSONAL_SUPPORT_PRODUCT = "personal_support" as const;
export const PERSONAL_SUPPORT_MONTHLY_USD = 1300;
export const PERSONAL_SUPPORT_PERIOD_DAYS = 30;
export const PERSONAL_SUPPORT_MAX_MONTHS = 12;

export const REVIEW_TOTAL_USD = REVIEW_PRICE_USD;
export { REVIEW_PRICE_USD };
export const REVIEW_PRODUCT = "preliminary_assessment" as const;

export type SupportDurationOption = {
  months: number;
  durationDays: number;
  amountUsd: number;
};

export type PaymentPlan = {
  product: typeof REVIEW_PRODUCT | typeof PERSONAL_SUPPORT_PRODUCT;
  title: string;
  description: string;
  priceLine: string;
  supportOptions?: SupportDurationOption[];
};

export function getSupportDurationOptions(): SupportDurationOption[] {
  return Array.from({ length: PERSONAL_SUPPORT_MAX_MONTHS }, (_, index) => {
    const months = index + 1;
    return {
      months,
      durationDays: months * PERSONAL_SUPPORT_PERIOD_DAYS,
      amountUsd: months * PERSONAL_SUPPORT_MONTHLY_USD
    };
  });
}

export function getPaymentPlans(locale: Locale = "ru", now = new Date()): PaymentPlan[] {
  const t = getDictionary(locale).payment;
  const review = getReviewCopy(locale, now);

  return [
    {
      product: REVIEW_PRODUCT,
      title: review.title,
      description: review.description,
      priceLine: review.price
    },
    {
      product: PERSONAL_SUPPORT_PRODUCT,
      title: t.personalSupportTitle,
      description: t.personalSupportDesc,
      priceLine: t.personalSupportPrice,
      supportOptions: getSupportDurationOptions()
    }
  ];
}
