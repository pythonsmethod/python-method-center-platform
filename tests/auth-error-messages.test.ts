import { describe, expect, it } from "vitest";
import {
  translateAuthError,
  type AuthErrorCode
} from "@/lib/auth/error-messages";

// The focus group met these strings on a phone, in Russian surroundings.
// Nothing English may reach the form, and every message must name the next
// step the person can take.
describe("translateAuthError", () => {
  const cases: Array<[string, AuthErrorCode]> = [
    ["Invalid login credentials", "invalid_credentials"],
    ["Email not confirmed", "email_not_confirmed"],
    ["User already registered", "already_registered"],
    ["A user with this email address has already been registered", "already_registered"],
    ["Email rate limit exceeded", "rate_limited"],
    ["For security purposes, you can only request this after 47 seconds", "rate_limited"],
    ["Password should be at least 6 characters", "weak_password"],
    ["Unable to validate email address: invalid format", "invalid_email"],
    ["Signups not allowed for this instance", "signup_disabled"],
    ["Database error saving new user", "server_error"],
    ["Error sending confirmation email", "email_send_failed"],
    ["Error sending recovery email", "email_send_failed"]
  ];

  for (const [raw, code] of cases) {
    it(`recognises "${raw}"`, () => {
      expect(translateAuthError(raw).code).toBe(code);
    });
  }

  it("falls back to a usable message for anything unseen", () => {
    const result = translateAuthError("something nobody has met yet");

    expect(result.code).toBe("unknown");
    expect(result.message).toContain("Не получилось");
  });

  it("survives an empty or missing message", () => {
    expect(translateAuthError("").code).toBe("unknown");
    expect(translateAuthError(undefined as unknown as string).code).toBe(
      "unknown"
    );
  });

  it("never leaks the English original to the reader", () => {
    for (const [raw] of cases) {
      const { message } = translateAuthError(raw);

      expect(message).not.toContain(raw);
      expect(/[а-яё]/i.test(message)).toBe(true);
    }
  });

  // The same sentence appears under the sign-in form and the sign-up form.
  // "Не получилось войти" under "Создать аккаунт" answers a question the
  // person did not ask, and it happened to a live focus group.
  it("keeps the fallback free of either verb", () => {
    const { message } = translateAuthError("something nobody has met yet");

    expect(message).not.toMatch(/войти|зарегистр/i);
  });

  it("does not tell someone to retry a letter that cannot be sent", () => {
    const { message } = translateAuthError("Error sending confirmation email");

    expect(message).toContain("не ваша ошибка");
    expect(message).not.toMatch(/попробуйте ещё раз/i);
  });

  it("tells a locked-out person where to go next", () => {
    expect(translateAuthError("Invalid login credentials").message).toContain(
      "Забыли пароль?"
    );
    expect(translateAuthError("Email not confirmed").message).toContain(
      "письм"
    );
  });
});
