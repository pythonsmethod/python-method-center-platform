import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

// Supabase writes the confirmation and password-reset emails itself. Its
// templates choose the language from user_metadata.locale, so the site has
// to put it there; an English visitor used to get the Russian email.
describe("the language of Supabase's own emails", () => {
  const actions = read("lib", "auth", "actions.ts");

  it("records the language on the auth user at sign-up", () => {
    expect(actions).toContain("data: { phone, locale }");
  });

  it("keeps it current at sign-in and on a language switch, without blocking either", () => {
    expect(actions).toContain("await rememberAuthEmailLocale(supabase, data.user?.user_metadata?.locale, locale);");
    expect(actions).toMatch(/async function rememberAuthEmailLocale[\s\S]*?try \{\s*await supabase\.auth\.updateUser\(\{ data: \{ locale \} \}\);\s*\} catch/);
    const setLocale = read("lib", "i18n", "set-locale.ts");
    expect(setLocale).toMatch(/try \{[\s\S]*supabase\.auth\.updateUser\(\{ data: \{ locale \} \}\)[\s\S]*\} catch/);
  });

  it("tells the person in their language that the email was sent again", () => {
    expect(actions).toContain("The email has been sent again to ${email}.");
  });

  it.each(["confirm-signup.html", "reset-password.html"])("%s has an English branch and a Russian default", (file) => {
    const template = read("docs", "launch", "email-templates", file);
    expect(template.startsWith('{{ if eq .Data.locale "en" }}')).toBe(true);
    expect(template.match(/\{\{ else \}\}/g)).toHaveLength(1);
    expect(template.trimEnd().endsWith("{{ end }}")).toBe(true);
    const [english] = template.split("{{ else }}");
    expect(english).not.toMatch(/[А-Яа-яЁё]/);
  });
});
