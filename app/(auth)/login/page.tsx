import { PageHeader } from "@/components/PageHeader";

export default function LoginPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Authentication"
        title="Login"
        description="Authentication UI placeholder. Supabase Auth is not connected in this task."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Current scope</span>
          <h2>Route shell only</h2>
          <p>
            The page exists so the application can route to the future login
            experience without adding account or session logic yet.
          </p>
        </div>
      </section>
    </div>
  );
}
