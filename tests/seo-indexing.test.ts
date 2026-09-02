import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import {
  hasEnglishTwin,
  localizedHref,
  LOCALIZED_PATHS,
  readLocaleFromPath
} from "@/lib/i18n/routing";

describe("search indexing signals", () => {
  it("publishes one canonical HTTPS host and dated public URLs", () => {
    const entries = sitemap();

    // Eight public pages, each in two languages. Listing only the Russian
    // side would leave the English one to be found by luck: the language
    // used to live in a cookie, and a crawler carries none. (/review is a
    // permanent redirect to the plans now, and a redirect is not a page.)
    expect(entries).toHaveLength(16);
    expect(entries.every((entry) => entry.url.startsWith("https://pythonmethodcenter.com"))).toBe(true);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(true);
  });

  it("gives every page both of its addresses, each naming the other", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    const russian = urls.filter((url) => !url.includes("/en"));
    const english = urls.filter((url) => url.includes("/en"));

    expect(russian).toHaveLength(8);
    expect(english).toHaveLength(8);
    expect(new Set(urls).size).toBe(urls.length);

    // Both entries of a pair carry the same alternates, so whichever one a
    // crawler reaches first it learns about the other.
    for (const entry of entries) {
      const languages = entry.alternates?.languages;

      expect(languages?.ru).toBeDefined();
      expect(languages?.en).toBeDefined();
      expect(languages?.en).toContain("/en");
      expect(urls).toContain(languages?.ru);
      expect(urls).toContain(languages?.en);
    }
  });

  // Priorities are written into the XML verbatim, and 0.8 - 0.1 is
  // 0.7000000000000001 in binary floating point.
  it("writes priorities as search engines expect to read them", () => {
    for (const entry of sitemap()) {
      const priority = entry.priority ?? 0;

      expect(priority).toBeGreaterThanOrEqual(0);
      expect(priority).toBeLessThanOrEqual(1);
      expect(String(priority)).toMatch(/^(0(\.\d)?|1)$/);
    }
  });

  it("keeps the English home page at /en rather than /en/", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://pythonmethodcenter.com/en");
    expect(urls).not.toContain("https://pythonmethodcenter.com/en/");
  });

  it("collapses alternate hosts with a permanent redirect", () => {
    const middleware = readFileSync("middleware.ts", "utf8");

    expect(middleware).toContain("requestHost.toLowerCase() === alternateHost.toLowerCase()");
    expect(middleware).toContain("NextResponse.redirect(destination, 308)");
  });

  // A page barred in robots.txt is never fetched, so a crawler can never
  // read the noindex tag on it. Whichever mechanism a page uses, both of
  // its addresses must use the same one.
  it("keeps each language out of the index by the same mechanism", () => {
    const blocked = robots().rules;
    const disallow = (Array.isArray(blocked) ? blocked : [blocked]).flatMap(
      (rule) => (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow])
    );

    // /shop carries a noindex tag, so neither address may be barred.
    expect(disallow).not.toContain("/shop");
    expect(disallow).not.toContain("/en/shop");

    // /payment/success has no tag, so robots.txt is what keeps both out.
    expect(disallow).toContain("/payment/success");
    expect(disallow).toContain("/en/payment/success");
  });

  it("keeps login query variants out of the index with one canonical URL", () => {
    const login = readFileSync("app/(auth)/login/page.tsx", "utf8");

    expect(login).toContain('alternates: { canonical: "/login" }');
    expect(login).toContain("robots: { index: false, follow: false }");
  });
});

// Which addresses exist in each language, decided in one place so a page
// cannot quietly gain an English twin without a translation behind it.
describe("the two address families", () => {
  it("prefixes only the pages that exist in both languages", () => {
    expect(localizedHref("/payment", "en")).toBe("/en/payment");
    expect(localizedHref("/legal/privacy", "en")).toBe("/en/legal/privacy");
    expect(localizedHref("/", "en")).toBe("/en");
  });

  it("leaves everything behind a sign-in alone", () => {
    for (const path of ["/login", "/cabinet", "/cabinet/documents", "/admin", "/onboarding", "/welcome"]) {
      expect(localizedHref(path, "en")).toBe(path);
      expect(hasEnglishTwin(path)).toBe(false);
    }
  });

  it("never touches a Russian address", () => {
    for (const path of ["/payment", "/login", "/", "/legal/offer"]) {
      expect(localizedHref(path, "ru")).toBe(path);
    }
  });

  it("keeps a query string and a fragment where they belong", () => {
    expect(localizedHref("/support#form", "en")).toBe("/en/support#form");
    expect(localizedHref("/payment?plan=5w", "en")).toBe("/en/payment?plan=5w");
    // No twin, so nothing changes — including the query.
    expect(localizedHref("/login?mode=signup", "en")).toBe("/login?mode=signup");
  });

  it("reads the language back out of an address", () => {
    expect(readLocaleFromPath("/en/payment")).toEqual({ locale: "en", path: "/payment" });
    expect(readLocaleFromPath("/en")).toEqual({ locale: "en", path: "/" });
    expect(readLocaleFromPath("/en/")).toEqual({ locale: "en", path: "/" });
    expect(readLocaleFromPath("/payment")).toEqual({ locale: "ru", path: "/payment" });
    expect(readLocaleFromPath("/")).toEqual({ locale: "ru", path: "/" });
  });

  it("does not mistake a path that merely starts with the letters en", () => {
    expect(readLocaleFromPath("/energy")).toEqual({ locale: "ru", path: "/energy" });
  });

  it("is its own inverse for every page that has a twin", () => {
    for (const path of LOCALIZED_PATHS) {
      const english = localizedHref(path, "en");

      expect(readLocaleFromPath(english)).toEqual({ locale: "en", path });
    }
  });
});
