// Pure validation helpers (unit-tested).

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string, locale: "ru" | "en" = "ru"): string | null {
  const trimmed = email.trim();

  if (!trimmed) {
    return locale === "ru" ? "Введите email." : "Enter your email.";
  }

  if (trimmed.length > 320 || !emailPattern.test(trimmed)) {
    return locale === "ru" ? "Введите корректный email." : "Enter a valid email address.";
  }

  return null;
}

// The centre serves several countries, so the country code is never
// guessed from the digits: a Russian 8, an Armenian 0 and a French 0 mean
// different things. Only spacing and punctuation are removed, and the "+"
// is kept if the person wrote one.
export function normalizePhone(phone: string): string {
  const raw = String(phone ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return raw.startsWith("+") ? `+${digits}` : digits;
}

export function validatePhone(phone: string, locale: "ru" | "en" = "ru"): string | null {
  const digits = normalizePhone(phone).replace(/\D/g, "");

  if (!digits) {
    return locale === "ru" ? "Введите номер телефона — по нему с вами свяжется команда." : "Enter a phone number so the team can contact you.";
  }

  // 7 digits is the shortest national number in use, 15 the international
  // maximum (E.164).
  if (digits.length < 7 || digits.length > 15) {
    return locale === "ru" ? "Проверьте номер телефона: он должен содержать от 7 до 15 цифр, вместе с кодом страны." : "Check the phone number: it must contain 7 to 15 digits including the country code.";
  }

  return null;
}

export function validateNewPassword(
  password: string,
  confirm: string,
  locale: "ru" | "en" = "ru"
): string | null {
  if (!password || !confirm) {
    return locale === "ru" ? "Заполните оба поля пароля." : "Complete both password fields.";
  }

  if (password.length < 6) {
    return locale === "ru" ? "Пароль должен быть не короче 6 символов." : "The password must be at least 6 characters.";
  }

  if (password.length > 72) {
    return locale === "ru" ? "Пароль должен быть короче 72 символов." : "The password must be shorter than 72 characters.";
  }

  if (password !== confirm) {
    return locale === "ru" ? "Пароли не совпадают." : "The passwords do not match.";
  }

  return null;
}
