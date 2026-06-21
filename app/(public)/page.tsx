import { RouteCard } from "@/components/RouteCard";
import { appRoutes } from "@/lib/routes";

export default function HomePage() {
  return (
    <div className="page-shell">
      <section className="page-header">
        <p className="eyebrow">P0-001 scaffold</p>
        <h1>Runnable web platform foundation</h1>
        <p>
          This is the first executable shell for the Python Method web-first
          platform. It contains routing and placeholders only; medical logic,
          AI decisions, Stripe, and Supabase schema are intentionally not
          implemented yet.
        </p>
      </section>

      <section className="route-grid" aria-label="Available scaffold routes">
        {appRoutes.map((route) => (
          <RouteCard key={route.href} route={route} />
        ))}
      </section>
    </div>
  );
}
