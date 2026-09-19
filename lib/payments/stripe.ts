import Stripe from "stripe";
import {
  PERSONAL_SUPPORT_MAX_MONTHS,
  PERSONAL_SUPPORT_MONTHLY_USD,
  PERSONAL_SUPPORT_PERIOD_DAYS,
  PERSONAL_SUPPORT_PRODUCT,
  PLAN_100D_TOTAL_USD,
  PLAN_5W_TOTAL_USD,
  REVIEW_PRODUCT,
  REVIEW_TOTAL_USD,
  type PaymentPlan
} from "@/lib/payments/config";

export type LegacySupportProduct = "support_5_weeks" | "support_15_weeks";
export type PaymentProduct = PaymentPlan["product"] | LegacySupportProduct;
export type ServicePeriodProduct = PaymentProduct | "test_access";
export type PeriodProduct = Exclude<ServicePeriodProduct, typeof REVIEW_PRODUCT>;

// Legacy durations remain for already-paid records. personal_support uses
// PERSONAL_SUPPORT_PERIOD_DAYS multiplied by the purchased month count.
export const PLAN_DURATION_DAYS: Record<PeriodProduct, number> = {
  personal_support: PERSONAL_SUPPORT_PERIOD_DAYS,
  support_5_weeks: 35,
  support_15_weeks: 100,
  test_access: 14
};

export function normalizePayerEmail(
  email: string | null | undefined
): string | null {
  const clean = email?.trim().toLowerCase();
  return clean && clean.includes("@") ? clean : null;
}

export function emailExactMatchPattern(normalizedEmail: string): string {
  return normalizedEmail.replace(/([\\%_])/g, "\\$1");
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key ? new Stripe(key) : null;
}

export function personalSupportMonthsFromAmount(
  amountCents: number | null | undefined,
  currency: string | null | undefined
): number | null {
  if (!amountCents || (currency ?? "usd").toLowerCase() !== "usd") {
    return null;
  }

  const oneMonthCents = PERSONAL_SUPPORT_MONTHLY_USD * 100;

  if (amountCents % oneMonthCents !== 0) {
    return null;
  }

  const months = amountCents / oneMonthCents;
  return Number.isInteger(months) &&
    months >= 1 &&
    months <= PERSONAL_SUPPORT_MAX_MONTHS
    ? months
    : null;
}

export function supportMonthsFromMetadata(
  metadata: Record<string, string> | null | undefined,
  amountCents?: number | null,
  currency?: string | null
): number {
  const raw =
    metadata?.months ??
    metadata?.support_months ??
    metadata?.initial_months;

  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= PERSONAL_SUPPORT_MAX_MONTHS
    ) {
      return parsed;
    }
  }

  return personalSupportMonthsFromAmount(amountCents, currency) ?? 1;
}

export function productFromAmount(
  amountCents: number | null | undefined,
  currency: string | null | undefined
): PaymentProduct | null {
  if (!amountCents || (currency ?? "usd").toLowerCase() !== "usd") {
    return null;
  }

  if (amountCents === REVIEW_TOTAL_USD * 100) {
    return REVIEW_PRODUCT;
  }

  if (personalSupportMonthsFromAmount(amountCents, currency)) {
    return PERSONAL_SUPPORT_PRODUCT;
  }

  // Legacy payment links may still complete asynchronously after the public
  // storefront has moved on. Keep recognizing them so money is never lost.
  if (amountCents === PLAN_5W_TOTAL_USD * 100) {
    return "support_5_weeks";
  }

  if (amountCents === PLAN_100D_TOTAL_USD * 100) {
    return "support_15_weeks";
  }

  return null;
}

export function productFromMetadata(
  metadata: Record<string, string> | null | undefined
): PaymentProduct | null {
  const value =
    metadata?.product ?? metadata?.plan ?? metadata?.payment_product;

  if (
    value === REVIEW_PRODUCT ||
    value === "review" ||
    value === "analyses_review" ||
    value === "condition_assessment"
  ) {
    return REVIEW_PRODUCT;
  }

  if (
    value === PERSONAL_SUPPORT_PRODUCT ||
    value === "personal-support" ||
    value === "monthly_support"
  ) {
    return PERSONAL_SUPPORT_PRODUCT;
  }

  if (value === "support_5_weeks") return value;

  if (value === "support_15_weeks" || value === "support_100_days") {
    return "support_15_weeks";
  }

  return null;
}

export function resolveStripeProduct(input: {
  metadata?: Record<string, string> | null;
  amountCents?: number | null;
  currency?: string | null;
}): PaymentProduct | null {
  return (
    productFromMetadata(input.metadata) ??
    productFromAmount(input.amountCents, input.currency)
  );
}

export function servicePeriodEnd(
  product: PeriodProduct,
  startsAt: Date,
  months = 1
): Date {
  const ends = new Date(startsAt);
  const days =
    product === PERSONAL_SUPPORT_PRODUCT
      ? PERSONAL_SUPPORT_PERIOD_DAYS * Math.max(1, months)
      : PLAN_DURATION_DAYS[product];
  ends.setUTCDate(ends.getUTCDate() + days);
  return ends;
}
