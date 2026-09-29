// Pure validation for the alternative-payment request (unit-tested).
//
// People whose cards Stripe cannot accept are not an edge case for this
// center: they are whole countries. Losing them silently at the checkout
// is losing them for good, so the request form has to be forgiving —
// only the fields that are genuinely needed to write back are required.

import type { Locale } from "@/lib/i18n/locale";

export const ALT_PAYMENT_METHODS = [
  "bank",
  "crypto",
  "wise",
  "other"
] as const;

export type AltPaymentMethodId = (typeof ALT_PAYMENT_METHODS)[number];

export const ALT_PAYMENT_PLANS = [
  "preliminary_assessment",
  "personal_support",
  "undecided"
] as const;

export type AltPaymentPlanId = (typeof ALT_PAYMENT_PLANS)[number];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AltPaymentInput = {
  email: string;
  country: string;
  plan: string;
  method: string;
  comment: string;
  consent: boolean;
  honeypot: string;
};

export type AltPaymentValidated = {
  email: string;
  country: string;
  plan: AltPaymentPlanId;
  method: AltPaymentMethodId;
  comment: string;
};

export function validateAltPaymentInput(
  input: AltPaymentInput,
  locale: Locale = "ru"
): { error: string } | AltPaymentValidated {
  const error = (ru: string, en: string) => ({ error: locale === "ru" ? ru : en });

  if (input.honeypot.trim() !== "") {
    return error("Не удалось отправить запрос. Попробуйте ещё раз.", "Could not send your request. Please try again.");
  }

  const email = input.email.trim();

  if (!email || !emailPattern.test(email)) {
    return error("Укажите корректный email — на него мы пришлём реквизиты.", "Enter a valid email address so we can send you the payment details.");
  }

  const country = input.country.trim();

  if (country.length < 2) {
    return error("Напишите страну — от неё зависят доступные способы оплаты.", "Enter your country so we can check which payment methods are available.");
  }

  if (country.length > 100) {
    return error("Название страны слишком длинное.", "The country name is too long.");
  }

  if (!(ALT_PAYMENT_PLANS as readonly string[]).includes(input.plan)) {
    return error("Выберите тариф или пункт «ещё не решил(а)».", "Choose a service, or select “I’m not sure yet.”");
  }

  if (!(ALT_PAYMENT_METHODS as readonly string[]).includes(input.method)) {
    return error("Выберите удобный способ оплаты.", "Choose your preferred payment method.");
  }

  const comment = input.comment.trim();

  if (comment.length > 2000) {
    return error("Комментарий должен быть короче 2000 символов.", "Keep your comment under 2,000 characters.");
  }

  if (!input.consent) {
    return error("Нужно согласие на обработку указанных контактных данных.", "Please consent to the processing of the contact details you provided.");
  }

  return {
    email,
    country,
    plan: input.plan as AltPaymentPlanId,
    method: input.method as AltPaymentMethodId,
    comment
  };
}

export const altPaymentMethodLabels: Record<AltPaymentMethodId, string> = {
  bank: "Банковский перевод",
  crypto: "Криптовалюта (USDT и другие)",
  wise: "Wise / Revolut",
  other: "Другой способ (расскажу в комментарии)"
};

export const altPaymentPlanLabels: Record<AltPaymentPlanId, string> = {
  preliminary_assessment: "Оценка состояния — 299 USD",
  personal_support: "Личное сопровождение — $1,300 / 30 дней",
  undecided: "Ещё не решил(а) — нужен совет"
};
