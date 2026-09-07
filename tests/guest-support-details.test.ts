import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("guest support details", () => {
  it("shows name, phone and opening message to staff", () => {
    const page = read("app/(admin)/admin/requests/page.tsx");
    expect(page).toContain("request.contact_name");
    expect(page).toContain("request.contact_phone");
    expect(page).toContain("request.body");
  });

  it("has no status badge or status buttons", () => {
    const page = read("app/(admin)/admin/requests/page.tsx");
    expect(page).not.toContain("supportStatusLabel");
    expect(page).not.toContain("RequestStatusButtons");
  });

  it("requires localized name and phone fields", () => {
    const form = read("components/support/PublicSupportForm.tsx");
    const dictionaries = read("lib/i18n/dictionaries.ts");
    expect(form).toContain('name="contactName" required');
    expect(form).toContain('name="phone" required');
    expect(dictionaries).toContain('formName: "Имя и фамилия (обязательно)"');
    expect(dictionaries).toContain('formName: "First and last name (required)"');
  });
});
