import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { paidSubscriptionInvoicePeriod } from "@/lib/payments/stripe-invoice-period";

const start = 1_790_212_398;

function invoice(months: number, patch: Record<string, unknown> = {}): Stripe.Invoice {
  return {
    status: "paid",
    lines: {
      has_more: false,
      data: [{
        parent: {
          type: "subscription_item_details",
          subscription_item_details: { subscription: "sub_paid" }
        },
        period: { start, end: start + months * 30 * 86_400 }
      }]
    },
    ...patch
  } as unknown as Stripe.Invoice;
}

describe("paid Stripe subscription invoice period", () => {
  it.each([1, 6, 12])("anchors %i paid months to invoice dates, not webhook arrival", months => {
    const result = paidSubscriptionInvoicePeriod(invoice(months), "sub_paid", months);
    expect(result.startsAt.toISOString()).toBe(new Date(start * 1000).toISOString());
    expect(result.endsAt.toISOString()).toBe(new Date((start + months * 30 * 86_400) * 1000).toISOString());
  });

  it("rejects unpaid, partial, unrelated and mismatched invoices", () => {
    expect(() => paidSubscriptionInvoicePeriod(invoice(1, { status: "open" }), "sub_paid", 1)).toThrow();
    expect(() => paidSubscriptionInvoicePeriod(invoice(1, { lines: { has_more: true, data: [] } }), "sub_paid", 1)).toThrow();
    expect(() => paidSubscriptionInvoicePeriod(invoice(1), "sub_other", 1)).toThrow();
    expect(() => paidSubscriptionInvoicePeriod(invoice(1), "sub_paid", 6)).toThrow();
  });
});
