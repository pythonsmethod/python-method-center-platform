import type Stripe from "stripe";

// Which processor_reference a refunded charge was recorded under.
//
// One-time Checkout payments are stored by PaymentIntent id. Subscription
// payments are not: the first prepaid term is stored by Checkout Session id
// (a subscription session has no PaymentIntent) and renewals by Invoice id
// (the current Stripe API no longer exposes invoice.payment_intent). A refund
// only carries the PaymentIntent, so walk back to the invoice and session.
type RefundLookup = {
  invoicePayments: { list: (params: Stripe.InvoicePaymentListParams) => Promise<{ data: Array<{ invoice: string | { id: string } }> }> };
  invoices: { retrieve: (id: string) => Promise<Stripe.Invoice> };
  checkout: { sessions: { list: (params: Stripe.Checkout.SessionListParams) => Promise<{ data: Array<{ id: string }> }> } };
};

export async function refundReferenceCandidates(stripe: RefundLookup | null, paymentIntentId: string): Promise<string[]> {
  const references = [paymentIntentId];
  if (!stripe) return references;
  const { data } = await stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId }, limit: 1
  });
  const invoiceRef = data[0]?.invoice;
  const invoiceId = typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;
  if (!invoiceId) return references;
  references.push(invoiceId);

  const invoice = await stripe.invoices.retrieve(invoiceId);
  if (invoice.billing_reason === "subscription_create") {
    const parent = (invoice as Stripe.Invoice & {
      parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
    }).parent;
    const sub = parent?.subscription_details?.subscription;
    const subscriptionId = typeof sub === "string" ? sub : sub?.id;
    if (subscriptionId) {
      const sessions = await stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 1 });
      if (sessions.data[0]?.id) references.push(sessions.data[0].id);
    }
  }
  return references;
}

export function refundStatus(charge: Pick<Stripe.Charge, "amount" | "amount_refunded" | "refunded">) {
  return charge.refunded || charge.amount_refunded >= charge.amount ? "refunded" as const : "partially_refunded" as const;
}
