// Pure validation for the public (guest) support form (unit-tested).

export const PUBLIC_SUPPORT_CATEGORIES = [
  "login",
  "payment",
  "technical",
  "other"
] as const;

export type PublicSupportCategory = (typeof PUBLIC_SUPPORT_CATEGORIES)[number];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type PublicSupportInput = {
  email: string;
  category: string;
  message: string;
  consent: boolean;
  honeypot: string;
};

export function validatePublicSupportInput(
  input: PublicSupportInput
): { error: string } | { category: PublicSupportCategory } {
  // Bots fill every field; humans never see this one.
  if (input.honeypot.trim() !== "") {
    return { error: "Не удалось отправить сообщение. Попробуйте ещё раз." };
  }

  if (!input.email.trim() || !emailPattern.test(input.email.trim())) {
    return { error: "Укажите корректный email для ответа." };
  }

  if (!(PUBLIC_SUPPORT_CATEGORIES as readonly string[]).includes(input.category)) {
    return { error: "Выберите тему обращения." };
  }

  const message = input.message.trim();

  if (message.length < 10) {
    return { error: "Опишите вопрос хотя бы в нескольких словах (от 10 символов)." };
  }

  if (message.length > 4000) {
    return { error: "Сообщение должно быть короче 4000 символов." };
  }

  if (!input.consent) {
    return { error: "Нужно согласие на обработку указанных контактных данных." };
  }

  return { category: input.category as PublicSupportCategory };
}
