import { describe, expect, it } from "vitest";
import { paidDeliveryQuantity } from "@/lib/delivery/paid-quantity";

describe("delivery task created after address entry", () => {
  it("retains the six prepaid periods from the original checkout", () => {
    expect(paidDeliveryQuantity({ product: "personal_support", amount_cents: 780000, currency: "USD",
      metadata: { stripe_metadata: { product: "personal_support", months: "6" } } })).toBe(6);
  });
  it("uses one period for a later $1300 renewal", () => {
    expect(paidDeliveryQuantity({ product: "personal_support", amount_cents: 130000, currency: "USD",
      metadata: { source: "stripe_subscription_invoice", support_months: 1 } })).toBe(1);
  });
  it("does not create a multi-period gift for an assessment", () => {
    expect(paidDeliveryQuantity({ product: "preliminary_assessment", amount_cents: 29900, currency: "USD", metadata: {} })).toBe(1);
  });
});
