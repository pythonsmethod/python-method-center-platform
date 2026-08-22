import { afterEach, describe, expect, it } from "vitest";
import { isKarenEmail, karenAllowlist } from "@/lib/auth/require-karen";

describe("Karen private assistant access", () => {
  const original = process.env.KAREN_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.KAREN_EMAILS;
    else process.env.KAREN_EMAILS = original;
  });

  it("fails closed when no Karen email is configured", () => {
    delete process.env.KAREN_EMAILS;

    expect(karenAllowlist()).toEqual([]);
    expect(isKarenEmail("admin@example.com")).toBe(false);
  });

  it("allows only configured emails, case-insensitively", () => {
    process.env.KAREN_EMAILS = " karen@example.com, professor@example.com ";

    expect(isKarenEmail("KAREN@example.com")).toBe(true);
    expect(isKarenEmail("professor@example.com")).toBe(true);
    expect(isKarenEmail("anna@example.com")).toBe(false);
    expect(isKarenEmail(null)).toBe(false);
  });
});
