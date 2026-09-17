import Link from "next/link";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { getRequiredUser } from "@/lib/auth/require-user";
import { formatDateTime } from "@/lib/i18n/format";
import { getOwnSupportRequests } from "@/lib/support/queries";
import { SupportRequestForm } from "../SupportRequestForm";
import { SupportRequestThread } from "@/components/support/SupportRequestThread";

export const dynamic = "force-dynamic";

// A separate human-support channel. Anham and Professor Python each have
// their own cabinet destination so authorship is never ambiguous.
export default async function CabinetChatPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
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

  const supportResult = await getOwnSupportRequests(auth.userId);

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
                      <span>{formatDateTime(request.created_at, locale)}</span>
                    </div>
                    <SupportRequestThread
                      labels={t.supportThread}
                      locale={locale}
                      messages={request.messages}
                      requestId={request.id}
                      viewer="client"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
