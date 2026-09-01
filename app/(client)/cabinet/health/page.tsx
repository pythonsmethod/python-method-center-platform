import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { HealthQuestionnaireForm } from "@/components/cabinet/HealthQuestionnaireForm";
import { HealthQuestionnaireHistory } from "@/components/cabinet/HealthQuestionnaireHistory";
import { getRequiredUser } from "@/lib/auth/require-user";
import { questionnaireCopy } from "@/lib/health/copy";
import { getQuestionnaire } from "@/lib/health/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

// The health questionnaire: the person's own account of themselves, kept
// beside their analyses because neither half means much alone.
//
// One screen for filling it in and for correcting it later, and the history
// underneath. Nothing on this page is interpreted — it is what the person
// said, in their words, with the date they said it.
export default async function CabinetHealthPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const t = questionnaireCopy[locale];
  const auth = await getRequiredUser("/cabinet/health");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AuthSetupNotice title={t.title} labels={strings.setup} />
      </div>
    );
  }

  const result = await getQuestionnaire();

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.intro} />

      {result.status === "ready" ? (
        <>
          <p className="hq__lead">{t.note}</p>

          <section aria-label={t.title} className="hq">
            <HealthQuestionnaireForm copy={t} current={result.current} />
          </section>

          <section aria-labelledby="hq-history-title" className="hq hq--history">
            <h2 id="hq-history-title">{t.versionsTitle}</h2>
            <p className="hq__note">{t.versionsIntro}</p>
            <HealthQuestionnaireHistory
              copy={t}
              history={result.history}
              locale={locale}
            />
          </section>
        </>
      ) : (
        <p className="form-message form-message--error" role="alert">
          {t.unavailable}
        </p>
      )}
    </>
  );
}
