import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { SleepPanel } from "@/components/cabinet/SleepPanel";
import { listGuidance } from "@/lib/assistant/knowledge";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getSleepEntries } from "@/lib/sleep/queries";

export const dynamic = "force-dynamic";

// The sleep tracker, next to the supplement checklist: the person writes
// down their own nights — or brings them over from a watch, a ring or a
// bracelet — and the cabinet turns them into a picture. The assistant reads
// that picture and nothing else; the guidance card is Professor Python's
// own words, not a generated text.
export default async function CabinetSleepPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const dict = strings.cabinet;
  const t = dict.sleep;
  const auth = await getRequiredUser("/cabinet/sleep");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const [result, guidance] = await Promise.all([
    getSleepEntries(),
    listGuidance("sleep")
  ]);

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {result.status === "ready" ? (
        <SleepPanel
          dateLocale={dict.dateLocale}
          entries={result.entries}
          guidance={guidance}
          labels={t}
          locale={locale}
          serverToday={new Date().toISOString().slice(0, 10)}
        />
      ) : (
        <div className="cab-note">
          <strong>{t.errorTitle}</strong>
          <span>{t.errorText}</span>
        </div>
      )}
    </>
  );
}
