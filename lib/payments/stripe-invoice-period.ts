import type Stripe from "stripe";

type SubscriptionLine = Stripe.InvoiceLineItem & {
  parent?: {
    type?: string;
    subscription_item_details?: { subscription?: string | null } | null;
  } | null;
};

// Stripe, not webhook delivery time, defines the paid subscription interval.
// Refuse ambiguous invoices rather than granting a different term from the bill.
export function paidSubscriptionInvoicePeriod(
  invoice: Stripe.Invoice,
  subscriptionId: string,
  months: number
): { startsAt: Date; endsAt: Date } {
  if (invoice.status !== "paid" || invoice.lines.has_more) {
    throw new Error("paid subscription invoice lines unavailable");
  }

  const lines = invoice.lines.data.filter(line => {
    const parent = (line as SubscriptionLine).parent;
    return parent?.type === "subscription_item_details" &&
      parent.subscription_item_details?.subscription === subscriptionId;
  });
  if (lines.length !== 1) {
    throw new Error("subscription invoice period is ambiguous");
  }

  const { start, end } = lines[0].period;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      end - start !== months * 30 * 86_400) {
    throw new Error("subscription invoice period does not match the paid term");
  }
  return { startsAt: new Date(start * 1000), endsAt: new Date(end * 1000) };
}
