import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getStaffCaseDetail } from "@/lib/cases/staff-queries";
import { formatDateTime } from "@/lib/i18n/format";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel,
  documentStatusLabel,
  lifecycleEventLabel,
  paymentProductLabel,
  paymentStatusLabel
} from "@/lib/i18n/status-labels";
import { isUuid } from "@/lib/utils/uuid";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import { getCaseMessages } from "@/lib/messages/queries";
import { CaseManagementForm } from "./CaseManagementForm";
import { PaymentRecordForm } from "./PaymentRecordForm";

type StaffCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

const payloadFieldLabels: Record<string, string> = {
  full_name: "Полное имя",
  phone: "Телефон",
  care_recipient_type: "Для кого запрос",
  primary_goal: "Основная цель",
  situation_description: "Описание ситуации",
  offer_accepted: "Оферта принята",
  offer_version: "Версия оферты",
  consent_accepted: "Согласие на обработку данных",
  submitted_at: "Отправлена"
};

const careRecipientLabels: Record<string, string> = {
  self: "Для себя",
  family_member: "Для члена семьи"
};

function formatAmount(amountCents: number, currency: string): string {
  return `${(amountCents / 100).toFixed(2)} ${currency}`;
}

function formatPayloadValue(key: string, value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }

  const text = String(value ?? "—");

  if (key === "care_recipient_type") {
    return careRecipientLabels[text] ?? text;
  }

  if (key === "submitted_at" && text !== "—") {
    return formatDateTime(text);
  }

  return text;
}

export default async function StaffCaseDetailPage({
  params
}: StaffCasePageProps) {
  const { caseId } = await params;
  const auth = await getRequiredStaffUser(`/admin/cases/${caseId}`);

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Кейс"
          description="Для доступа требуется настроенная аутентификация."
        />

        <AuthSetupNotice title="Кейс требует настройки Supabase Auth" />
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
          eyebrow="Рабочее место команды"
          title="Кейс"
          description="Не удалось проверить доступ."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Ошибка доступа</span>
          <h2>Кейс недоступен</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  if (!isUuid(caseId)) {
    notFound();
  }

  const detailResult = await getStaffCaseDetail(caseId);

  if (detailResult.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Рабочее место команды"
          title="Кейс"
          description="Не удалось загрузить кейс."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Кейс недоступен</span>
          <h2>Ошибка загрузки</h2>
          <p>{detailResult.message}</p>
        </div>
      </div>
    );
  }

  const clientCase = detailResult.case;

  if (!clientCase) {
    notFound();
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
  const events = [...clientCase.case_lifecycle_events].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  const caseMessages = await getCaseMessages(clientCase.id);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Рабочее место команды"
        title={clientCase.title ?? "Кейс без названия"}
        description={`Кейс ${clientCase.id}`}
      />

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">Клиент</span>
          <h2>{clientCase.profiles?.full_name ?? "Без имени"}</h2>
          <ul className="status-list">
            <li>Email: {clientCase.profiles?.email ?? "—"}</li>
            <li>Телефон: {clientCase.profiles?.phone ?? "—"}</li>
          </ul>
        </div>
        <div className="panel">
          <span className="panel__label">Кейс</span>
          <h2>{caseStatusLabel(clientCase.status)}</h2>
          <ul className="status-list">
            <li>Срочность: {caseUrgencyLabel(clientCase.urgency)}</li>
            <li>Направление: {caseDirectionLabel(clientCase.direction)}</li>
            <li>Создан: {formatDateTime(clientCase.created_at)}</li>
            <li>Обновлён: {formatDateTime(clientCase.updated_at)}</li>
          </ul>
        </div>
        <div className="panel">
          <span className="panel__label">Описание ситуации</span>
          <h2>Из анкеты</h2>
          <p>{clientCase.summary ?? "Описание не заполнено."}</p>
        </div>
      </section>

      <section className="panel-grid" aria-label="Управление кейсом">
        <div className="panel">
          <span className="panel__label">Управление</span>
          <h2>Обновить кейс</h2>
          <CaseManagementForm
            caseId={clientCase.id}
            direction={clientCase.direction}
            status={clientCase.status}
            urgency={clientCase.urgency}
          />
        </div>

        <div className="panel">
          <span className="panel__label">Оплаты</span>
          <h2>Записать оплату</h2>
          <PaymentRecordForm caseId={clientCase.id} />
          {payments.length === 0 ? (
            <p className="empty-state">Оплат пока нет.</p>
          ) : (
            <ul className="status-list">
              {payments.map((payment) => (
                <li key={payment.id}>
                  {paymentProductLabel(payment.product)} —{" "}
                  {formatAmount(payment.amount_cents, payment.currency)} —{" "}
                  {paymentStatusLabel(payment.status)}
                  {payment.paid_at
                    ? ` (${formatDateTime(payment.paid_at)})`
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

      <section className="panel-grid" aria-label="Анкеты онбординга">
        {submissions.length === 0 ? (
          <div className="panel">
            <span className="panel__label">Анкета</span>
            <h2>Анкета не отправлена</h2>
            <p>Клиент ещё не заполнил анкету онбординга.</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <div className="panel" key={submission.id}>
              <span className="panel__label">
                Анкета от{" "}
                {submission.submitted_at
                  ? formatDateTime(submission.submitted_at)
                  : "—"}
              </span>
              <h2>Ответы клиента</h2>
              <ul className="status-list">
                {Object.entries(submission.payload).map(([key, value]) => (
                  <li key={key}>
                    <strong>{payloadFieldLabels[key] ?? key}:</strong>{" "}
                    {formatPayloadValue(key, value)}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="intake-section" aria-label="Документы кейса">
        <div className="panel">
          <span className="panel__label">Документы</span>
          <h2>Загруженные документы</h2>
          {documents.length === 0 ? (
            <p className="empty-state">Документы ещё не загружены.</p>
          ) : (
            <ul className="document-list">
              {documents.map((document) => (
                <li className="document-list__item" key={document.id}>
                  <div>
                    <strong>
                      {document.original_filename ?? "Документ без названия"}
                    </strong>
                    <span>{formatDateTime(document.created_at)}</span>
                    <span className="status-badge">
                      {documentStatusLabel(document.document_status)}
                    </span>
                  </div>
                  <div className="panel-actions">
                    <Link
                      className="button button--secondary button--compact"
                      href={`/admin/documents/${document.id}/view`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Открыть файл
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="intake-section" aria-label="История кейса">
        <div className="panel">
          <span className="panel__label">История</span>
          <h2>История кейса</h2>
          {events.length === 0 ? (
            <p className="empty-state">Событий пока нет.</p>
          ) : (
            <ul className="status-list">
              {events.map((event) => (
                <li key={event.id}>
                  {formatDateTime(event.created_at)} —{" "}
                  {lifecycleEventLabel(event.event_type)}
                  {event.from_status && event.to_status
                    ? `: ${caseStatusLabel(event.from_status)} → ${caseStatusLabel(event.to_status)}`
                    : event.to_status
                      ? `: ${caseStatusLabel(event.to_status)}`
                      : ""}
                  {event.notes ? ` · ${event.notes}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="intake-section" aria-label="Чат с клиентом">
        <div className="panel">
          <span className="panel__label">Чат с клиентом</span>
          <h2>Переписка по кейсу</h2>
          <p>
            Клиент видит эти сообщения в своём кабинете. Можно писать текстом
            или записывать голосовые.
          </p>
          <CaseMessageThread
            caseId={clientCase.id}
            expandable
            loadError={caseMessages.error}
            messages={caseMessages.messages}
            viewer="staff"
          />
        </div>
      </section>

      <section className="intake-section" aria-label="ИИ-Ассистент по кейсу">
        <div className="panel">
          <span className="panel__label">ИИ-Ассистент Карена</span>
          <h2>Помощник по этому кейсу</h2>
          <p>
            Ассистент видит снимок кейса из базы: анкету, список документов,
            оплаты и историю. Содержимое файлов ему недоступно — при
            необходимости вставьте текст документа в чат.
          </p>
          <AssistantChat
            caseId={clientCase.id}
            endpoint="/api/assistant/staff"
            intro="Я вижу данные этого кейса: анкету, статусы, список документов, оплаты и историю. Спросите — сделаю выжимку, черновик ответа клиенту или предложу следующие шаги. Решения — за Кареном."
            placeholder="Например: сделай выжимку кейса…"
            providerChoice
            suggestions={[
              "Сделай выжимку кейса",
              "Что не хватает в этом кейсе?",
              "Составь черновик ответа клиенту"
            ]}
          />
        </div>
      </section>

      <div className="panel-actions">
        <Link className="button button--secondary" href="/admin/cases">
          ← Ко всем кейсам
        </Link>
      </div>
    </div>
  );
}
