import type Stripe from "stripe";

// Who tried to pay, how much, and why it failed.
//
// A failed payment writes nothing to our database — there is no record to
// open, no case to look at, nothing in the admin panel. The alert is the
// only thing that exists, so everything a person needs in order to act has
// to be inside it.
//
// The first version sent only the Stripe event id and a link to /admin,
// where there was nothing about the event at all. It arrived during the
// focus group with no email on it: for payment_intent.payment_failed the
// payer's address is almost never in `receipt_email` — that field is only
// set when someone asks Stripe to send a receipt. It sits in the billing
// details of the payment method, or on the charge, or on the customer.
//
// So every one of those is checked, in the order they are likely to hold
// something.

export type FailedPaymentDetails = {
  email: string | null;
  amountCents: number | null;
  currency: string | null;
  // Stripe's own explanation ("Your card was declined."), plus the machine
  // code when there is one. This is what decides whether the person needs a
  // message from us or simply a different card.
  reason: string | null;
  reference: string | null;
  dashboardUrl: string | null;
};

// Looking up a charge or a customer means another call to Stripe, which can
// fail on its own. Passed in rather than imported so the failure path is
// testable without a network and without mocking the SDK.
export type StripeLookup = {
  charge: (id: string) => Promise<Stripe.Charge | null>;
  customer: (id: string) => Promise<Stripe.Customer | Stripe.DeletedCustomer | null>;
};

function cleanEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed && trimmed.includes("@") ? trimmed : null;
}

// A live-mode object belongs under dashboard.stripe.com; a test-mode one
// under dashboard.stripe.com/test. Sending someone to the wrong one shows
// an empty page and reads as "the payment does not exist".
function dashboardUrl(reference: string | null, livemode: boolean): string | null {
  if (!reference) {
    return null;
  }

  const prefix = livemode ? "" : "test/";
  const section = reference.startsWith("cs_") ? "checkout/sessions" : "payments";

  return `https://dashboard.stripe.com/${prefix}${section}/${reference}`;
}

function describeError(error: Stripe.PaymentIntent.LastPaymentError | null): string | null {
  if (!error) {
    return null;
  }

  const code = error.decline_code ?? error.code ?? null;

  if (error.message && code) {
    return `${error.message} (${code})`;
  }

  return error.message ?? code;
}

export async function describeFailedPayment(
  object: Stripe.Checkout.Session | Stripe.PaymentIntent,
  options: { livemode: boolean; lookup?: StripeLookup }
): Promise<FailedPaymentDetails> {
  const { livemode, lookup } = options;

  if (object.object === "checkout.session") {
    const session = object;
    const reference =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? session.id;

    return {
      email: cleanEmail(session.customer_details?.email),
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
      reason: null,
      reference,
      dashboardUrl: dashboardUrl(reference, livemode)
    };
  }

  const intent = object;
  const lastError = intent.last_payment_error ?? null;

  // In the order they are likely to hold an address. The first two are
  // already in the webhook payload; the last two cost a call each, and are
  // only made when the cheap ones came back empty.
  let email =
    cleanEmail(intent.receipt_email) ??
    cleanEmail(lastError?.payment_method?.billing_details?.email);

  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id ?? null;

  if (!email && chargeId && lookup) {
    // Never let a lookup failure cost us the whole alert: an alert without
    // an email is far better than no alert about a failed payment.
    try {
      const charge = await lookup.charge(chargeId);
      email = cleanEmail(charge?.billing_details?.email);
    } catch {
      email = null;
    }
  }

  const customerId =
    typeof intent.customer === "string" ? intent.customer : intent.customer?.id ?? null;

  if (!email && customerId && lookup) {
    try {
      const customer = await lookup.customer(customerId);
      email = customer && !customer.deleted ? cleanEmail(customer.email) : null;
    } catch {
      email = null;
    }
  }

  return {
    email,
    amountCents: intent.amount ?? null,
    currency: intent.currency ?? null,
    reason: describeError(lastError),
    reference: intent.id,
    dashboardUrl: dashboardUrl(intent.id, livemode)
  };
}
