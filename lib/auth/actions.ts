"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { attachReferral, REFERRAL_COOKIE } from "@/lib/referrals/queries";
import type { AuthActionState } from "@/lib/auth/types";
import {
  normalizePhone,
  validateEmail,
  validateNewPassword,
  validatePhone
} from "@/lib/auth/validation";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth/pending-email";
import { createRegistrationProfile } from "@/lib/profile/registration";
import { getLocale } from "@/lib/i18n/locale";
import {
  translateAuthError,
  type AuthErrorCode
} from "@/lib/auth/error-messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";

function errorState(message: string, code?: AuthErrorCode): AuthActionState {
  return { status: "error", message, code };
}

function readCredentials(formData: FormData) {
  // Emails are case-insensitive, and a phone keyboard capitalises the first
  // letter of everything. Someone who registered as "Anna@mail.ru" must be
  // able to sign in as "anna@mail.ru".
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  return { email, password };
}

function sanitizeNextPath(value: FormDataEntryValue | null): string {
  const nextPath = String(value ?? "/cabinet");

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/cabinet";
  }

  return nextPath;
}

async function getEmailRedirectTo(): Promise<string> {
  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  return `${origin}/auth/callback`;
}

// Supabase sessions are persistent by default. When a person explicitly
// clears "Remember me", rewrite the freshly issued auth cookies as session
// cookies so the browser removes them when it closes.
async function applyRememberPreference(formData: FormData): Promise<void> {
  if (formData.get("remember") === "on") {
    return;
  }

  const store = await cookies();

  for (const cookie of store.getAll()) {
    if (!cookie.name.startsWith("sb-")) {
      continue;
    }

    store.set(cookie.name, cookie.value, {
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
  }
}

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return errorState("Введите email и пароль.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    const { code, message } = translateAuthError(error.message);

    return errorState(message, code);
  }

  await applyRememberPreference(formData);

  let nextPath = sanitizeNextPath(formData.get("next"));

  // Staff land in their own workspace instead of the client cabinet unless
  // they were explicitly heading somewhere else.
  if (nextPath === "/cabinet" && data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role === "admin" || profile?.role === "support") {
      nextPath = "/admin";
    }
  }

  redirect(nextPath);
}

export async function signUpWithPassword(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return errorState("Введите email и пароль.");
  }

  const emailError = validateEmail(email);

  if (emailError) {
    return errorState(emailError);
  }

  // The password is typed twice. Without the second field a slip on a phone
  // keyboard creates an account whose password nobody knows — the person
  // then reads "Invalid login credentials" and thinks the site is broken.
  const passwordError = validateNewPassword(
    password,
    String(formData.get("confirm") ?? "")
  );

  if (passwordError) {
    return errorState(passwordError);
  }

  const phoneError = validatePhone(String(formData.get("phone") ?? ""));

  if (phoneError) {
    return errorState(phoneError);
  }

  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await getEmailRedirectTo(),
      // Also kept on the auth user, so the number is visible in the
      // Supabase dashboard even if the service key is missing and the
      // profile row below never gets written.
      data: { phone }
    }
  });

  if (error) {
    const { code, message } = translateAuthError(error.message);

    return errorState(message, code);
  }

  // Supabase hides the fact that an email is taken: instead of an error it
  // returns a decoy user with an empty identity list, and the password that
  // was just typed is not saved anywhere. Left unsaid, the person leaves the
  // form believing the account now has their new password.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    const { message } = translateAuthError("User already registered");

    return errorState(message, "already_registered");
  }

  if (data.user) {
    // Before the referral below, not after: a referral row points at
    // profiles(id), so until this row exists every attribution made by
    // someone who had not yet filled the questionnaire failed silently on
    // the foreign key.
    await createRegistrationProfile({
      userId: data.user.id,
      email,
      phone,
      locale: await getLocale()
    });
  }

  // Referral attribution: the ?ref=CODE the visitor arrived with was stored
  // in a cookie by the middleware. Best-effort — never blocks sign-up.
  if (data.user) {
    const cookieStore = await cookies();
    await attachReferral({
      referredProfileId: data.user.id,
      rawCode: cookieStore.get(REFERRAL_COOKIE)?.value
    });
  }

  // Confirmation switched off in Supabase: the session is already open, so
  // nothing stands between the person and the cabinet.
  if (data.session) {
    redirect(sanitizeNextPath(formData.get("next")));
  }

  // Otherwise the address has to be confirmed first. A sentence under the
  // form was not enough: people read "проверьте почту", closed the tab and
  // were never seen again. They get a page of their own now, which says
  // what to do and can open their mailbox for them.
  const pendingCookies = await cookies();

  pendingCookies.set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  redirect("/check-email");
}

// Sends the confirmation email again. Offered right under the sign-in form
// when Supabase refuses the login because the address is still unconfirmed:
// the first letter often lands in spam or never leaves the mail provider.
export async function resendConfirmationEmail(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const emailError = validateEmail(email);

  if (emailError) {
    return errorState(emailError);
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: await getEmailRedirectTo()
    }
  });

  if (error) {
    const { code, message } = translateAuthError(error.message);

    return errorState(message, code);
  }

  return {
    status: "success",
    message:
      "Письмо отправлено заново на " +
      email +
      ". Проверьте почту и папку «Спам»."
  };
}

// Sends a recovery email. The response never reveals whether the email
// exists in the system.
export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const validationError = validateEmail(email);

  if (validationError) {
    return errorState(validationError);
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`
  });

  // Deliberately ignore "user not found"-style errors: same message either
  // way, so the form can't be used to probe which emails are registered.
  if (error && /rate|limit/i.test(error.message)) {
    return errorState(
      "Слишком много запросов подряд. Подождите минуту и попробуйте ещё раз."
    );
  }

  return {
    status: "success",
    message:
      "Если такой аккаунт существует, мы отправили на этот email письмо со ссылкой для смены пароля. Проверьте почту (и папку «Спам»)."
  };
}

// Sets a new password for the recovery session established by the emailed
// link. Without a valid session the link is expired/used — the form says so.
export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const validationError = validateNewPassword(password, confirm);

  if (validationError) {
    return errorState(validationError);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState(
      "Ссылка для смены пароля недействительна или устарела. Запросите новую на странице «Забыли пароль?»."
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (/same password|different from the old/i.test(error.message)) {
      return errorState("Новый пароль совпадает со старым — придумайте другой.");
    }

    return errorState(
      "Не удалось обновить пароль. Запросите новую ссылку и попробуйте ещё раз."
    );
  }

  return {
    status: "success",
    message: "Пароль обновлён. Теперь можно перейти в кабинет."
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}
