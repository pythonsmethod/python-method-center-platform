import { describe, expect, it } from "vitest";
import { languageSwitchHref } from "@/lib/i18n/routing";

// Switching language must land the reader on the same page, not on the home
// page and not on a stripped address. The Case detail page is reached with a
// `?view=today` query and an anchor into the conversation, and losing either
// would drop the founder somewhere else mid-task.

const at = (pathname: string, search = "", hash = "") => ({ pathname, search, hash });

describe("language switch keeps the route", () => {
  it("preserves pathname, query and hash on a workspace address", () => {
    const location = at(
      "/admin/cases/11111111-1111-4111-8111-111111111111",
      "?view=today",
      "#case-conversation"
    );

    for (const locale of ["en", "ru"] as const) {
      expect(languageSwitchHref(location, locale)).toBe(
        "/admin/cases/11111111-1111-4111-8111-111111111111?view=today#case-conversation"
      );
    }
  });

  it("preserves query and hash on a page that has an English twin", () => {
    expect(languageSwitchHref(at("/payment", "?plan=100", "#details"), "en")).toBe(
      "/en/payment?plan=100#details"
    );
    expect(languageSwitchHref(at("/en/payment", "?plan=100", "#details"), "ru")).toBe(
      "/payment?plan=100#details"
    );
  });

  it("returns to the same address in both directions", () => {
    for (const path of ["/admin/notifications", "/admin/cases", "/cabinet"]) {
      const english = languageSwitchHref(at(path), "en");
      expect(languageSwitchHref(at(english), "ru")).toBe(path);
    }
  });

  it("keeps an empty query and hash empty", () => {
    expect(languageSwitchHref(at("/admin/notifications"), "en")).toBe("/admin/notifications");
  });
});
