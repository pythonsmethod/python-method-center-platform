"use server";

import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOfferDocumentLocale, OFFER_BINDING_LOCALE, OFFER_VERSION } from "@/lib/legal/offer";
import { getStripe } from "@/lib/payments/stripe";
import { getCheckoutSettings } from "@/lib/payments/checkout-settings";
import { buildCheckoutSession, parseCheckoutInput, type CheckoutResult } from "@/lib/payments/checkout-contract";
import { ensureCheckoutPrice, ensurePortalConfiguration } from "@/lib/payments/checkout-catalog";

// Next Server Actions enforce POST and Origin/Host validation. Every invocation
// still authenticates and validates its own input; a rendered button is not an
// authorization boundary. No amount, customer id, or return URL comes from UI.
export async function createPaymentCheckout(raw: unknown): Promise<CheckoutResult> {
  const input = parseCheckoutInput(raw);
  if (!input) return { error: "invalid" };
  const settings = getCheckoutSettings();
  if (!settings) return { error: "unavailable" };
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { error: "unavailable" };
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.is_anonymous) return { error: "signin" };
    const stripe = getStripe();
    if (!stripe) return { error: "unavailable" };

    let customerId: string | null = null;
    if (input.product === "personal_support") {
      // A missing/unapplied billing migration fails closed before Stripe writes.
      const { data: existing, error } = await supabase.from("billing_subscriptions")
        .select("stripe_customer_id, status").eq("profile_id", user.id)
        .neq("status", "cancelled").limit(1).maybeSingle();
      if (error) return { error: "unavailable" };
      if (input.autoRenew && existing) return { error: "subscription-exists" };
      customerId = existing?.stripe_customer_id ?? null;
    }

    // Persist both explicit consents and the exact renewal/term selection before
    // returning a payment URL. A failed consent write must not silently charge.
    const consentMetadata = {
      product: input.product, months: input.months, auto_renew: input.autoRenew,
      checkout_request_id: input.requestId, ui_locale: input.locale,
      offer_document_locale: getOfferDocumentLocale(input.locale), offer_binding_locale: OFFER_BINDING_LOCALE
    };
    const { data: consents, error: readError } = await supabase.from("consent_records")
      .select("source").eq("profile_id", user.id).eq("consent_type", "offer_acceptance")
      .eq("status", "accepted").eq("version", OFFER_VERSION).contains("metadata", consentMetadata);
    if (readError) return { error: "consent" };
    const missing = ["payment_page", "payment_immediate_start"].filter(source => !consents?.some(row => row.source === source));
    if (missing.length) {
      const { error } = await supabase.from("consent_records").insert(missing.map(source => ({
        profile_id: user.id, consent_type: "offer_acceptance", status: "accepted", version: OFFER_VERSION, source,
        metadata: { ...consentMetadata, immediate_start: source === "payment_immediate_start", waives_withdrawal: source === "payment_immediate_start" }
      })));
      if (error) return { error: "consent" };
    }

    const prepaid = await ensureCheckoutPrice(stripe,
      input.product === "personal_support" ? (input.autoRenew ? "prepaid-renewal" : "prepaid") : "assessment",
      input.locale, input.months);
    const renewal = input.autoRenew ? await ensureCheckoutPrice(stripe, "renewal", input.locale) : undefined;
    if (input.autoRenew) await ensurePortalConfiguration(stripe, settings.origin, input.locale);
    const key = `pmc-checkout-${createHash("sha256").update(JSON.stringify([user.id, input])).digest("hex")}`;
    if (!customerId) {
      // The same checkout attempt reuses the Customer on a network retry.
      // No customer is ever selected by a browser-supplied id or payer email.
      const customer = await stripe.customers.create({
        ...(user.email ? { email: user.email } : {}),
        preferred_locales: [input.locale], metadata: { profile_id: user.id }
      }, { idempotencyKey: `${key}-customer` });
      customerId = customer.id;
    } else {
      await stripe.customers.update(customerId, { preferred_locales: [input.locale] }, { idempotencyKey: `${key}-locale` });
    }
    const session = await stripe.checkout.sessions.create(
      buildCheckoutSession(input, user.id, customerId, { prepaid, renewal }, settings),
      { idempotencyKey: key }
    );
    if (!session.url || session.livemode !== settings.livemode) return { error: "unavailable" };
    return { url: session.url };
  } catch {
    // Stripe responses can contain payer information; never return them to UI.
    return { error: "unavailable" };
  }
}
