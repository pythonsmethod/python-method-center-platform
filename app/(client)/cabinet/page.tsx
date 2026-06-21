import { PageHeader } from "@/components/PageHeader";

export default function CabinetPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Client cabinet"
        title="Cabinet"
        description="Client cabinet placeholder for future case status, documents, messages, and billing surfaces."
      />

      <section className="panel-grid">
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
