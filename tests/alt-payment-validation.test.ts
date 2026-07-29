import { describe, expect, it } from "vitest";
import { validateAltPaymentInput } from "@/lib/payments/alt-validation";

const valid = {
  email: "person@example.com",
  country: "Казахстан",
  plan: "support_5_weeks",
  method: "bank",
  comment: "Карта банка не проходит",
  consent: true,
  honeypot: ""
};

describe("alternative payment request", () => {
  it("accepts a complete request", () => {
    const result = validateAltPaymentInput(valid);

    expect(result).toEqual({
      email: "person@example.com",
      country: "Казахстан",
      plan: "support_5_weeks",
      method: "bank",
      comment: "Карта банка не проходит"
    });
  });

  it("accepts a request without a comment", () => {
    const result = validateAltPaymentInput({ ...valid, comment: "   " });

    expect("error" in result).toBe(false);
  });

  it("allows a person who has not chosen a plan yet", () => {
    const result = validateAltPaymentInput({ ...valid, plan: "undecided" });

    expect("error" in result).toBe(false);
  });

  it("requires an address to write back to", () => {
    expect(validateAltPaymentInput({ ...valid, email: "не-почта" })).toEqual({
      error: "Укажите корректный email — на него мы пришлём реквизиты."
    });
  });

  it("requires the country: it decides which methods exist", () => {
    expect(validateAltPaymentInput({ ...valid, country: " " })).toEqual({
      error: "Напишите страну — от неё зависят доступные способы оплаты."
    });
  });

  it("requires consent to store the contact", () => {
    expect(validateAltPaymentInput({ ...valid, consent: false })).toEqual({
      error: "Нужно согласие на обработку указанных контактных данных."
    });
  });

  it("rejects unknown plans and methods rather than guessing", () => {
    expect("error" in validateAltPaymentInput({ ...valid, plan: "vip" })).toBe(
      true
    );
    expect(
      "error" in validateAltPaymentInput({ ...valid, method: "cash" })
    ).toBe(true);
  });

  it("silently rejects bots that fill the hidden field", () => {
    expect(
      "error" in validateAltPaymentInput({ ...valid, honeypot: "spam" })
    ).toBe(true);
  });
});
