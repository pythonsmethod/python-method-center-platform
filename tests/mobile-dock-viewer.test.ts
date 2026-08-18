import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Which navigation a phone gets, and why it must not change under someone.
//
// The bottom dock used to be rendered for guests only. Signing in removed
// it, and the phone fell back to the desktop bar stacked into a ~300px
// block — a third of the screen spent on navigation before any content,
// and a site that looks like a different one than the one a person
// registered on. Reported as "постоянно прыгает сайт в разные версии то
// версия с кнопками наверху то версия кнопки внизу".
//
// The dock is now rendered for everyone and names the signed-in person's
// own door, so on a phone the shape of the site never changes underneath
// them.

const dock = readFileSync("components/PublicMobileDock.tsx", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("who gets the bottom dock", () => {
  it("renders it for every viewer, not guests alone", () => {
    expect(layout).toContain("<PublicMobileDock locale={locale} viewer={viewer} />");
    expect(layout).not.toContain('viewer === "anonymous" ? <PublicMobileDock');
  });

  it("takes the viewer rather than assuming a stranger", () => {
    expect(dock).toContain("viewer: NavViewer");
  });
});

describe("the dock's account door", () => {
  it("sends a member of the team to the workspace", () => {
    expect(dock).toContain('viewer === "staff"');
    expect(dock).toContain('href: "/admin"');
  });

  it("sends a client to their cabinet", () => {
    expect(dock).toContain('viewer === "client"');
    expect(dock).toContain('href: "/cabinet"');
  });

  it("still offers a stranger both doors by name", () => {
    expect(dock).toContain('href: "/login"');
    expect(dock).toContain("Вход / Регистрация");
    expect(dock).toContain("Sign in / Sign up");
  });

  it("names the signed-in doors in both languages", () => {
    for (const label of ["Рабочее место", "Workspace", "Кабинет", "Cabinet"]) {
      expect(dock).toContain(label);
    }
  });
});

describe("screens that bring their own navigation", () => {
  // The cabinet, the workspace, the installed-app welcome and the app
  // shell each hide the public header and footer. Now that the dock is
  // rendered for signed-in people too, it reaches those screens as well
  // and has to be hidden with them — otherwise it lands on top of the
  // navigation they already have.
  it("hides the dock wherever the public header is hidden", () => {
    for (const shell of [
      "body:has(.web-cab) .public-mobile-dock",
      "body:has(.admin-nav) .public-mobile-dock",
      "body:has(.app-welcome) .public-mobile-dock",
      "body.welcome-active .public-mobile-dock",
      "body:has(.pm-app) .public-mobile-dock"
    ]) {
      expect(css).toContain(shell);
    }
  });

  it("keeps the top bar and the dock from showing at once on a phone", () => {
    expect(css).toContain(
      "body:has(.public-mobile-dock) .site-header .site-nav { display: none; }"
    );
  });
});
