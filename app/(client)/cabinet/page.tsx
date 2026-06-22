import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredUser } from "@/lib/auth/require-user";

export default async function CabinetPage() {
  const auth = await getRequiredUser("/cabinet");

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

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Client cabinet"
        title="Cabinet"
        description="Authenticated cabinet shell for future case status, documents, messages, and billing surfaces."
      />

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
          <h2>Scaffold only</h2>
          <ul className="status-list">
            <li>Case lifecycle is not persisted.</li>
            <li>Document upload is not connected.</li>
            <li>Messages are not implemented.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
