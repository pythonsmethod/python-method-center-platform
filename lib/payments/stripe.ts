import Stripe from "stripe";
import {
  PLAN_100D_TOTAL_USD,
  PLAN_5W_TOTAL_USD,
  type PaymentPlan
} from "@/lib/payments/config";

export type PaymentProduct = PaymentPlan["product"];

// Support-period length per product ("support_15_weeks" is the internal
// enum id of the 100-day plan — the storefront label changed, the id didn't).
export const PLAN_DURATION_DAYS: Record<PaymentProduct, number> = {
  support_5_weeks: 35,
  support_15_weeks: 100
};

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
