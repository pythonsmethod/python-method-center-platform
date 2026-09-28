import { describe, expect, it, vi } from "vitest";
import { refundReferenceCandidates, refundStatus } from "@/lib/payments/refund";

function stripe(opts: { invoice?: string | null; billingReason?: string; session?: string }) {
  return {
    invoicePayments: { list: vi.fn(async () => ({ data: opts.invoice ? [{ invoice: opts.invoice }] : [] })) },
    invoices: { retrieve: vi.fn(async (id: string) => ({
      id, billing_reason: opts.billingReason ?? "subscription_cycle",
      parent: { subscription_details: { subscription: "sub_1" } }
    }) as never) },
    checkout: { sessions: { list: vi.fn(async () => ({ data: opts.session ? [{ id: opts.session }] : [] })) } }
  };
}

describe("refundReferenceCandidates", () => {
  it("uses the PaymentIntent for one-time Checkout payments", async () => {
    expect(await refundReferenceCandidates(stripe({ invoice: null }), "pi_1")).toEqual(["pi_1"]);
  });
  it("finds a renewal stored by invoice id", async () => {
    expect(await refundReferenceCandidates(stripe({ invoice: "in_9" }), "pi_2")).toEqual(["pi_2", "in_9"]);
  });
  it("finds the first subscription term stored by Checkout Session id", async () => {
    const s = stripe({ invoice: "in_1", billingReason: "subscription_create", session: "cs_1" });
    expect(await refundReferenceCandidates(s, "pi_3")).toEqual(["pi_3", "in_1", "cs_1"]);
    expect(s.checkout.sessions.list).toHaveBeenCalledWith({ subscription: "sub_1", limit: 1 });
  });
  it("still works without a Stripe client", async () => {
    expect(await refundReferenceCandidates(null, "pi_4")).toEqual(["pi_4"]);
  });
});

describe("refundStatus", () => {
  it("separates full and partial refunds", () => {
    expect(refundStatus({ amount: 130000, amount_refunded: 130000, refunded: true })).toBe("refunded");
    expect(refundStatus({ amount: 130000, amount_refunded: 30000, refunded: false })).toBe("partially_refunded");
  });
});
