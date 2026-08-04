import Stripe from "stripe";
import {
  PLAN_100D_TOTAL_USD,
  PLAN_5W_TOTAL_USD,
  TEST_ACCESS_DAYS,
  TEST_ACCESS_TOTAL_USD,
  type PaymentPlan
} from "@/lib/payments/config";

export type PaymentProduct = PaymentPlan["product"];

// Support-period length per product ("support_15_weeks" is the internal
// enum id of the 100-day plan — the storefront label changed, the id didn't).
export const PLAN_DURATION_DAYS: Record<PaymentProduct, number> = {
  support_5_weeks: 35,
  support_15_weeks: 100,
  test_access: TEST_ACCESS_DAYS
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

  if (amountCents === PLAN_5W_TOTAL_USD * 100) {
    return "support_5_weeks";
  }

  if (amountCents === PLAN_100D_TOTAL_USD * 100) {
    return "support_15_weeks";
  }

  if (amountCents === TEST_ACCESS_TOTAL_USD * 100) {
    return "test_access";
  }

  return null;
}

export function servicePeriodEnd(
  product: PaymentProduct,
  startsAt: Date
): Date {
  const ends = new Date(startsAt);
  ends.setDate(ends.getDate() + PLAN_DURATION_DAYS[product]);
  return ends;
}
