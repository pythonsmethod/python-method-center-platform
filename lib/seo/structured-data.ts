import { SITE_URL } from "@/lib/config/site";
import type { Locale } from "@/lib/i18n/locale";

type JsonLd = Record<string, unknown>;

export function websiteStructuredData(locale: Locale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Python Method Center",
    alternateName: "Python Method",
    inLanguage: locale
  };
}

export function organizationStructuredData(locale: Locale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    url: SITE_URL,
    name: "Python Method Center",
    alternateName: "Python Method",
    description:
      locale === "ru"
        ? "Центр персонального сопровождения восстановления."
        : "A center for personal recovery support."
  };
}

export function serializeStructuredData(value: JsonLd): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
