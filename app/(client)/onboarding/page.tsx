import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredUser } from "@/lib/auth/require-user";
import type { OnboardingProfileDefaults } from "@/lib/onboarding/types";
import { buildOnboardingDefaults, savedDeliveryDefaults } from "@/lib/onboarding/defaults";
import { DELIVERY_PROFILE_COLUMNS, type DeliveryProfile } from "@/lib/delivery/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

const ONBOARDING_PROFILE_COLUMNS = `full_name, phone, country_code, ${DELIVERY_PROFILE_COLUMNS}`;

async function getProfileDefaults(
  userId: string
): Promise<{ form: OnboardingProfileDefaults; delivery: Partial<DeliveryProfile> }> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      form: buildOnboardingDefaults(null, null),
      delivery: {}
    };
  }

  const [{ data: submission }, { data: profile }] = await Promise.all([
    supabase.from("onboarding_submissions").select("payload").eq("profile_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select(ONBOARDING_PROFILE_COLUMNS).eq("id", userId).maybeSingle()
  ]);

  return {
    form: buildOnboardingDefaults(profile, submission?.payload),
    delivery: savedDeliveryDefaults(profile, submission?.payload)
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

  const defaults = await getProfileDefaults(auth.userId);

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

      <section className="form-section" aria-label={t.formLabel}>
        <OnboardingForm deliveryDefaults={defaults.delivery} labels={t} locale={locale} profileDefaults={defaults.form} />
      </section>
    </div>
  );
}
