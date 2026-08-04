import type { Locale } from "@/lib/i18n/locale";

export const OFFER_VERSION = "oferta-v2";

// The Russian original. It stays the binding text: the English version in
// lib/legal/offer-en.ts is a faithful translation, but it has not been
// reviewed by a lawyer, and a translation nobody has signed off cannot be
// the text a client is held to.
export const OFFER_DOCUMENT_URL = "/legal/python-method-oferta-v2.pdf";

export const OFFER_BINDING_LOCALE: Locale = "ru";

// Both languages exist now, so a visitor always reads the offer in their
// own — which is not the same as saying their version is the binding one.
// The consent record keeps both facts.
export function getOfferDocumentLocale(locale: Locale): Locale {
  return locale;
}
