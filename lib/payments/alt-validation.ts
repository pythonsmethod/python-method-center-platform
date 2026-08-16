// Pure validation for the alternative-payment request (unit-tested).
//
// People whose cards Stripe cannot accept are not an edge case for this
// center: they are whole countries. Losing them silently at the checkout
// is losing them for good, so the request form has to be forgiving —
// only the fields that are genuinely needed to write back are required.

export const ALT_PAYMENT_METHODS = [
  "bank",
  "crypto",
  "paypal",
  "wise",
  "other"
] as const;

export type AltPaymentMethodId = (typeof ALT_PAYMENT_METHODS)[number];

export const ALT_PAYMENT_PLANS = [
  "support_5_weeks",
  "support_15_weeks",
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
  input: AltPaymentInput
): { error: string } | AltPaymentValidated {
  if (input.honeypot.trim() !== "") {
    return { error: "Не удалось отправить запрос. Попробуйте ещё раз." };
  }

  const email = input.email.trim();

  if (!email || !emailPattern.test(email)) {
    return { error: "Укажите корректный email — на него мы пришлём реквизиты." };
  }

  const country = input.country.trim();

  if (country.length < 2) {
    return { error: "Напишите страну — от неё зависят доступные способы оплаты." };
  }

  if (country.length > 100) {
    return { error: "Название страны слишком длинное." };
  }

  if (!(ALT_PAYMENT_PLANS as readonly string[]).includes(input.plan)) {
    return { error: "Выберите тариф или пункт «ещё не решил(а)»." };
  }

  if (!(ALT_PAYMENT_METHODS as readonly string[]).includes(input.method)) {
    return { error: "Выберите удобный способ оплаты." };
  }

  const comment = input.comment.trim();

  if (comment.length > 2000) {
    return { error: "Комментарий должен быть короче 2000 символов." };
  }

  if (!input.consent) {
    return { error: "Нужно согласие на обработку указанных контактных данных." };
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
  paypal: "PayPal",
  wise: "Wise / Revolut",
  other: "Другой способ (расскажу в комментарии)"
};

export const altPaymentPlanLabels: Record<AltPaymentPlanId, string> = {
  support_5_weeks: "Сопровождение — 5 недель",
  support_15_weeks: "Сопровождение — 100 дней",
  undecided: "Ещё не решил(а) — нужен совет"
};
