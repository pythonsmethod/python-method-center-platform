import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
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
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const t = strings.onboarding;

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.setupTitle}
          description={t.setupDescription}
        />

        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const profileDefaults = await getProfileDefaults(auth.userId);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">{t.accountLabel}</span>
          <h2>{auth.email ?? t.signedIn}</h2>
          <p>{t.accountText}</p>
          <div className="panel-actions">
            <LogoutButton label={strings.cabinet.logout} />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{t.noticeLabel}</span>
          <h2>{t.noticeTitle}</h2>
          <p>{t.noticeText}</p>
        </div>
      </section>

      <EmergencyNotice text={strings.support.emergencyText} />

      <section className="form-section" aria-label={t.formLabel}>
        <OnboardingForm labels={t} profileDefaults={profileDefaults} />
      </section>
    </div>
  );
}
