import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredUser } from "@/lib/auth/require-user";
import type { OnboardingProfileDefaults } from "@/lib/onboarding/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

async function getProfileDefaults(
  userId: string
): Promise<OnboardingProfileDefaults> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { fullName: "", phone: "" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  return {
    fullName: String(data?.full_name ?? ""),
    phone: String(data?.phone ?? "")
  };
}

export default async function OnboardingPage() {
  const auth = await getRequiredUser("/onboarding");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Анкета"
          title="Анкета"
          description="Для заполнения анкеты требуется настроенная аутентификация."
        />

        <AuthSetupNotice title="Анкета требует настройки Supabase Auth" />
      </div>
    );
  }

  const profileDefaults = await getProfileDefaults(auth.userId);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Анкета"
        title="Расскажите о вашей ситуации"
        description="Анкета создаёт ваш кейс: команда изучит её и свяжется с вами по дальнейшим шагам."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Ваш аккаунт</span>
          <h2>{auth.email ?? "Вы вошли в систему"}</h2>
          <p>
            Анкета сохраняется в вашем кейсе вместе с согласиями. После
            отправки вы сможете загрузить медицинские документы в кабинете.
          </p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Что важно знать</span>
          <h2>Анкета — не медицинская консультация</h2>
          <p>
            На основе анкеты не ставится диагноз и не назначается лечение. Она
            нужна, чтобы Карен и команда поняли вашу ситуацию и цели.
          </p>
        </div>
      </section>

      <EmergencyNotice />

      <section className="form-section" aria-label="Анкета">
        <OnboardingForm profileDefaults={profileDefaults} />
      </section>
    </div>
  );
}
