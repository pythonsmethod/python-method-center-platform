import { describe, expect, it } from "vitest";
import {
  emailExactMatchPattern,
  normalizePayerEmail
} from "@/lib/payments/stripe";

describe("payer email normalization (P2-01)", () => {
  it("lowercases and trims", () => {
    expect(normalizePayerEmail("  Anna.D@Gmail.COM ")).toBe("anna.d@gmail.com");
  });

  it("rejects empty and mail-less strings", () => {
    expect(normalizePayerEmail(null)).toBeNull();
    expect(normalizePayerEmail(undefined)).toBeNull();
    expect(normalizePayerEmail("   ")).toBeNull();
    expect(normalizePayerEmail("not-an-email")).toBeNull();
  });
});

describe("exact-match pattern escaping (P2-01)", () => {
  it("escapes underscore so a_@gmail.com cannot match ab@gmail.com", () => {
    const pattern = emailExactMatchPattern("a_@gmail.com");

    expect(pattern).toBe("a\\_@gmail.com");
  });

  it("escapes percent so a%@gmail.com cannot match anything@gmail.com", () => {
    const pattern = emailExactMatchPattern("a%@gmail.com");

    expect(pattern).toBe("a\\%@gmail.com");
  });

  it("escapes backslash before the other metacharacters", () => {
    expect(emailExactMatchPattern("a\\_b@x.com")).toBe("a\\\\\\_b@x.com");
  });

  it("leaves ordinary emails untouched", () => {
    expect(emailExactMatchPattern("anna@gmail.com")).toBe("anna@gmail.com");
  });
});
