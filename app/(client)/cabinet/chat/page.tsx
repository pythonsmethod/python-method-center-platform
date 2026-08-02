import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { PageHeader } from "@/components/PageHeader";
import { SavedAssistantThread } from "@/components/assistant/SavedAssistantThread";
import { getOwnAssistantHistory } from "@/lib/assistant/history";
import { getRequiredUser } from "@/lib/auth/require-user";
import { formatDateTime } from "@/lib/i18n/format";
import { supportStatusLabel } from "@/lib/i18n/status-labels";
import { getOwnSupportRequests } from "@/lib/support/queries";
import { SupportRequestForm } from "../SupportRequestForm";

export const dynamic = "force-dynamic";

// Everything that is not the conversation with Professor Python: questions
// about payment and access, and whatever the person already asked the AI.
// His own thread is the home page of the cabinet.
export default async function CabinetChatPage() {
  const auth = await getRequiredUser("/cabinet/chat");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Связь с центром" title="Поддержка" />
        <AuthSetupNotice title="Раздел требует настройки Supabase Auth" />
      </div>
    );
  }

  const [supportResult, assistantResult] = await Promise.all([
    getOwnSupportRequests(auth.userId),
    getOwnAssistantHistory(auth.userId)
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Связь с центром"
        title="Поддержка и ИИ-помощник"
        description="Вопросы про оплату, доступ и сайт — и вся ваша переписка с помощником."
      />

      <div className="cab-note">
        <strong>Про ваш кейс — на главной</strong>
        <span>
          Переписка с Professor Python открывается сразу при входе.{" "}
          <Link href="/cabinet">Открыть переписку</Link>
        </span>
      </div>

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
