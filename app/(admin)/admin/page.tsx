import { PageHeader } from "@/components/PageHeader";

export default function AdminPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Admin workspace"
        title="Admin"
        description="Admin route placeholder for future governance, access, audit, and operational views."
      />

      <section className="panel-grid">
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
