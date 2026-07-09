import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getStaffCaseDetail } from "@/lib/cases/staff-queries";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel,
  documentStatusLabel
} from "@/lib/i18n/status-labels";

type StaffCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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

  const submissions = [...clientCase.onboarding_submissions].sort((a, b) =>
    (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "")
  );
  const documents = [...clientCase.uploaded_documents].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

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

      <div className="panel-actions">
        <Link className="button button--secondary" href="/admin/cases">
          ← Ко всем кейсам
        </Link>
      </div>
    </div>
  );
}
