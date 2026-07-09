"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthActionState } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    return errorState("Сервис временно недоступен: не настроено подключение к базе данных.");
  }

  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return errorState("Введите email и пароль.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return errorState(error.message);
  }

  redirect(sanitizeNextPath(formData.get("next")));
}

export async function signUpWithPassword(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState("Сервис временно недоступен: не настроено подключение к базе данных.");
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

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}
