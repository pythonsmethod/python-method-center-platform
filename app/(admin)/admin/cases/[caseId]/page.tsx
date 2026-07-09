import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { recordCasePayment, updateCaseState } from "@/lib/cases/staff-actions";
import { getStaffCaseDetail } from "@/lib/cases/staff-queries";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel,
  documentStatusLabel,
  lifecycleEventLabel,
  paymentProductLabel,
  paymentStatusLabel
} from "@/lib/i18n/status-labels";

type StaffCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
  searchParams?: Promise<{
    notice?: string | string[];
    error?: string | string[];
  }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const caseStatusOptions = [
  "created",
  "awaiting_onboarding",
  "ready_for_review",
  "in_review",
  "active_support",
  "inactive_support",
  "completed",
  "archived"
];

const caseUrgencyOptions = ["normal", "elevated", "critical"];

const caseDirectionOptions = [
  "not_set",
  "recovery",
  "rehabilitation",
  "preservation"
];

const paymentProductOptions = [
  "preliminary_assessment",
  "support_5_weeks",
  "support_15_weeks"
];

const noticeMessages: Record<string, string> = {
  "case-updated": "Кейс обновлён.",
  "payment-recorded": "Оплата зафиксирована."
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

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

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
    return formatDate(text);
  }

  return text;
}

export default async function StaffCaseDetailPage({
  params,
  searchParams
}: StaffCasePageProps) {
  const { caseId } = await params;
  const query = await searchParams;
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

  if (!uuidPattern.test(caseId)) {
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

  const noticeKey = firstParam(query?.notice);
  const noticeMessage = noticeKey ? noticeMessages[noticeKey] ?? null : null;
  const errorMessage = firstParam(query?.error);

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

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Рабочее место команды"
        title={clientCase.title ?? "Кейс без названия"}
        description={`Кейс ${clientCase.id}`}
      />

      {noticeMessage ? (
        <div className="notice notice--success">
          <span className="panel__label">Готово</span>
          <h2>{noticeMessage}</h2>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notice notice--warning">
          <span className="panel__label">Ошибка</span>
          <h2>Действие не выполнено</h2>
          <p>{errorMessage}</p>
        </div>
      ) : null}

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
            <li>Создан: {formatDate(clientCase.created_at)}</li>
            <li>Обновлён: {formatDate(clientCase.updated_at)}</li>
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
          <form action={updateCaseState} className="onboarding-form">
            <input name="caseId" type="hidden" value={clientCase.id} />
            <label className="field">
              <span>Статус</span>
              <select defaultValue={clientCase.status} name="status">
                {caseStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {caseStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Срочность</span>
              <select defaultValue={clientCase.urgency} name="urgency">
                {caseUrgencyOptions.map((urgency) => (
                  <option key={urgency} value={urgency}>
                    {caseUrgencyLabel(urgency)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Направление</span>
              <select defaultValue={clientCase.direction} name="direction">
                {caseDirectionOptions.map((direction) => (
                  <option key={direction} value={direction}>
                    {caseDirectionLabel(direction)}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">
              Сохранить изменения
            </button>
          </form>
        </div>

        <div className="panel">
          <span className="panel__label">Оплаты</span>
          <h2>Записать оплату</h2>
          <form action={recordCasePayment} className="onboarding-form">
            <input name="caseId" type="hidden" value={clientCase.id} />
            <label className="field">
              <span>Продукт</span>
              <select defaultValue="support_5_weeks" name="product">
                {paymentProductOptions.map((product) => (
                  <option key={product} value={product}>
                    {paymentProductLabel(product)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Сумма</span>
              <input
                inputMode="decimal"
                name="amount"
                placeholder="Например: 490"
                required
                type="text"
              />
            </label>
            <label className="field">
              <span>Валюта</span>
              <input
                defaultValue="USD"
                maxLength={3}
                name="currency"
                required
                type="text"
              />
            </label>
            <label className="field">
              <span>Референс платежа (Stripe ID, № счёта)</span>
              <input name="processorReference" type="text" />
            </label>
            <button className="button" type="submit">
              Записать оплату
            </button>
          </form>
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
                    ? ` (${formatDate(payment.paid_at)})`
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
                  ? formatDate(submission.submitted_at)
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
                    <span>{formatDate(document.created_at)}</span>
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
                  {formatDate(event.created_at)} —{" "}
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

      <div className="panel-actions">
        <Link className="button button--secondary" href="/admin/cases">
          ← Ко всем кейсам
        </Link>
      </div>
    </div>
  );
}
