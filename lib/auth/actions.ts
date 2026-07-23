"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthActionState } from "@/lib/auth/types";
import {
  validateNewPassword,
  validateRecoveryEmail
} from "@/lib/auth/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";

function errorState(message: string): AuthActionState {
  return { status: "error", message };
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
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
    return errorState(error.message);
  }

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

  if (password.length < 6) {
    return errorState("Пароль должен быть не короче 6 символов.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await getEmailRedirectTo()
    }
  });

  if (error) {
    return errorState(error.message);
  }

  if (data.session) {
    redirect(sanitizeNextPath(formData.get("next")));
  }

  return {
    status: "success",
    message: "Заявка на регистрацию отправлена. Если включено подтверждение, проверьте почту."
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

  const email = String(formData.get("email") ?? "").trim();
  const validationError = validateRecoveryEmail(email);

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
