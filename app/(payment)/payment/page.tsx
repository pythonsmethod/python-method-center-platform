import { PageHeader } from "@/components/PageHeader";

export default function PaymentPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Payment entry"
        title="Payment"
        description="Payment route placeholder. Stripe checkout and webhooks are intentionally out of scope for P0-001."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Payment status</span>
          <h2>Provider not connected</h2>
          <p>
            The platform stores no card data and performs no payment operation
            in this scaffold.
          </p>
        </div>
      </section>
    </div>
  );
}
