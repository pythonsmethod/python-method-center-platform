import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
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
          eyebrow="Client intake"
          title="Onboarding"
          description="This route requires Supabase Auth before intake can begin."
        />

        <AuthSetupNotice title="Onboarding requires Supabase Auth setup" />
      </div>
    );
  }

  const profileDefaults = await getProfileDefaults(auth.userId);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Client intake"
        title="Onboarding"
        description="Create the first case shell by submitting basic onboarding information."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Authenticated session</span>
          <h2>{auth.email ?? "Signed-in user"}</h2>
          <p>
            Supabase Auth returned a user session. This onboarding step creates
            profile, case, submission, and consent records only.
          </p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Scope boundary</span>
          <h2>No document or decision logic</h2>
          <p>
            Document upload, medical decisions, AI decisions, and payment steps
            remain outside this task.
          </p>
        </div>
      </section>

      <section className="form-section" aria-label="Onboarding form">
        <OnboardingForm profileDefaults={profileDefaults} />
      </section>
    </div>
  );
}
