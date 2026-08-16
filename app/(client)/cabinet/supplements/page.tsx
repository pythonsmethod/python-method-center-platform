import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { SupplementsPanel } from "@/components/cabinet/SupplementsPanel";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getSupplementsWithToday } from "@/lib/supplements/queries";
import { SupplementAiImport } from "@/components/cabinet/SupplementAiImport";

export const dynamic = "force-dynamic";

// The supplement tracker: the person lists what THEY decided to take and
// when; the cabinet turns it into a daily checklist with a gentle nudge.
// The AI comments only on timing — never on what or how much.
export default async function CabinetSupplementsPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const dict = strings.cabinet;
  const t = dict.supplements;
  const auth = await getRequiredUser("/cabinet/supplements");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const now = new Date();
  const serverToday = now.toISOString().slice(0, 10);
  const serverNow = now.toISOString().slice(11, 16);
  const result = await getSupplementsWithToday(serverToday);

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {result.status === "ready" ? (
        <>
          <SupplementAiImport locale={locale} />
          <SupplementsPanel labels={t} intakes={result.intakes} serverNow={serverNow} serverToday={serverToday} supplements={result.supplements} />
        </>
      ) : (
        <div className="cab-note">
          <strong>{t.errorTitle}</strong>
          <span>{t.errorText}</span>
        </div>
      )}
    </>
  );
}
