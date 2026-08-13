// Supabase answers in English and in its own words: "Invalid login
// credentials". A person from the focus group reads that under a Russian
// form and has no idea what to do next — retype the password, confirm the
// email, or write to the team. Every auth failure is translated here into
// one Russian sentence that says what happened and what to do about it.
//
// Pure functions only: the same text is asserted in the tests.

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "already_registered"
  | "rate_limited"
  | "weak_password"
  | "invalid_email"
  | "signup_disabled"
  | "server_error"
  | "unknown";

export type AuthErrorInfo = {
  code: AuthErrorCode;
  message: string;
};

const MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials:
    "Email или пароль не подходят. Проверьте раскладку клавиатуры и лишние пробелы. Если пароль не вспоминается — нажмите «Забыли пароль?» и задайте новый.",
  email_not_confirmed:
    "Аккаунт создан, но email ещё не подтверждён. Откройте ссылку из письма — или отправьте письмо заново кнопкой ниже.",
  already_registered:
    "Такой email уже зарегистрирован. Перейдите на вкладку «Войти», а если пароль не вспоминается — задайте новый через «Забыли пароль?».",
  rate_limited:
    "Слишком много попыток подряд. Подождите минуту и попробуйте ещё раз.",
  weak_password: "Пароль должен быть не короче 6 символов.",
  invalid_email: "Проверьте, правильно ли написан email.",
  signup_disabled:
    "Регистрация сейчас закрыта. Напишите команде — вас заведут вручную.",
  server_error:
    "Не получилось из-за ошибки на нашей стороне. Попробуйте через минуту, а если повторится — напишите команде.",
  unknown:
    "Не получилось войти. Попробуйте ещё раз, а если ошибка повторяется — напишите команде."
};

// Order matters: the first pattern that matches wins, so the narrow cases
// ("email not confirmed") are listed before the broad ones.
const PATTERNS: Array<[RegExp, AuthErrorCode]> = [
  [/email not confirmed|email_not_confirmed|not confirmed/i, "email_not_confirmed"],
  [/already registered|already been registered|user_already_exists|email_exists/i, "already_registered"],
  [/rate limit|too many requests|only request this after|over_email_send_rate/i, "rate_limited"],
  [/password should be|weak_password|password is too short/i, "weak_password"],
  [/unable to validate email|invalid email|email_address_invalid/i, "invalid_email"],
  [/signups not allowed|signup_disabled|signups are disabled/i, "signup_disabled"],
  [/invalid login credentials|invalid_credentials|invalid_grant/i, "invalid_credentials"],
  [/database error|unexpected_failure|internal (server )?error/i, "server_error"]
];

export function translateAuthError(rawMessage: string): AuthErrorInfo {
  const raw = String(rawMessage ?? "");

  for (const [pattern, code] of PATTERNS) {
    if (pattern.test(raw)) {
      return { code, message: MESSAGES[code] };
    }
  }

  return { code: "unknown", message: MESSAGES.unknown };
}

export function authErrorMessage(code: AuthErrorCode): string {
  return MESSAGES[code];
}
