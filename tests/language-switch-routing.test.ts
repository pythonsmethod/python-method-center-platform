import { describe, expect, it } from "vitest";
import { languageSwitchHref, LOCALIZED_PATHS } from "@/lib/i18n/routing";

describe("language switching keeps the current page", () => {
  it.each(LOCALIZED_PATHS)("round-trips %s with its query and fragment", (pathname) => {
    const address = { pathname, search: "?ref=synthetic&next=%2Fcabinet", hash: "#details" };
    const english = languageSwitchHref(address, "en");
    expect(english).toBe(`${pathname === "/" ? "/en" : `/en${pathname}`}${address.search}${address.hash}`);
    const url = new URL(english, "https://example.test");
    expect(languageSwitchHref(url, "ru")).toBe(`${pathname}${address.search}${address.hash}`);
    expect(languageSwitchHref(url, "en")).toBe(english);
  });

  it.each(["/cabinet/chat", "/login", "/admin/cases/synthetic", "/welcome"])(
    "keeps the single address %s in both languages", (pathname) => {
      const address = { pathname, search: "?case=synthetic", hash: "#messages" };
      for (const locale of ["ru", "en"] as const) {
        expect(languageSwitchHref(address, locale)).toBe(`${pathname}?case=synthetic#messages`);
      }
    }
  );

  it("uses the address after client navigation, not the initial layout page", () => {
    const address = { pathname: "/", search: "", hash: "" };
    expect(languageSwitchHref(address, "en")).toBe("/en");
    address.pathname = "/payment";
    expect(languageSwitchHref(address, "en")).toBe("/en/payment");
  });
});
