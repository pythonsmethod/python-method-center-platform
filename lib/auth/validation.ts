// Pure validation helpers (unit-tested).

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRecoveryEmail(email: string): string | null {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Введите email.";
  }

  if (trimmed.length > 320 || !emailPattern.test(trimmed)) {
    return "Введите корректный email.";
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
