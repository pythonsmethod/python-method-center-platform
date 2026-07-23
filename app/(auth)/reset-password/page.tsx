import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

// Reached from the emailed recovery link via /auth/callback: by the time the
// user is here, the recovery session is already established. Without a
// session the link was expired or already used.
export default async function ResetPasswordPage() {
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
        eyebrow="Доступ к аккаунту"
        title="Новый пароль"
        description="Задайте новый пароль для вашего аккаунта."
      />

      <section className="auth-layout">
        <div className="auth-panel">
          {hasSession ? (
            <ResetPasswordForm />
          ) : (
            <div className="auth-form">
              <p className="form-message form-message--error">
                Ссылка для смены пароля недействительна или устарела. Ссылку из
                письма можно открыть только один раз.
              </p>
              <Link className="button" href="/recovery">
                Запросить новую ссылку
              </Link>
            </div>
          )}
        </div>
        <div className="panel">
          <span className="panel__label">Безопасность</span>
          <h2>После смены пароля</h2>
          <p>
            Вы останетесь в аккаунте на этом устройстве и сможете сразу перейти
            в кабинет. Если пароль меняли не вы — напишите нам через{" "}
            <Link href="/support">страницу поддержки</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
