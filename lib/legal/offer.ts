import type { Locale } from "@/lib/i18n/locale";

export const OFFER_VERSION = "oferta-v2";

// The binding text, per language. Only Russian exists today; add the
// English file here and the page, the notice and the consent record all
// follow on their own.
//
// A machine translation must never be added to this map. What is listed
// here is what a client is told they accepted.
const OFFER_DOCUMENTS: Partial<Record<Locale, string>> = {
  ru: "/legal/python-method-oferta-v2.pdf"
};

// Kept for callers that predate the per-language map.
export const OFFER_DOCUMENT_URL = OFFER_DOCUMENTS.ru as string;

// The language a visitor is actually shown, which is not always the
// language they are reading the site in.
export function getOfferDocumentLocale(locale: Locale): Locale {
  return OFFER_DOCUMENTS[locale] ? locale : "ru";
}

export function getOfferDocumentUrl(locale: Locale): string {
  return OFFER_DOCUMENTS[getOfferDocumentLocale(locale)] as string;
}

// True when the offer exists in the language the visitor chose. When it
// does not, the page says so out loud and the consent record keeps the
// language that was actually shown — consent to a document someone could
// not read is not worth much.
export function isOfferInLocale(locale: Locale): boolean {
  return getOfferDocumentLocale(locale) === locale;
}
