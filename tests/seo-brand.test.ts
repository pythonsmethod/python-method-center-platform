import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  organizationStructuredData,
  serializeStructuredData,
  websiteStructuredData
} from "@/lib/seo/structured-data";

describe("brand signals for search engines", () => {
  it("uses the full brand in both localized search titles", () => {
    for (const locale of ["ru", "en"] as const) {
      expect(getDictionary(locale).meta.title).toContain("Python Method Center");
    }
  });

  it("publishes the preferred site name for both languages", () => {
    for (const locale of ["ru", "en"] as const) {
      expect(websiteStructuredData(locale)).toMatchObject({
        "@type": "WebSite",
        name: "Python Method Center",
        alternateName: "Python Method",
        inLanguage: locale
      });
      expect(organizationStructuredData(locale)).toMatchObject({
        "@type": "Organization",
        name: "Python Method Center"
      });
    }
  });

  it("serializes JSON-LD without raw opening angle brackets", () => {
    expect(serializeStructuredData({ name: "</script>" })).not.toContain("<");
  });
});
