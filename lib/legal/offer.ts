import type { Locale } from "@/lib/i18n/locale";

// APPROVED by the founder on 2026-08-04 and closed for edits.
//
// v3 was drafted and amended several times in one pass before launch, while
// no client had accepted anything: the five-week price was corrected to
// 1,200 + 5% + 180 delivery = 1,440, the formula was written in, the long
// programme was renamed from 15 weeks to 100 days, and the author was
// introduced once as Карен and called Professor Python thereafter.
//
// That freedom is over. The version must now change whenever the text does:
// clause 12 says the edition in force at confirmation is the one that
// applies, and consent records store this string — editing an edition in
// place from here on would make consents to two different contracts
// indistinguishable after the fact.
//
// v4 (2026-08-05) is the first amendment made under that rule. Clause 3 no
// longer describes the free format as a way to "decide whether you need the
// support programme"; it describes it as what it is, an assessment of where
// the person stands today. Nothing about price, entitlement or what is
// delivered changes — but the text changed, so the version does too, and
// anyone who accepted v3 is recorded as having accepted v3.
//
// v5 (2026-08-21) corrects the stated geographic reach from 34 to 36
// countries. Services, prices and entitlements remain unchanged.
export const OFFER_VERSION = "oferta-v5";

// The superseded edition, kept reachable because clients accepted it and
// clause 12 says their terms do not change.
export const OFFER_ARCHIVE_V2_URL = "/legal/python-method-oferta-v2.pdf";

// The Russian text is the binding one. The English is a faithful
// translation that has not been reviewed by a lawyer.
export const OFFER_BINDING_LOCALE: Locale = "ru";

export function getOfferDocumentLocale(locale: Locale): Locale {
  return locale;
}
