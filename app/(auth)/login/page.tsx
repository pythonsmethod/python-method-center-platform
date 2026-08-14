import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { SocialSignIn } from "@/components/auth/SocialSignIn";
import { enabledSocialProviders } from "@/lib/auth/providers";
import { AuthForm } from "./AuthForm";

import Link from "next/link";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    message?: string | string[];
    mode?: string | string[];
  }>;
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
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const t = strings.login;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <AuthSetupNotice
        labels={strings.setup}
        title={strings.setup.loginTitle}
      />

      {readParam(params?.message) === "link-invalid" ? (
        <p className="form-message form-message--error">{t.linkInvalid}</p>
      ) : null}

      {/* No side panel: what used to stand in it is said once, in the page
          header above. The tab is the form and nothing else. */}
      <section className="auth-layout auth-layout--single">
        <div>
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
              noAccount: t.noAccount,
              enrollNow: t.enrollNow
            }}
            initialMode={initialMode}
            nextPath={nextPath}
            supabaseConfigured={supabaseConfigured}
          >
            <SocialSignIn
              labels={{
                divider: t.socialDivider,
                google: t.socialGoogle,
                apple: t.socialApple,
                hint: t.socialHint
              }}
              nextPath={nextPath}
              providers={enabledSocialProviders()}
            />
          </AuthForm>
          <p className="auth-help">
            <Link href="/recovery">{t.forgot}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
