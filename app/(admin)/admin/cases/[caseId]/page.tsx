import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { canSeeProviderNames } from "@/lib/auth/require-founder";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getStaffCaseDetail } from "@/lib/cases/staff-queries";
import { formatDateTime } from "@/lib/i18n/format";
import { paymentProductLabel, paymentStatusLabel } from "@/lib/i18n/status-labels";
import { isUuid } from "@/lib/utils/uuid";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import { CaseConversationWorkspace } from "@/components/cases/CaseConversationWorkspace";
import { CaseReviewPanel } from "@/components/cases/CaseReviewPanel";
import { getCaseReview } from "@/lib/cases/review-queries";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { SavedAssistantThread } from "@/components/assistant/SavedAssistantThread";
import { getAssistantHistoryForCase } from "@/lib/assistant/history";
import { getCaseMessages } from "@/lib/messages/queries";
import { caseActivityEntries } from "@/lib/cases/activity";
import { caseDetailCopy, type CaseDetailCopy } from "@/lib/cases/detail-copy";
import { ReprocessCaseDocumentsForm } from "./ReprocessCaseDocumentsForm";
import { IdentityReviewForm } from "./IdentityReviewForm";
import { canAccessProfessorMessages, resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { CaseAnalyticalPicturePanel } from "@/components/cases/CaseAnalyticalPicturePanel";
import { getCaseAnalyticalPicture } from "@/lib/analytical-picture";

type StaffCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
  searchParams: Promise<{
    view?: string;
  }>;
};

function formatAmount(amountCents: number, currency: string): string {
  return `${(amountCents / 100).toFixed(2)} ${currency}`;
}

function formatPayloadValue(
  key: string,
  value: unknown,
  copy: CaseDetailCopy,
  locale: "ru" | "en"
): string {
  if (typeof value === "boolean") {
    return value ? copy.yes : copy.no;
  }

  const text = String(value ?? copy.dash);

  if (key === "care_recipient_type") {
    return copy.careRecipients[text] ?? text;
  }

  if (key === "submitted_at" && text !== copy.dash) {
    return formatDateTime(text, locale);
  }

  return text;
}

export default async function StaffCaseDetailPage({
  params,
  searchParams
}: StaffCasePageProps) {
  const { caseId } = await params;
  const requestedTodayView = (await searchParams).view === "today";
  const auth = await getRequiredStaffUser(`/admin/cases/${caseId}`);
  const locale = await getLocale();
  const copy = caseDetailCopy(locale);

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.setupDescription}
        />

        <AuthSetupNotice title={copy.setupTitle} />
      </div>
    );
  }

  if (auth.status === "forbidden") {
    notFound();
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.accessErrorDescription}
        />

        <div className="notice notice--warning">
          <span className="panel__label">{copy.accessErrorTitle}</span>
          <h2>{copy.accessErrorHeading}</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  if (!isUuid(caseId)) {
    notFound();
  }

  // Only the founder sees which model answers; for the team it is simply
  // the assistant.
  const showProviders = canSeeProviderNames(auth.email);
  // Automatic payment history is a developer/founder control. It stays out of
  // Karen's clinical workspace so his attention remains on the client,
  // documents and conversation. This intentionally fails closed when the
  // founder allowlist is not configured.
  //
  // Case status, urgency and direction are not here and must not return: the
  // client processing classification is retired, and the case detail shows
  // what happened rather than what the case was once labelled.
  const showAdminControls = auth.role === "admin" && canSeeProviderNames(auth.email);
  const canReadProfessorConversation = canAccessProfessorMessages(auth.email);
  const focusedTodayView = requestedTodayView && canReadProfessorConversation;
  const detailResult = await getStaffCaseDetail(caseId);

  if (detailResult.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.loadErrorDescription}
        />

        <div className="notice notice--warning">
          <span className="panel__label">{copy.loadErrorLabel}</span>
          <h2>{copy.loadErrorHeading}</h2>
          <p>{detailResult.message}</p>
        </div>
      </div>
    );
  }

  const clientCase = detailResult.case;

  if (!clientCase) {
    notFound();
  }

  const dictionary = getDictionary(locale);

  if (focusedTodayView) {
    const caseMessages = await getCaseMessages(clientCase.id);
    const workspaceCopy = locale === "ru"
      ? {
          eyebrow: "Работа с клиентом",
          fallbackName: "Клиент",
          conversationLabel: "Личные сообщения",
          conversationTitle: "Диалог с клиентом",
          conversationHint: "Здесь находится вся переписка по кейсу. Новые сообщения можно отправить текстом или голосом.",
          assistantLabel: "ИИ-помощник по кейсу",
          assistantTitle: "Спросить по этому клиенту",
          assistantHint: "Помощник знает анкету, документы, распознанные анализы, историю и переписку этого кейса. Он поможет разобрать общую картину или подготовить ответ клиенту.",
          assistantIntro: "Я вижу весь доступный контекст этого кейса. Спросите меня об анализах, состоянии систем организма, истории клиента или попросите подготовить короткий ответ для личного сообщения.",
          assistantPlaceholder: "Вопрос по этому кейсу...",
          suggestions: [
            "Что сейчас происходит с организмом?",
            "Подготовь ответ клиенту",
            "На что обратить внимание в анализах?"
          ],
          useReply: "Вставить в ответ клиенту",
          replyUsed: "Перенесено в ответ",
          reviewBeforeSending: "Ответ Анхама перенесён ниже. Проверьте текст, при необходимости отредактируйте и только затем отправьте клиенту."
        }
      : {
          eyebrow: "Client workspace",
          fallbackName: "Client",
          conversationLabel: "Private messages",
          conversationTitle: "Client conversation",
          conversationHint: "This is the complete case conversation. New messages can be sent as text or voice.",
          assistantLabel: "Case AI assistant",
          assistantTitle: "Ask about this client",
          assistantHint: "The assistant knows this case's questionnaire, documents, recognized test results, history, and conversation. It can review the overall picture or prepare a client reply.",
          assistantIntro: "I can see all available context for this case. Ask about test results, the state of body systems, the client's history, or request a concise private-message reply.",
          assistantPlaceholder: "Ask about this case...",
          suggestions: [
            "What is happening in the body now?",
            "Prepare a client reply",
            "What needs attention in the test results?"
          ],
          useReply: "Insert into client reply",
          replyUsed: "Added to reply",
          reviewBeforeSending: "Anham's answer is in the field below. Review and edit it before sending it to the client."
        };
    const clientName = clientCase.profiles?.full_name
      ?? clientCase.profiles?.email
      ?? workspaceCopy.fallbackName;

    return (
      <div className="page-shell karen-case-workspace">
        <PageHeader
          eyebrow={workspaceCopy.eyebrow}
          title={clientName}
          description={clientCase.title ?? ""}
        />

        <CaseConversationWorkspace
          caseId={clientCase.id}
          copy={workspaceCopy}
          dateLocale={dictionary.cabinet.dateLocale}
          labels={dictionary.cabinet.thread}
          loadError={caseMessages.error}
          locale={locale}
          messages={caseMessages.messages}
          providerChoice={showProviders}
          voiceLabels={dictionary.cabinet.voice}
        />
      </div>
    );
  }

  const submissions = [...clientCase.onboarding_submissions].sort((a, b) =>
    (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "")
  );
  const documents = [...clientCase.uploaded_documents].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  const payments = [...clientCase.payments].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  // Classification transitions stay in audit storage and are not presented
  // here as current facts. See lib/cases/activity.ts.
  const activity = caseActivityEntries(clientCase.case_lifecycle_events, locale);
  const [caseMessages, assistantHistory, review, casePicture] = await Promise.all([
    canReadProfessorConversation
      ? getCaseMessages(clientCase.id)
      : Promise.resolve({ messages: [], error: null }),
    getAssistantHistoryForCase(clientCase.profile_id, locale),
    getCaseReview(clientCase.id, documents, locale),
    getCaseAnalyticalPicture(clientCase.id)
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={clientCase.title ?? copy.untitledCase}
        description={`${copy.caseIdPrefix} ${clientCase.id}`}
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">{copy.clientLabel}</span>
          <h2>{clientCase.profiles?.full_name ?? copy.clientUnnamed}</h2>
          <ul className="status-list">
            <li>{copy.email}: {clientCase.profiles?.email ?? copy.dash}</li>
            <li>{copy.phone}: {clientCase.profiles?.phone ?? copy.dash}</li>
            <li>{copy.deliveryEmail}: {clientCase.profiles?.delivery_email ?? copy.dash}</li>
            <li>{copy.deliveryPhone}: {clientCase.profiles?.delivery_phone ?? copy.dash}</li>
            <li>{copy.recipient}: {[clientCase.profiles?.delivery_first_name, clientCase.profiles?.delivery_last_name].filter(Boolean).join(" ") || copy.dash}</li>
            <li>{copy.deliveryAddress}: {[clientCase.profiles?.delivery_postal_code, clientCase.profiles?.delivery_country_code, clientCase.profiles?.delivery_region, clientCase.profiles?.delivery_city, clientCase.profiles?.delivery_street, clientCase.profiles?.delivery_building, clientCase.profiles?.delivery_unit].filter(Boolean).join(", ") || copy.dash}</li>
            {clientCase.profiles?.delivery_instructions ? <li>{copy.deliveryExtra}: {clientCase.profiles.delivery_instructions}</li> : null}
          </ul>
        </div>
        <div className="panel">
          <span className="panel__label">{copy.situationLabel}</span>
          <h2>{copy.situationHeading}</h2>
          <p>{clientCase.summary ?? copy.situationEmpty}</p>
        </div>
      </section>

      {canReadProfessorConversation ? <section
        className="intake-section"
        id="case-conversation"
        aria-label={copy.conversationAria}
      >
        <div className="panel">
          <span className="panel__label">{copy.conversationLabel}</span>
          <h2>{copy.conversationHeading}</h2>
          <p>{copy.conversationHint}</p>
          <CaseMessageThread
            labels={dictionary.cabinet.thread}
            voiceLabels={dictionary.cabinet.voice}
            dateLocale={dictionary.cabinet.dateLocale}
            caseId={clientCase.id}
            expandable
            loadError={caseMessages.error}
            messages={caseMessages.messages}
            viewer="staff"
          />
        </div>
      </section> : null}

      {showAdminControls ? (
        <section className="panel-grid" aria-label={copy.paymentsAria}>
          <div className="panel">
            <span className="panel__label">{copy.paymentsLabel}</span>
            <h2>{copy.paymentsTitle}</h2>
            <p>{copy.paymentsDescription}</p>
            {payments.length === 0 ? (
              <p className="empty-state">{copy.paymentsEmpty}</p>
            ) : (
              <ul className="status-list">
                {payments.map((payment) => (
                  <li key={payment.id}>
                    {paymentProductLabel(payment.product, locale)} —{" "}
                    {formatAmount(payment.amount_cents, payment.currency)} —{" "}
                    {paymentStatusLabel(payment.status, locale)}
                    {payment.paid_at
                      ? ` (${formatDateTime(payment.paid_at, locale)})`
                      : ""}
                    {payment.processor_reference
                      ? ` · ${payment.processor_reference}`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {/* The assistant's reading of the analyses in this case, waiting when
          he opens it rather than made on demand. Above the file list, so
          the reading and the files it came from sit together. */}
      <section className="intake-section">
        <CaseAnalyticalPicturePanel
          canConfirm={resolvePrivateAssistantRole(auth.email) === "karen"}
          caseId={clientCase.id}
          locale={locale}
          result={casePicture}
        />
      </section>

      <section className="intake-section" aria-label={copy.reviewAria}>
        <div className="panel">
          <CaseReviewPanel
            caseId={clientCase.id}
            documentsCount={documents.length}
            documentStatuses={documents.map((document) => document.document_status)}
            review={review}
            locale={locale}
            approvalBlocked={casePicture.status === "ready" && casePicture.picture.reviewSummary.approvalBlocked}
          />
        </div>
      </section>

      <section className="intake-section" aria-label={copy.documentsAria}>
        <div className="panel">
          <span className="panel__label">{copy.documentsLabel}</span>
          <h2>{copy.documentsHeading}</h2>
          <p>{copy.documentsHint}</p>
          {showAdminControls || canReadProfessorConversation ? (
            <>
              <IdentityReviewForm
                caseId={clientCase.id}
                documents={documents
                  .filter((document) =>
                    document.document_status === "identity_mismatch" &&
                    document.identity_review_status !== "confirmed_belongs_to_case"
                  )
                  .map((document) => ({
                    id: document.id,
                    filename: document.original_filename ?? copy.documentFallbackName
                  }))}
                locale={locale}
              />
              <ReprocessCaseDocumentsForm
                caseId={clientCase.id}
                queuedDocumentCount={documents.filter(
                  (document) => document.document_status === "queued"
                ).length}
                locale={locale}
              />
            </>
          ) : null}
          <DocumentTimeline
            labels={dictionary.cabinet.timeline}
            documents={documents}
            emptyText={copy.documentsEmpty}
            renderAction={(document) => (
              <Link
                className="button button--secondary button--compact"
                href={`/admin/documents/${document.id}/view`}
                rel="noreferrer"
                target="_blank"
              >
                {copy.openFile}
              </Link>
            )}
          />
        </div>
      </section>

      <section className="intake-section" aria-label={copy.activityAria}>
        <div className="panel">
          <span className="panel__label">{copy.activityLabel}</span>
          <h2>{copy.activityHeading}</h2>
          <p>{copy.activityHint}</p>
          {activity.length === 0 ? (
            <p className="empty-state">{copy.activityEmpty}</p>
          ) : (
            <ul className="status-list">
              {activity.map((entry) => (
                <li key={entry.id}>
                  {formatDateTime(entry.createdAt, locale)} — {entry.label}
                  {entry.notes ? ` · ${entry.notes}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
        className="intake-section"
        aria-label={copy.clientAssistantAria}
      >
        <div className="panel">
          <span className="panel__label">{copy.clientAssistantLabel}</span>
          <h2>{copy.clientAssistantHeading}</h2>
          <p>{copy.clientAssistantHint}</p>
          <SavedAssistantThread
            emptyText={copy.clientAssistantEmpty}
            locale={locale}
            loadError={
              assistantHistory.status === "error"
                ? assistantHistory.message
                : null
            }
            messages={
              assistantHistory.status === "ready"
                ? assistantHistory.messages
                : []
            }
            viewer="staff"
          />
        </div>
      </section>

      <section className="intake-section" aria-label={copy.assistantAria}>
        <div className="panel">
          <span className="panel__label">{copy.assistantLabel}</span>
          <h2 className="staff-assistant__title">
            <AnhamAvatar className="staff-assistant__face" size={44} state="client" />
            {copy.assistantHeading}
          </h2>
          <p>{copy.assistantHint}</p>
          <AssistantChat
            attachments
            caseId={clientCase.id}
            endpoint="/api/assistant/staff"
            locale={locale}
            intro={copy.assistantIntro}
            placeholder={copy.assistantPlaceholder}
            providerChoice={showProviders}
            suggestions={copy.assistantSuggestions}
          />
        </div>
      </section>

      <section className="panel-grid" aria-label={copy.submissionsAria}>
        {submissions.length === 0 ? (
          <div className="panel">
            <span className="panel__label">{copy.submissionLabel}</span>
            <h2>{copy.submissionMissingHeading}</h2>
            <p>{copy.submissionMissingText}</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <div className="panel" key={submission.id}>
              <span className="panel__label">
                {copy.submissionFrom}{" "}
                {submission.submitted_at
                  ? formatDateTime(submission.submitted_at, locale)
                  : copy.dash}
              </span>
              <h2>{copy.submissionHeading}</h2>
              <ul className="status-list">
                {Object.entries(submission.payload).map(([key, value]) => (
                  <li key={key}>
                    <strong>{copy.payloadFields[key] ?? key}:</strong>{" "}
                    {formatPayloadValue(key, value, copy, locale)}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <div className="panel-actions">
        <Link className="button button--secondary" href="/admin/cases">
          {copy.backToCases}
        </Link>
      </div>
    </div>
  );
}
