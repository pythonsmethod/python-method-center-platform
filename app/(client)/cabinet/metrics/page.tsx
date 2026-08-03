import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { MetricsPanel } from "@/components/cabinet/MetricsPanel";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getHealthMetrics } from "@/lib/metrics/queries";

export const dynamic = "force-dynamic";

// The dynamics room: the person's own numbers over time, drawn as a line.
// Nothing here is computed or invented by the platform — every point is a
// value the person entered from a real analysis.
export default async function CabinetMetricsPage() {
  const auth = await getRequiredUser("/cabinet/metrics");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Динамика" title="Динамика показателей" />
        <AuthSetupNotice title="Раздел требует настройки Supabase Auth" />
      </div>
    );
  }

  const result = await getHealthMetrics();

  return (
    <>
      <PageHeader
        eyebrow="Динамика"
        title="Динамика показателей"
        description="Внесите показатель из свежего анализа — и сравните с тем, что было полгода назад. График строится только из ваших настоящих цифр."
      />

      {result.status === "ready" ? (
        <MetricsPanel rows={result.rows} />
      ) : (
        <div className="cab-note">
          <strong>Раздел временно недоступен</strong>
          <span>Попробуйте обновить страницу чуть позже.</span>
        </div>
      )}
    </>
  );
}
