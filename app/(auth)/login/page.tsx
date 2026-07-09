import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
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

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Вход"
        title="Вход и регистрация"
        description="Войдите в аккаунт или создайте новый, используя email и пароль."
      />

      <AuthSetupNotice />

      <section className="auth-layout">
        <AuthForm
          nextPath={nextPath}
          supabaseConfigured={supabaseConfigured}
        />
        <div className="panel">
          <span className="panel__label">Что дальше</span>
          <h2>После входа</h2>
          <p>
            Вы попадёте в личный кабинет, где можно заполнить анкету, создать
            кейс, загрузить медицинские документы и написать команде.
          </p>
        </div>
      </section>
    </div>
  );
}
