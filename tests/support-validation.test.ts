import { describe, expect, it } from "vitest";
import { validatePublicSupportInput } from "@/lib/support/validation";

const valid = {
  contactName: "Иван Иванов",
  email: "guest@example.com",
  phone: "+1 (202) 555-0123",
  category: "payment",
  message: "Оплатила тариф, но не вижу оплату в кабинете.",
  consent: true,
  honeypot: ""
};

describe("validatePublicSupportInput", () => {
  it("accepts a valid guest request", () => {
    expect(validatePublicSupportInput(valid)).toEqual({
      category: "payment",
      contactName: "Иван Иванов"
    });
  });

  it("requires phone and both first and last name in both locales", () => {
    for (const locale of ["ru", "en"] as const) {
      expect(validatePublicSupportInput({ ...valid, locale, phone: "123" })).toHaveProperty("error");
      expect(validatePublicSupportInput({ ...valid, locale, contactName: "Иван" })).toHaveProperty("error");
    }
  });

  it("rejects filled honeypot (bot)", () => {
    expect(
      validatePublicSupportInput({ ...valid, honeypot: "http://spam" })
    ).toHaveProperty("error");
  });

  it("rejects bad email", () => {
    expect(
      validatePublicSupportInput({ ...valid, email: "nope" })
    ).toHaveProperty("error");
  });

  it("rejects unknown category", () => {
    expect(
      validatePublicSupportInput({ ...valid, category: "hack" })
    ).toHaveProperty("error");
  });

  it("rejects too-short and too-long messages", () => {
    expect(
      validatePublicSupportInput({ ...valid, message: "коротко" })
    ).toHaveProperty("error");
    expect(
      validatePublicSupportInput({ ...valid, message: "а".repeat(4001) })
    ).toHaveProperty("error");
  });

  it("rejects missing consent", () => {
    expect(
      validatePublicSupportInput({ ...valid, consent: false })
    ).toHaveProperty("error");
  });
});
