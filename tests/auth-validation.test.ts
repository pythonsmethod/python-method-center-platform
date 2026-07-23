import { describe, expect, it } from "vitest";
import {
  validateNewPassword,
  validateRecoveryEmail
} from "@/lib/auth/validation";

describe("validateRecoveryEmail", () => {
  it("accepts a normal email", () => {
    expect(validateRecoveryEmail("maria@example.com")).toBeNull();
  });

  it("rejects an empty value", () => {
    expect(validateRecoveryEmail("")).toBeTruthy();
    expect(validateRecoveryEmail("   ")).toBeTruthy();
  });

  it("rejects malformed emails", () => {
    expect(validateRecoveryEmail("not-an-email")).toBeTruthy();
    expect(validateRecoveryEmail("a@b")).toBeTruthy();
    expect(validateRecoveryEmail("a b@c.com")).toBeTruthy();
  });
});

describe("validateNewPassword", () => {
  it("accepts a matching pair of sufficient length", () => {
    expect(validateNewPassword("secret1", "secret1")).toBeNull();
  });

  it("rejects short passwords", () => {
    expect(validateNewPassword("12345", "12345")).toBeTruthy();
  });

  it("rejects mismatched passwords", () => {
    expect(validateNewPassword("secret1", "secret2")).toBeTruthy();
  });

  it("rejects empty fields", () => {
    expect(validateNewPassword("", "")).toBeTruthy();
    expect(validateNewPassword("secret1", "")).toBeTruthy();
  });
});
