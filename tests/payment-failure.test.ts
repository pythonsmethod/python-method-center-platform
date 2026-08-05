import { describe, expect, it } from "vitest";
import { describeFailedPayment, type StripeLookup } from "@/lib/payments/failure";

// The alert about a failed payment is the only record that a failed payment
// exists — nothing is written to our database, so there is no case to open
// and nothing in the admin panel to find.
//
// It fired for real during the focus group and said this, in full:
//
//   ⚠️ Оплата не прошла
//   Событие Stripe: evt_3U0x0BE6esfE5qRj1I3uCRm2
//   Клиенту могла потребоваться помощь с оплатой.
//   https://pythonmethodcenter.com/admin
//
// There was no way to tell who had been unable to pay. The email line was
// in the code but stayed empty, because for payment_intent.payment_failed
// the payer's address is almost never in `receipt_email` — Stripe only
// fills that when someone asks for a receipt. It is in the billing details
// of the payment method, or on the charge, or on the customer.
//
// These tests pin every one of those paths.

const noLookup: StripeLookup = {
  charge: async () => null,
  customer: async () => null
};

function intent(overrides: Record<string, unknown> = {}) {
  return {
    object: "payment_intent",
    id: "pi_123",
    amount: 144000,
    currency: "usd",
    receipt_email: null,
    last_payment_error: null,
    latest_charge: null,
    customer: null,
    ...overrides
  } as never;
}

describe("finding out who could not pay", () => {
  it("takes the email from the payment method when there is no receipt email", async () => {
    // This is the real case. Nothing else in the payload has an address.
    const details = await describeFailedPayment(
      intent({
        last_payment_error: {
          message: "Your card was declined.",
          decline_code: "insufficient_funds",
          payment_method: { billing_details: { email: "client@example.com" } }
        }
      }),
      { livemode: true, lookup: noLookup }
    );

    expect(details.email).toBe("client@example.com");
  });

  it("falls back to the charge when the payment method has no email", async () => {
    const lookup: StripeLookup = {
      charge: async (id) =>
        id === "ch_1"
          ? ({ billing_details: { email: "from-charge@example.com" } } as never)
          : null,
      customer: async () => null
    };

    const details = await describeFailedPayment(
      intent({ latest_charge: "ch_1" }),
      { livemode: true, lookup }
    );

    expect(details.email).toBe("from-charge@example.com");
  });

  it("falls back to the customer record last", async () => {
    const lookup: StripeLookup = {
      charge: async () => null,
      customer: async () => ({ email: "from-customer@example.com" }) as never
    };

    const details = await describeFailedPayment(intent({ customer: "cus_1" }), {
      livemode: true,
      lookup
    });

    expect(details.email).toBe("from-customer@example.com");
  });

  it("ignores a deleted customer instead of reading a missing field", async () => {
    const lookup: StripeLookup = {
      charge: async () => null,
      customer: async () => ({ deleted: true, id: "cus_1" }) as never
    };

    const details = await describeFailedPayment(intent({ customer: "cus_1" }), {
      livemode: true,
      lookup
    });

    expect(details.email).toBeNull();
  });

  it("still reports the payment when a lookup to Stripe throws", async () => {
    // An alert without an email beats no alert about money that failed.
    const lookup: StripeLookup = {
      charge: async () => {
        throw new Error("stripe unreachable");
      },
      customer: async () => null
    };

    const details = await describeFailedPayment(intent({ latest_charge: "ch_1" }), {
      livemode: true,
      lookup
    });

    expect(details.email).toBeNull();
    expect(details.reference).toBe("pi_123");
    expect(details.dashboardUrl).toContain("pi_123");
  });
});

describe("what else the alert has to carry", () => {
  it("says why the card was refused", async () => {
    // Decides whether the person needs a message from us or just another
    // card — and the two need very different responses.
    const details = await describeFailedPayment(
      intent({
        last_payment_error: {
          message: "Your card was declined.",
          decline_code: "insufficient_funds"
        }
      }),
      { livemode: true, lookup: noLookup }
    );

    expect(details.reason).toBe("Your card was declined. (insufficient_funds)");
  });

  it("carries the amount, so the plan is recognisable", async () => {
    const details = await describeFailedPayment(intent(), {
      livemode: true,
      lookup: noLookup
    });

    expect(details.amountCents).toBe(144000);
    expect(details.currency).toBe("usd");
  });

  it("links into the live dashboard for a live payment", async () => {
    const details = await describeFailedPayment(intent(), {
      livemode: true,
      lookup: noLookup
    });

    expect(details.dashboardUrl).toBe("https://dashboard.stripe.com/payments/pi_123");
  });

  it("links into the test dashboard for a test payment", async () => {
    // Sending someone to the live dashboard for a test payment shows an
    // empty page, which reads as "this payment does not exist".
    const details = await describeFailedPayment(intent(), {
      livemode: false,
      lookup: noLookup
    });

    expect(details.dashboardUrl).toBe("https://dashboard.stripe.com/test/payments/pi_123");
  });
});

describe("a checkout session that failed", () => {
  it("uses the address the payer typed at checkout", async () => {
    const details = await describeFailedPayment(
      {
        object: "checkout.session",
        id: "cs_1",
        payment_intent: "pi_9",
        amount_total: 367500,
        currency: "usd",
        customer_details: { email: "typed@example.com" }
      } as never,
      { livemode: true, lookup: noLookup }
    );

    expect(details.email).toBe("typed@example.com");
    expect(details.amountCents).toBe(367500);
    // The payment intent, not the session: that is the page with the money
    // on it.
    expect(details.dashboardUrl).toBe("https://dashboard.stripe.com/payments/pi_9");
  });

  it("falls back to the session id when no payment intent was created", async () => {
    const details = await describeFailedPayment(
      {
        object: "checkout.session",
        id: "cs_1",
        payment_intent: null,
        amount_total: null,
        currency: null,
        customer_details: null
      } as never,
      { livemode: true, lookup: noLookup }
    );

    expect(details.dashboardUrl).toBe(
      "https://dashboard.stripe.com/checkout/sessions/cs_1"
    );
  });
});
