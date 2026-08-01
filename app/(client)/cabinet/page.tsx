import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getUploadedDocumentsForCase } from "@/lib/documents/queries";
import { formatDateTime } from "@/lib/i18n/format";
import { supportStatusLabel } from "@/lib/i18n/status-labels";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import { getCaseMessages } from "@/lib/messages/queries";
import { getOwnSupportRequests } from "@/lib/support/queries";
import { AccountBadge, TokenBadge } from "@/components/referrals/TokenBadge";
import { getTokenLedger } from "@/lib/tokens/queries";
import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { SupportRequestForm } from "./SupportRequestForm";

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

export default async function CabinetPage({ searchParams }: CabinetPageProps) {
  const auth = await getRequiredUser("/cabinet");
  const params = await searchParams;

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Личный кабинет"
          title="Кабинет"
          description="Для кабинета требуется настроенная аутентификация."
        />

        <AuthSetupNotice title="Кабинет требует настройки Supabase Auth" />
      </div>
    );
  }

  const [caseResult, supportResult, tokens] = await Promise.all([
    getClientCaseShell(auth.userId),
    getOwnSupportRequests(auth.userId),
    getTokenLedger(auth.userId)
  ]);
  const submitted = isOnboardingSubmitted(params?.onboarding);
  const [documentResult, messagesResult] =
    caseResult.status === "ready" && caseResult.case
      ? await Promise.all([
          getUploadedDocumentsForCase(auth.userId, caseResult.case.id),
          getCaseMessages(caseResult.case.id)
        ])
      : [null, null];

  return (
    <div className="page-shell">
      <div className="cabinet-head">
        <PageHeader eyebrow="Личный кабинет" title="Кабинет" />
        <div className="cabinet-head__badges">
          <AccountBadge />
          <TokenBadge balance={tokens.balance} />
        </div>
      </div>

      {submitted ? (
        <div className="notice notice--success">
          <span className="panel__label">Анкета отправлена</span>
          <h2>Кейс создан</h2>
          <p>
            Анкета сохранена и привязана к вашему кейсу. Загрузите медицинские
            документы ниже — команда изучит кейс и свяжется с вами.
          </p>
        </div>
      ) : null}

      {caseResult.status === "ready" && caseResult.case ? (
        documentResult?.status === "ready" ? (
          <DocumentUploadPanel
            caseId={caseResult.case.id}
            initialDocuments={documentResult.documents}
            userId={auth.userId}
          />
        ) : (
          <div className="notice notice--warning">
            <span className="panel__label">Документы</span>
            <h2>Документы недоступны</h2>
            <p>
              {documentResult?.status === "error"
                ? documentResult.message
                : "Для загрузки документов нужен активный кейс."}
            </p>
          </div>
        )
      ) : null}

      {caseResult.status === "ready" && caseResult.case && messagesResult ? (
        <section className="documents-section" aria-label="Чат с Professor Python и командой">
          <div className="panel">
            <span className="panel__label">Чат с Professor Python и командой</span>
            <h2>Ваша переписка</h2>
            <p>
              Здесь вы общаетесь с Professor Python и командой центра — текстом или
              голосовыми сообщениями.
            </p>
            <CaseMessageThread
              loadError={messagesResult.error}
              messages={messagesResult.messages}
              viewer="client"
            />
          </div>
        </section>
      ) : null}

      <section className="documents-section" aria-label="Связь с командой">
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">Связь с командой</span>
              <h2>Написать команде</h2>
            </div>
            <SupportRequestForm />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">Ваши обращения</span>
              <h2>История сообщений</h2>
            </div>

            {supportResult.status === "error" ? (
              <p className="empty-state">{supportResult.message}</p>
            ) : supportResult.requests.length === 0 ? (
              <p className="empty-state">
                Обращений пока нет. Напишите нам, если есть вопрос.
              </p>
            ) : (
              <ul className="document-list">
                {supportResult.requests.map((request) => (
                  <li className="document-list__item" key={request.id}>
                    <div>
                      <strong>{request.subject}</strong>
                      <span>{formatDateTime(request.created_at)}</span>
                      <span className="status-badge">
                        {supportStatusLabel(request.status)}
                      </span>
                    </div>
                    {request.body ? <p>{request.body}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <EmergencyNotice />
    </div>
  );
}
