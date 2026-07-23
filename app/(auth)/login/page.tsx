import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { AuthForm } from "./AuthForm";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

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
  const supabaseConfigured = hasSupabaseEnv();
  const locale = await getLocale();
  const t = getDictionary(locale).login;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <AuthSetupNotice />

      <section className="auth-layout">
        <AuthForm
          labels={{
            tabLogin: t.tabLogin,
            tabSignup: t.tabSignup,
            email: t.email,
            password: t.password,
            submitLogin: t.submitLogin,
            submitSignup: t.submitSignup,
            submitting: t.submitting
          }}
          nextPath={nextPath}
          supabaseConfigured={supabaseConfigured}
        />
        <div className="panel">
          <span className="panel__label">{t.afterLabel}</span>
          <h2>{t.afterTitle}</h2>
          <p>{t.afterText}</p>
        </div>
      </section>
    </div>
  );
}
