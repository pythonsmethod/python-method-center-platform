import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getUploadedDocumentsForCase } from "@/lib/documents/queries";
import { DocumentUploadPanel } from "../DocumentUploadPanel";

export const dynamic = "force-dynamic";

export default async function CabinetDocumentsPage() {
  const auth = await getRequiredUser("/cabinet/documents");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Документы" title="Мои документы" />
        <AuthSetupNotice title="Раздел требует настройки Supabase Auth" />
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
        eyebrow="Документы"
        title="Мои документы"
        description="Анализы, выписки и заключения. Хранятся в закрытом хранилище — их видите только вы и команда центра."
      />

      {!clientCase ? (
        <div className="cab-note">
          <strong>Сначала анкета</strong>
          <span>
            Документы привязываются к кейсу — он появится после анкеты.{" "}
            <Link href="/onboarding">Заполнить анкету</Link>
          </span>
        </div>
      ) : documentResult?.status === "ready" ? (
        <DocumentUploadPanel
          caseId={clientCase.id}
          initialDocuments={documentResult.documents}
          userId={auth.userId}
        />
      ) : (
        <div className="cab-note">
          <strong>Документы недоступны</strong>
          <span>
            {documentResult?.status === "error"
              ? documentResult.message
              : "Попробуйте обновить страницу."}
          </span>
        </div>
      )}
    </>
  );
}
