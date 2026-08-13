// Pure validation helpers (unit-tested).

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Введите email.";
  }

  if (trimmed.length > 320 || !emailPattern.test(trimmed)) {
    return "Введите корректный email.";
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

export function validatePhone(phone: string): string | null {
  const digits = normalizePhone(phone).replace(/\D/g, "");

  if (!digits) {
    return "Введите номер телефона — по нему с вами свяжется команда.";
  }

  // 7 digits is the shortest national number in use, 15 the international
  // maximum (E.164).
  if (digits.length < 7 || digits.length > 15) {
    return "Проверьте номер телефона: он должен содержать от 7 до 15 цифр, вместе с кодом страны.";
  }

  return null;
}

export function validateNewPassword(
  password: string,
  confirm: string
): string | null {
  if (!password || !confirm) {
    return "Заполните оба поля пароля.";
  }

  if (password.length < 6) {
    return "Пароль должен быть не короче 6 символов.";
  }

  if (password.length > 72) {
    return "Пароль должен быть короче 72 символов.";
  }

  if (password !== confirm) {
    return "Пароли не совпадают.";
  }

  return null;
}
