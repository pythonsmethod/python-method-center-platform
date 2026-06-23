import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";

export default async function AdminPage() {
  const auth = await getRequiredStaffUser("/admin");

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

  if (auth.status === "forbidden") {
    notFound();
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Admin workspace"
          title="Admin"
          description="Staff access could not be evaluated."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Access check failed</span>
          <h2>Admin unavailable</h2>
          <p>{auth.message}</p>
        </div>
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
          <p>Role: {auth.role}</p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Document intake</span>
          <h2>Review uploaded documents</h2>
          <p>
            Open the read-only staff intake view for uploaded document metadata
            and lifecycle status.
          </p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/admin/documents">
              Open document intake
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
