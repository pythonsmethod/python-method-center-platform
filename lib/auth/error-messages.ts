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
  | "email_send_failed"
  | "server_error"
  | "unknown";

export type AuthErrorInfo = {
  code: AuthErrorCode;
  message: string;
};

const MESSAGES_RU: Record<AuthErrorCode, string> = {
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
  email_send_failed:
    "Аккаунт не создан: не удалось отправить письмо подтверждения. Это неполадка с нашей почтой, а не ваша ошибка. Напишите команде — вас заведут вручную.",
  server_error:
    "Не получилось из-за ошибки на нашей стороне. Попробуйте через минуту, а если повторится — напишите команде.",
  // Deliberately says neither "войти" nor "зарегистрироваться": the same
  // sentence is shown under the sign-in form and under the sign-up form,
  // and "не получилось войти" on a registration page reads as an answer to
  // a question nobody asked.
  unknown:
    "Не получилось. Попробуйте ещё раз, а если ошибка повторяется — напишите команде."
};

const MESSAGES_EN: Record<AuthErrorCode, string> = {
  invalid_credentials: "The email or password is incorrect. Check for typing errors, or use ‘Forgot password?’ to set a new password.",
  email_not_confirmed: "Your account exists, but the email is not confirmed yet. Open the link in the email or resend it below.",
  already_registered: "This email is already registered. Switch to Sign in, or use ‘Forgot password?’ to set a new password.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
  weak_password: "The password must be at least 6 characters.",
  invalid_email: "Check that the email address is written correctly.",
  signup_disabled: "Registration is currently closed. Contact the team and we will help you.",
  email_send_failed: "The account was not created because the confirmation email could not be sent. Contact the team and we will help you.",
  server_error: "Something went wrong on our side. Try again in a minute, and contact the team if it continues.",
  unknown: "It did not work. Try again, and contact the team if the error continues."
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
  // The mail sender is misconfigured or refusing. Supabase reports this as
  // a plain 500, and left unrecognised it reached the reader as "try
  // again" — advice that cannot work, because trying again sends the same
  // letter through the same broken sender.
  [/error sending|failed to send|sending (confirmation|recovery|magic)|smtp/i, "email_send_failed"],
  [/invalid login credentials|invalid_credentials|invalid_grant/i, "invalid_credentials"],
  [/database error|unexpected_failure|internal (server )?error/i, "server_error"]
];

export function translateAuthError(rawMessage: string, locale: "ru" | "en" = "ru"): AuthErrorInfo {
  const raw = String(rawMessage ?? "");
  const messages = locale === "en" ? MESSAGES_EN : MESSAGES_RU;

  for (const [pattern, code] of PATTERNS) {
    if (pattern.test(raw)) {
      return { code, message: messages[code] };
    }
  }

  return { code: "unknown", message: messages.unknown };
}

export function authErrorMessage(code: AuthErrorCode, locale: "ru" | "en" = "ru"): string {
  return (locale === "en" ? MESSAGES_EN : MESSAGES_RU)[code];
}
