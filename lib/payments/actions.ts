"use server";

import {
  getOfferDocumentLocale,
  OFFER_BINDING_LOCALE,
  OFFER_VERSION
} from "@/lib/legal/offer";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const KNOWN_PRODUCTS = new Set([
  "support_5_weeks",
  "support_15_weeks"
]);

// Records offer acceptance from the payment page for signed-in clients.
// Guests can still pay (Stripe checkout references the offer), so this
// must never throw or block the payment redirect.
// Two acts, recorded separately, because clause 8 of the offer treats them
// separately: accepting the terms, and asking for the work to begin now.
// The refusal of refunds rests on the second one, so it cannot be inferred
// from the first.
//
// consent_type stays "offer_acceptance" — the enum is a stored type and
// adding a value needs a migration applied by hand, which would break every
// payment if it were ever missed. The source column carries the difference.
export async function recordPaymentOfferAcceptance(
  product: string,
  immediateStart = false
): Promise<void> {
  if (!KNOWN_PRODUCTS.has(product)) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const source = immediateStart ? "payment_immediate_start" : "payment_page";
    const { data: existing } = await supabase
      .from("consent_records")
      .select("id")
      .eq("profile_id", user.id)
      .eq("consent_type", "offer_acceptance")
      .eq("status", "accepted")
      .eq("version", OFFER_VERSION)
      .eq("source", source)
      .contains("metadata", { product })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return;
    }

    const uiLocale = await getLocale();

    await supabase.from("consent_records").insert({
      profile_id: user.id,
      consent_type: "offer_acceptance",
      status: "accepted",
      version: OFFER_VERSION,
      source,
      metadata: {
        product,
        immediate_start: immediateStart,
        waives_withdrawal: immediateStart,
        offer_document_locale: getOfferDocumentLocale(uiLocale),
        offer_binding_locale: OFFER_BINDING_LOCALE,
        ui_locale: uiLocale
      }
    });
  } catch {
    // Consent capture is best-effort here; the checkbox itself gates the UI.
  }
}
