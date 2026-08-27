import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).resetPassword;

  return { title: t.title, description: t.description };
}

// Reached from the emailed recovery link via /auth/callback: by the time the
// user is here, the recovery session is already established. Without a
// session the link was expired or already used.
export default async function ResetPasswordPage() {
  const t = getDictionary(await getLocale()).resetPassword;
  const supabase = await createSupabaseServerClient();
  let hasSession = false;

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    hasSession = Boolean(user);
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <section className="auth-layout">
        <div className="auth-panel">
          {hasSession ? (
            <ResetPasswordForm labels={t} />
          ) : (
            <div className="auth-form">
              <p className="form-message form-message--error">
                {t.expired}
              </p>
              <Link className="button" href="/recovery">
                {t.requestNew}
              </Link>
            </div>
          )}
        </div>
        <div className="panel">
          <span className="panel__label">{t.securityLabel}</span>
          <h2>{t.securityTitle}</h2>
          <p>
            {t.securityTextPrefix}
            <Link href="/support">{t.supportLink}</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
