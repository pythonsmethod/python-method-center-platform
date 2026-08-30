import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WelcomeScreen } from "./WelcomeScreen";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return {
    title: locale === "ru" ? "Добро пожаловать" : "Welcome"
  };
}

export default async function WelcomePage() {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      redirect(
        profile?.role === "admin" || profile?.role === "support"
          ? "/admin"
          : "/cabinet"
      );
    }
  }

  const t = getDictionary(locale).login;
  const labels = locale === "ru"
    ? {
        eyebrow: "Ваш ИИ-проводник",
        greeting: "Здравствуйте! Я Анхам.",
        text: "Я помогу вам пройти путь восстановления, сопровождая вас на каждом шаге.",
        auth: "Войти или создать аккаунт",
        note: "Реабилитация без границ",
        close: "Закрыть",
        forgot: t.forgot
      }
    : {
        eyebrow: "Your AI guide",
        greeting: "Hello! I am Anham.",
        text: "I will help you through your recovery journey, supporting you every step of the way.",
        auth: "Sign in or create account",
        note: "Rehabilitation Without Borders",
        close: "Close",
        forgot: t.forgot
      };

  const authLabels = {
    tabLogin: t.tabLogin,
    tabSignup: t.tabSignup,
    email: t.email,
    phone: t.phone,
    phonePlaceholder: t.phonePlaceholder,
    phoneHint: t.phoneHint,
    password: t.password,
    passwordConfirm: t.passwordConfirm,
    showPassword: t.showPassword,
    submitLogin: t.submitLogin,
    submitSignup: t.submitSignup,
    submitting: t.submitting,
    resend: t.resend,
    resending: t.resending,
    formAria: locale === "ru"
      ? "Форма входа и регистрации"
      : "Sign in and registration form",
    modeAria: locale === "ru"
      ? "Режим авторизации"
      : "Authentication mode",
    rememberMe: locale === "ru" ? "Запомнить меня" : "Remember me"
  };

  return (
    <WelcomeScreen
      authLabels={authLabels}
      labels={labels}
      locale={locale}
      supabaseConfigured={hasSupabaseEnv()}
    />
  );
}
