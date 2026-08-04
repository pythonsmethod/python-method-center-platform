import type { Locale } from "@/lib/i18n/locale";

// Bumped from oferta-v2 when the five-week price was corrected. The version
// must change whenever the text does: clause 12 says the edition in force at
// confirmation is the one that applies, and consent records store this
// string — leaving it unchanged would make consents to two different
// contracts indistinguishable.
export const OFFER_VERSION = "oferta-v3";

// The superseded edition, kept reachable because clients accepted it and
// clause 12 says their terms do not change.
export const OFFER_ARCHIVE_V2_URL = "/legal/python-method-oferta-v2.pdf";

// The Russian text is the binding one. The English is a faithful
// translation that has not been reviewed by a lawyer.
export const OFFER_BINDING_LOCALE: Locale = "ru";

export function getOfferDocumentLocale(locale: Locale): Locale {
  return locale;
}
