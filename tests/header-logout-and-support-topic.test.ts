import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

describe("sign-out in the top bar", () => {
  const nav = read("components", "SiteNav.tsx");
  const cabinet = read("components", "cabinet", "CabinetShell.tsx");
  const dict = read("lib", "i18n", "dictionaries.ts");

  it("replaces the sign-in door with a sign-out button once signed in", () => {
    expect(nav).toContain('import { logoutAction } from "@/lib/auth/actions";');
    expect(nav).toContain("<form action={logoutAction} className=\"site-nav__auth\">");
    expect(nav).toContain('{labels.logout ?? "Выйти"}');
    // Guests still get the sign-in and sign-up pair.
    expect(nav).toContain('href="/login?mode=signup"');
  });

  it("is labelled in both languages", () => {
    expect(dict).toContain('logout: "Выйти",\n    sections: "Разделы сайта"');
    expect(dict).toContain('logout: "Sign out",\n    sections: "Site sections"');
  });

  it("is in the client cabinet top bar too, and fits on a phone", () => {
    expect(cabinet).toContain('className="web-cab__logout"');
    const css = read("app", "globals.css");
    // On a phone the words in the bar give way so the button stays on screen.
    expect(css).toContain(".web-cab__mobile-brand span,.web-cab__menu-label { display:none; }");
    expect(css).toMatch(/@media \(max-width:430px\) \{\n[^}]*\.web-cab__token \{ display:none; \}/);
  });
});

describe("support forms without a topic", () => {
  it("does not ask a guest to choose a topic", () => {
    const form = read("components", "support", "PublicSupportForm.tsx");
    expect(form).not.toContain('name="category"');
    expect(read("lib", "support", "validation.ts")).not.toContain("category");
  });

  it("does not ask a signed-in client for a subject", () => {
    const form = read("app", "(client)", "cabinet", "SupportRequestForm.tsx");
    expect(form).not.toContain('name="subject"');
    expect(read("lib", "support", "actions.ts")).toContain('"Message to support" : "Сообщение в поддержку"');
  });
});
