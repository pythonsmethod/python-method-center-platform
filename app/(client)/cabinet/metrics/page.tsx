import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { MetricsPanel } from "@/components/cabinet/MetricsPanel";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getHealthMetrics } from "@/lib/metrics/queries";

export const dynamic = "force-dynamic";

// The dynamics room: the person's own numbers over time, drawn as a line.
// Nothing here is computed or invented by the platform — every point is a
// value the person entered from a real analysis.
export default async function CabinetMetricsPage() {
  const strings = getDictionary(await getLocale());
  const dict = strings.cabinet;
  const t = dict.metrics;
  const auth = await getRequiredUser("/cabinet/metrics");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const result = await getHealthMetrics();

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {result.status === "ready" ? (
        <MetricsPanel
          labels={t} dateLocale={dict.dateLocale} rows={result.rows} />
      ) : (
        <div className="cab-note">
          <strong>{t.errorTitle}</strong>
          <span>{t.errorText}</span>
        </div>
      )}
    </>
  );
}
