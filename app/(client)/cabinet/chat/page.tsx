import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { PageHeader } from "@/components/PageHeader";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import { SavedAssistantThread } from "@/components/assistant/SavedAssistantThread";
import { getOwnAssistantHistory } from "@/lib/assistant/history";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { formatDateTime } from "@/lib/i18n/format";
import { supportStatusLabel } from "@/lib/i18n/status-labels";
import { getCaseMessages } from "@/lib/messages/queries";
import { getOwnSupportRequests } from "@/lib/support/queries";
import { SupportRequestForm } from "../SupportRequestForm";

export const dynamic = "force-dynamic";

export default async function CabinetChatPage() {
  const auth = await getRequiredUser("/cabinet/chat");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Связь с центром" title="Переписка" />
        <AuthSetupNotice title="Раздел требует настройки Supabase Auth" />
      </div>
    );
  }

  const [caseResult, supportResult, assistantResult] = await Promise.all([
    getClientCaseShell(auth.userId),
    getOwnSupportRequests(auth.userId),
    getOwnAssistantHistory(auth.userId)
  ]);
  const clientCase =
    caseResult.status === "ready" && caseResult.case ? caseResult.case : null;
  const messagesResult = clientCase
    ? await getCaseMessages(clientCase.id)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Связь с центром"
        title="Переписка"
        description="Здесь вы общаетесь с Professor Python и командой — текстом или голосом."
      />

      {clientCase && messagesResult ? (
        <section className="documents-section" aria-label="Переписка по кейсу">
          <div className="panel">
            <span className="panel__label">Чат по вашему кейсу</span>
            <h2>Professor Python и команда</h2>
            <CaseMessageThread
              loadError={messagesResult.error}
              messages={messagesResult.messages}
              viewer="client"
            />
          </div>
        </section>
      ) : (
        <div className="cab-note">
          <strong>Чат откроется вместе с кейсом</strong>
          <span>Заполните анкету — и переписка станет доступна.</span>
        </div>
      )}

      <section className="documents-section" aria-label="Переписка с ИИ-помощником">
        <div className="panel">
          <span className="panel__label">ИИ-помощник</span>
          <h2>Ваша переписка с помощником</h2>
          <p>
            Всё, что вы спрашивали у помощника, сохраняется здесь — можно
            перечитать и не задавать один и тот же вопрос дважды. Переписка
            видна вам и команде центра.
          </p>
          <SavedAssistantThread
            emptyText="Вы ещё не общались с помощником. Откройте окно чата в правом нижнем углу — переписка сохранится здесь."
            loadError={
              assistantResult.status === "error"
                ? assistantResult.message
                : null
            }
            messages={
              assistantResult.status === "ready" ? assistantResult.messages : []
            }
            viewer="client"
          />
        </div>
      </section>

      <section className="documents-section" aria-label="Обращения в поддержку">
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">Другой вопрос</span>
              <h2>Написать в поддержку</h2>
              <p>
                Технические вопросы, оплата, доступ — всё, что не про ваш кейс.
              </p>
            </div>
            <SupportRequestForm />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">Ваши обращения</span>
              <h2>История обращений</h2>
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
    </>
  );
}
