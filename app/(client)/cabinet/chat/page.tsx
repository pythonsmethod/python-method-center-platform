import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
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
  const strings = getDictionary(await getLocale());
  const dict = strings.cabinet;
  const t = dict.chat;
  const auth = await getRequiredUser("/cabinet/chat");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AuthSetupNotice title={t.setupNotice} labels={strings.setup} />
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
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className="cab-note">
        <strong>{t.caseNoticeTitle}</strong>
        <span>
          {t.caseNoticeText}{" "}
          <Link href="/cabinet">{t.caseNoticeCta}</Link>
        </span>
      </div>

      <section className="documents-section" aria-label={t.assistantAria}>
        <div className="panel">
          <span className="panel__label">{t.assistantLabel}</span>
          <h2>{t.assistantTitle}</h2>
          <p>
            {t.assistantText}
          </p>
          <SavedAssistantThread
            emptyText={t.assistantEmpty}
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

      <section className="documents-section" aria-label={t.requestsAria}>
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">{t.requestLabel}</span>
              <h2>{t.requestTitle}</h2>
              <p>
                {t.requestText}
              </p>
            </div>
            <SupportRequestForm labels={dict.supportForm} />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">{t.requestsLabel}</span>
              <h2>{t.requestsTitle}</h2>
            </div>

            {supportResult.status === "error" ? (
              <p className="empty-state">{supportResult.message}</p>
            ) : supportResult.requests.length === 0 ? (
              <p className="empty-state">
                {t.requestsEmpty}
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

      <EmergencyNotice text={strings.support.emergencyText} />
    </>
  );
}
