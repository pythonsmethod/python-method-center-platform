import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";

type CabinetPageProps = {
  searchParams?: Promise<{
    onboarding?: string | string[];
  }>;
};

function isOnboardingSubmitted(value: string | string[] | undefined): boolean {
  return Array.isArray(value)
    ? value.includes("submitted")
    : value === "submitted";
}

export default async function CabinetPage({ searchParams }: CabinetPageProps) {
  const auth = await getRequiredUser("/cabinet");
  const params = await searchParams;

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Client cabinet"
          title="Cabinet"
          description="This route requires Supabase Auth before cabinet data can be shown."
        />

        <AuthSetupNotice title="Cabinet requires Supabase Auth setup" />
      </div>
    );
  }

  const caseResult = await getClientCaseShell(auth.userId);
  const submitted = isOnboardingSubmitted(params?.onboarding);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Client cabinet"
        title="Cabinet"
        description="Authenticated cabinet shell for future case status, documents, messages, and billing surfaces."
      />

      {submitted ? (
        <div className="notice notice--success">
          <span className="panel__label">Onboarding submitted</span>
          <h2>Case shell created</h2>
          <p>
            Your onboarding submission was recorded and linked to your client
            case shell.
          </p>
        </div>
      ) : null}

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Authenticated session</span>
          <h2>{auth.email ?? "Signed-in user"}</h2>
          <p>
            Supabase Auth returned a user session. Cabinet functionality is
            still reserved for future implementation.
          </p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Cabinet state</span>
          {caseResult.status === "error" ? (
            <>
              <h2>Case status unavailable</h2>
              <p>{caseResult.message}</p>
            </>
          ) : caseResult.case ? (
            <>
              <h2>{caseResult.case.status.replaceAll("_", " ")}</h2>
              <ul className="status-list">
                <li>Case ID: {caseResult.case.id}</li>
                <li>
                  Title: {caseResult.case.title ?? "Not set"}
                </li>
                <li>
                  Urgency: {caseResult.case.urgency.replaceAll("_", " ")}
                </li>
                <li>
                  Direction: {caseResult.case.direction.replaceAll("_", " ")}
                </li>
              </ul>
            </>
          ) : (
            <>
              <h2>No case yet</h2>
              <p>
                Submit onboarding to create the first client case shell.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
