import { PageHeader } from "@/components/PageHeader";

export default function SupportPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Support workspace"
        title="Support"
        description="Support route placeholder for future technical, account, and payment-support workflows."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Escalation status</span>
          <h2>No runtime flow yet</h2>
          <p>
            Red-flag and escalation routing remain architecture-only until the
            backend, audit log, and role access model are implemented.
          </p>
        </div>
      </section>
    </div>
  );
}
