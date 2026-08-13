import { describe, expect, it } from "vitest";
import { normalizePhone, validatePhone } from "@/lib/auth/validation";

// The number is what the team dials when someone registers and goes quiet,
// so it has to survive the way real people type it — and it must never be
// silently rewritten into a different country's number.
describe("normalizePhone", () => {
  it("strips the punctuation people type", () => {
    expect(normalizePhone("+7 (999) 123-45-67")).toBe("+79991234567");
    expect(normalizePhone(" +374 55 123456 ")).toBe("+37455123456");
  });

  it("keeps a number written without the plus as it was written", () => {
    expect(normalizePhone("8 999 123 45 67")).toBe("89991234567");
  });

  it("never guesses a country code", () => {
    // A Russian 8 and a French 0 are both trunk prefixes and mean
    // different things — turning either into "+7" would invent a number.
    expect(normalizePhone("8 999 123 45 67")).not.toContain("+");
    expect(normalizePhone("06 12 34 56 78")).toBe("0612345678");
  });

  it("returns an empty string when there are no digits", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("   ")).toBe("");
    expect(normalizePhone("телефон")).toBe("");
  });
});

describe("validatePhone", () => {
  it("accepts the formats the centre actually receives", () => {
    expect(validatePhone("+7 999 123-45-67")).toBeNull();
    expect(validatePhone("89991234567")).toBeNull();
    expect(validatePhone("+374 55 123456")).toBeNull();
    expect(validatePhone("+1 555 123 4567")).toBeNull();
  });

  it("rejects an empty field", () => {
    expect(validatePhone("")).toBeTruthy();
    expect(validatePhone("   ")).toBeTruthy();
  });

  it("rejects too few and too many digits", () => {
    expect(validatePhone("12345")).toBeTruthy();
    expect(validatePhone("+1234567890123456")).toBeTruthy();
  });

  it("answers in Russian, like the rest of the form", () => {
    expect(/[а-яё]/i.test(validatePhone("") ?? "")).toBe(true);
    expect(/[а-яё]/i.test(validatePhone("123") ?? "")).toBe(true);
  });
});
