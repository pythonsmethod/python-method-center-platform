import { supportMonthsFromMetadata } from "@/lib/payments/stripe";

type PaidDeliveryPayment = {
  product: string;
  amount_cents: number;
  currency: string;
  metadata: unknown;
};

// The address can be supplied long after checkout. Preserve the originally
// purchased number of support periods when creating its delivery task then.
export function paidDeliveryQuantity(payment: PaidDeliveryPayment): number {
  if (payment.product !== "personal_support") return 1;
  const metadata = payment.metadata && typeof payment.metadata === "object"
    ? payment.metadata as Record<string, unknown> : {};
  const original = metadata.stripe_metadata && typeof metadata.stripe_metadata === "object"
    ? metadata.stripe_metadata as Record<string, string> : null;
  if (metadata.source === "stripe_subscription_invoice") return 1;
  return supportMonthsFromMetadata(original, payment.amount_cents, payment.currency);
}
