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
  locale?: "ru" | "en";
};

export function validatePublicSupportInput(
  input: PublicSupportInput
): { error: string } | { category: PublicSupportCategory } {
  const en = input.locale === "en";
  // Bots fill every field; humans never see this one.
  if (input.honeypot.trim() !== "") {
    return { error: en ? "We could not send the message. Please try again." : "Не удалось отправить сообщение. Попробуйте ещё раз." };
  }

  if (!input.email.trim() || !emailPattern.test(input.email.trim())) {
    return { error: en ? "Enter a valid email address for our reply." : "Укажите корректный email для ответа." };
  }

  if (!(PUBLIC_SUPPORT_CATEGORIES as readonly string[]).includes(input.category)) {
    return { error: en ? "Choose a request category." : "Выберите тему обращения." };
  }

  const message = input.message.trim();

  if (message.length < 10) {
    return { error: en ? "Describe your question in at least a few words (10 characters minimum)." : "Опишите вопрос хотя бы в нескольких словах (от 10 символов)." };
  }

  if (message.length > 4000) {
    return { error: en ? "The message must be shorter than 4,000 characters." : "Сообщение должно быть короче 4000 символов." };
  }

  if (!input.consent) {
    return { error: en ? "Consent to process the provided contact details is required." : "Нужно согласие на обработку указанных контактных данных." };
  }

  return { category: input.category as PublicSupportCategory };
}
