import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { getUploadedDocumentsForCase } from "@/lib/documents/queries";
import { DocumentUploadPanel } from "../DocumentUploadPanel";

export const dynamic = "force-dynamic";

export default async function CabinetDocumentsPage() {
  const strings = getDictionary(await getLocale());
  const dict = strings.cabinet;
  const t = dict.documents;
  const auth = await getRequiredUser("/cabinet/documents");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
      </div>
    );
  }

  const caseResult = await getClientCaseShell(auth.userId);
  const clientCase =
    caseResult.status === "ready" && caseResult.case ? caseResult.case : null;
  const documentResult = clientCase
    ? await getUploadedDocumentsForCase(auth.userId, clientCase.id)
    : null;

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {!clientCase ? (
        <div className="cab-note">
          <strong>{t.needCaseTitle}</strong>
          <span>
            {t.needCaseText}{" "}
            <Link href="/onboarding">{t.needCaseCta}</Link>
          </span>
        </div>
      ) : documentResult?.status === "ready" ? (
        <>
          <DocumentUploadPanel
              labels={t}
            caseId={clientCase.id}
            initialDocuments={documentResult.documents}
            userId={auth.userId}
          />

          {documentResult.documents.length > 0 ? (
            <section
              aria-label={t.timelineAria}
              className="documents-section"
            >
              <div className="panel">
                <span className="panel__label">{t.timelineLabel}</span>
                <h2>{t.timelineTitle}</h2>
                <p>
                  {t.timelineText}
                </p>
                <DocumentTimeline
                  labels={dict.timeline}
                  documents={documentResult.documents}
                  emptyText={t.timelineEmpty}
                />
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="cab-note">
          <strong>{t.errorTitle}</strong>
          <span>
            {documentResult?.status === "error"
              ? documentResult.message
              : t.errorRetry}
          </span>
        </div>
      )}
    </>
  );
}
