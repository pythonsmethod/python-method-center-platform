import type { Metadata } from "next";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { IconAnkh } from "@/components/icons/EgyptianIcons";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { AuthForm } from "./AuthForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import Link from "next/link";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    message?: string | string[];
    mode?: string | string[];
  }>;
};

// Query parameters only choose the post-login destination or the visible
// form tab. They never create a distinct document for search engines.
export const metadata: Metadata = {
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false }
};

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeNextPath(value: string | string[] | undefined): string {
  const nextPath = Array.isArray(value) ? value[0] : value;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/cabinet";
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next);
  const initialMode = readParam(params?.mode) === "signup" ? "signup" : "login";
  const supabaseConfigured = hasSupabaseEnv();
  if (supabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (data.user) {
      redirect(nextPath);
    }
  }
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const t = strings.login;
  const anhamHelp = locale === "ru"
    ? "Анхам рядом и поможет, если появится вопрос."
    : "Anham is nearby if you have a question.";
  const privacyNote = locale === "ru"
    ? "Ваши данные защищены и доступны только команде центра."
    : "Your information is protected and visible only to the center team.";

  return (
    <div className="auth-app">
      <aside className="auth-app__story">
        <Link className="auth-app__brand" href="/">
          <IconAnkh />
          <span>Python Method Center</span>
        </Link>
        <div className="auth-app__story-copy">
          <span className="auth-app__eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.description}</p>
          <div className="auth-app__guide">
            <AnhamAvatar
              size={82}
              state="guest"
              title={locale === "ru" ? "Анхам" : "Anham"}
            />
            <span>{anhamHelp}</span>
          </div>
        </div>
      </aside>

      <main className="auth-app__main">
        <section className="auth-app__card" aria-label={t.title}>
          <div className="auth-app__mobile-brand" aria-hidden="true">
            <IconAnkh />
            <strong>Python Method Center</strong>
          </div>
          <p className="auth-app__welcome">{t.eyebrow}</p>
          <h2>{t.title}</h2>

          <AuthSetupNotice
            labels={strings.setup}
            title={strings.setup.loginTitle}
          />

          {readParam(params?.message) === "link-invalid" ? (
            <p className="form-message form-message--error">{t.linkInvalid}</p>
          ) : null}

          <AuthForm
            labels={{
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
            }}
            initialMode={initialMode}
            nextPath={nextPath}
            supabaseConfigured={supabaseConfigured}
          />
          <p className="auth-help">
            <Link href="/recovery">{t.forgot}</Link>
          </p>
          <p className="auth-app__privacy">
            {privacyNote}
          </p>
        </section>
      </main>
    </div>
  );
}
