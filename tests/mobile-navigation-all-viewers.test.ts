import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A phone gets the same site as a wide screen: the header with its row of
// signs, the language switch and the account door, not a smaller menu with
// fewer places in it.
describe("mobile navigation across viewer states", () => {
  const layout = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8");
  const nav = fs.readFileSync(path.join(process.cwd(), "components", "SiteNav.tsx"), "utf8");
  const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

  it("renders one header navigation for guests, clients, and staff", () => {
    expect(layout).toContain("<SiteNav labels={dict.nav} viewer={viewer} />");
    expect(layout).toContain("<LanguageSwitcher locale={locale} />");
    expect(layout).not.toContain("PublicMobileDock");
    expect(layout).not.toContain("mobile-header-account");
    expect(nav).toContain('viewer === "client" ? "/cabinet" : "/login"');
    expect(nav).toContain('isStaff ? "/admin"');
    expect(nav).toContain('href="/login?mode=signup"');
  });

  it("never hides the header navigation on narrow or touch-first devices", () => {
    expect(css).not.toContain(".site-nav { display: none; }");
    expect(css).not.toContain(".site-nav {\n    display: none;");
    expect(css).not.toContain("public-mobile-dock");
    // Below 720px the bar is a grid: brand and language first, every sign
    // beneath, nothing scrolled off or hidden.
    expect(css).toContain('"brand lang"');
    expect(css).toContain('"nav nav"');
  });

  it("keeps the team workspace header and navigation on a phone", () => {
    expect(css).not.toContain("body:has(.admin-nav) .site-header");
    expect(css).not.toContain(".admin-nav nav a.admin-nav__founder {\n    display: none;");
    expect(css).not.toContain("admin-mobile-utility");
  });
});
