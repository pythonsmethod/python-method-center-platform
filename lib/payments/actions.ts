"use server";

import { getOfferDocumentLocale, OFFER_VERSION } from "@/lib/legal/offer";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const KNOWN_PRODUCTS = new Set([
  "support_5_weeks",
  "support_15_weeks",
  "test_access"
]);

// Records offer acceptance from the payment page for signed-in clients.
// Guests can still pay (Stripe checkout references the offer), so this
// must never throw or block the payment redirect.
export async function recordPaymentOfferAcceptance(
  product: string
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

    const { data: existing } = await supabase
      .from("consent_records")
      .select("id")
      .eq("profile_id", user.id)
      .eq("consent_type", "offer_acceptance")
      .eq("status", "accepted")
      .eq("version", OFFER_VERSION)
      .eq("source", "payment_page")
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
      source: "payment_page",
      metadata: {
        product,
        offer_document_locale: getOfferDocumentLocale(uiLocale),
        ui_locale: uiLocale
      }
    });
  } catch {
    // Consent capture is best-effort here; the checkbox itself gates the UI.
  }
}
