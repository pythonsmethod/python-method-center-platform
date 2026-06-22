import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredUser } from "@/lib/auth/require-user";

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

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Client intake"
        title="Onboarding"
        description="Authenticated onboarding shell for future client information and document collection."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Authenticated session</span>
          <h2>{auth.email ?? "Signed-in user"}</h2>
          <p>
            Supabase Auth returned a user session. Intake forms and document
            upload are not implemented yet.
          </p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Not implemented</span>
          <h2>No case data is collected</h2>
          <p>
            This scaffold deliberately avoids intake forms, document upload,
            and case assembly in this task.
          </p>
        </div>
      </section>
    </div>
  );
}
