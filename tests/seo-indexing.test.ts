import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  hasEnglishTwin,
  localizedHref,
  LOCALIZED_PATHS,
  readLocaleFromPath
} from "@/lib/i18n/routing";

describe("search indexing signals", () => {
  it("publishes one canonical HTTPS host and dated public URLs", () => {
    const entries = sitemap();

    // Nine public pages, each in two languages. Listing only the Russian
    // side would leave the English one to be found by luck: the language
    // used to live in a cookie, and a crawler carries none.
    expect(entries).toHaveLength(18);
    expect(entries.every((entry) => entry.url.startsWith("https://pythonmethodcenter.com"))).toBe(true);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(true);
  });

  it("gives every page both of its addresses, each naming the other", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    const russian = urls.filter((url) => !url.includes("/en"));
    const english = urls.filter((url) => url.includes("/en"));

    expect(russian).toHaveLength(9);
    expect(english).toHaveLength(9);
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
    expect(localizedHref("/support#emergency", "en")).toBe("/en/support#emergency");
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
