import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getUploadedDocumentsForCase } from "@/lib/documents/queries";
import { getCaseMessages } from "@/lib/messages/queries";
import { getSupplementsDueCount } from "@/lib/supplements/queries";

export const dynamic = "force-dynamic";

type CabinetPageProps = {
  searchParams?: Promise<{
    onboarding?: string | string[];
  }>;
};

function isOnboardingSubmitted(value: string | string[] | undefined): boolean {
  return Array.isArray(value)
    ? value.includes("submitted")
    : value === "submitted";
}

// The home page of the cabinet is the conversation with Professor Python,
// because that is what a person comes here to do. Everything else — the
// case, the payments, the documents — lives one tap away in the column on
// the left and does not compete with it.
export default async function CabinetPage({ searchParams }: CabinetPageProps) {
  const strings = getDictionary(await getLocale());
  const dict = strings.cabinet;
  const t = dict.home;
  const auth = await getRequiredUser("/cabinet");
  const params = await searchParams;

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          description={t.setupDescription}
        />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const caseResult = await getClientCaseShell(auth.userId);
  const clientCase =
    caseResult.status === "ready" && caseResult.case ? caseResult.case : null;

  const supplementsDue = await getSupplementsDueCount();

  const [documentResult, messagesResult] = clientCase
    ? await Promise.all([
        getUploadedDocumentsForCase(auth.userId, clientCase.id),
        getCaseMessages(clientCase.id)
      ])
    : [null, null];

  const documents =
    documentResult?.status === "ready" ? documentResult.documents : [];

  if (!clientCase) {
    return (
      <div className="cab-start">
        <span className="cab-card__label">{t.firstStepLabel}</span>
        <h2>{t.firstStepTitle}</h2>
        <p>
          {t.firstStepText}
        </p>
        <Link className="button" href="/onboarding">
          {t.firstStepCta}
        </Link>
      </div>
    );
  }

  return (
    <>
      {isOnboardingSubmitted(params?.onboarding) ? (
        <div className="cab-note">
          <strong>{t.submittedTitle}</strong>
          <span>{t.submittedText}</span>
        </div>
      ) : null}

      {supplementsDue > 0 ? (
        <div className="cab-note cab-note--reminder">
          <strong>{t.doseTitle}</strong>
          <span>
            {t.dosePrefix} {supplementsDue}.{" "}
            <Link href="/cabinet/supplements">{t.doseCta}</Link>
          </span>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <div className="cab-note">
          <strong>{t.uploadTitle}</strong>
          <span>
            {t.uploadText}{" "}
            <Link href="/cabinet/documents">{t.uploadCta}</Link>
          </span>
        </div>
      ) : null}

      <section className="cab-thread" aria-label={t.threadAria}>
        <div className="cab-thread__head">
          <span className="panel__label">{t.threadLabel}</span>
          <h1>{t.threadTitle}</h1>
        </div>
        <CaseMessageThread
            labels={dict.thread}
            voiceLabels={dict.voice}
          caseId={clientCase.id}
          expandable
          loadError={messagesResult?.error ?? null}
          messages={messagesResult?.messages ?? []}
          viewer="client"
        />
      </section>
    </>
  );
}
