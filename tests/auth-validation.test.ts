import { describe, expect, it } from "vitest";
import {
  validateNewPassword,
  validateEmail
} from "@/lib/auth/validation";

describe("validateEmail", () => {
  it("accepts a normal email", () => {
    expect(validateEmail("maria@example.com")).toBeNull();
  });

  it("rejects an empty value", () => {
    expect(validateEmail("")).toBeTruthy();
    expect(validateEmail("   ")).toBeTruthy();
  });

  it("rejects malformed emails", () => {
    expect(validateEmail("not-an-email")).toBeTruthy();
    expect(validateEmail("a@b")).toBeTruthy();
    expect(validateEmail("a b@c.com")).toBeTruthy();
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
