import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredUser } from "@/lib/auth/require-user";

export default async function AdminPage() {
  const auth = await getRequiredUser("/admin");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Admin workspace"
          title="Admin"
          description="This route requires Supabase Auth before admin access can be evaluated."
        />

        <AuthSetupNotice title="Admin requires Supabase Auth setup" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Admin workspace"
        title="Admin"
        description="Authenticated admin shell for future governance, access, audit, and operational views."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Authenticated session</span>
          <h2>{auth.email ?? "Signed-in user"}</h2>
          <p>
            Admin role claims and production authorization checks are not
            implemented in this foundation task.
          </p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Boundaries</span>
          <h2>No decision logic</h2>
          <p>
            This page does not approve knowledge, change case state, or expose
            protected data. It only reserves the route for future implementation.
          </p>
        </div>
      </section>
    </div>
  );
}
