import Stripe from "stripe";
import {
  PLAN_100D_TOTAL_USD,
  PLAN_5W_TOTAL_USD,
  REVIEW_PRODUCT,
  REVIEW_TOTAL_USD,
  type PaymentPlan
} from "@/lib/payments/config";

export type PaymentProduct = PaymentPlan["product"];
// Existing focus-group periods keep their original database product id.
// It is absent from the storefront and amount mapping, so no new purchase
// can create it while already-issued access remains valid.
export type ServicePeriodProduct = PaymentProduct | "test_access";

// The products that open a support period. The analyses review is paid and
// buys no period: it is delivered once, as a file, and the case chat opens
// for a few days by the contract rather than by a timer here.
export type PeriodProduct = Exclude<ServicePeriodProduct, typeof REVIEW_PRODUCT>;

// Support-period length per product ("support_15_weeks" is the internal
// enum id of the 100-day plan — the storefront label changed, the id didn't).
export const PLAN_DURATION_DAYS: Record<PeriodProduct, number> = {
  support_5_weeks: 35,
  support_15_weeks: 100,
  test_access: 14
};

// P2-01: the payer's email is attacker-influenced input. ILIKE treated
// "%" and "_" in it as pattern wildcards, so "a_@gmail.com" could match a
// different client's address and bind the payment — and the service
// period — to the wrong account. Matching is now exact on a normalized
// form; anything ambiguous falls to manual review instead of a guess.
export function normalizePayerEmail(
  email: string | null | undefined
): string | null {
  const clean = email?.trim().toLowerCase();

  return clean && clean.includes("@") ? clean : null;
}

// Case-insensitive EXACT match pattern: every LIKE metacharacter in the
// payer's email is escaped, so ILIKE degenerates to case-insensitive
// equality and nothing else. Kept case-insensitive on purpose — legacy
// profile rows may store mixed-case addresses.
export function emailExactMatchPattern(normalizedEmail: string): string {
  return normalizedEmail.replace(/([\\%_])/g, "\\$1");
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();

  if (!key) {
    return null;
  }

  return new Stripe(key);
}

// Payment Links carry no product metadata we control per-link, so the plan
// is derived from the exact charged total. Unknown totals return null and
// are routed to manual review instead of being guessed.
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
  const value = metadata?.product ?? metadata?.plan ?? metadata?.payment_product;
  if (value === REVIEW_PRODUCT || value === "review" || value === "analyses_review") {
    return REVIEW_PRODUCT;
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
  return productFromMetadata(input.metadata) ??
    productFromAmount(input.amountCents, input.currency);
}

export function servicePeriodEnd(
  product: PeriodProduct,
  startsAt: Date
): Date {
  const ends = new Date(startsAt);
  ends.setUTCDate(ends.getUTCDate() + PLAN_DURATION_DAYS[product]);
  return ends;
}
