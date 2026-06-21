import { PageHeader } from "@/components/PageHeader";

export default function OnboardingPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Client intake"
        title="Onboarding"
        description="Onboarding route placeholder for future client information and document collection."
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Not implemented</span>
          <h2>No case data is collected</h2>
          <p>
            This scaffold deliberately avoids intake forms, document upload, and
            case assembly until Supabase schema and access rules are implemented.
          </p>
        </div>
      </section>
    </div>
  );
}
