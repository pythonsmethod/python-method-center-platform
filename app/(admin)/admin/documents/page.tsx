import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { formatDateTime } from "@/lib/i18n/format";
import {
  getStaffDocumentIntakeItems,
  type StaffDocumentIntakeItem
} from "@/lib/documents/staff-queries";
import { getLocale, type Locale } from "@/lib/i18n/locale";
function shortId(value: string): string {
  return value.slice(0, 8);
}

function documentCopy(locale: Locale) {
  return locale === "ru"
    ? {
        eyebrow: "Материалы клиентов",
        title: "Документы",
        description: "Загруженные файлы, их состояние и доступ к оригиналам.",
        setupTitle: "Раздел документов пока недоступен",
        setupMessage: "Доступ к документам ещё не настроен. Обратитесь в техническую поддержку.",
        accessFailed: "Не удалось проверить доступ",
        accessMessage: "Не удалось подтвердить рабочий доступ. Попробуйте обновить страницу. Если ошибка повторится, обратитесь в техническую поддержку.",
        session: "Рабочий доступ",
        staff: "Сотрудник центра",
        role: "Роль",
        roles: { support: "Поддержка", admin: "Администратор" },
        logout: "Выйти",
        scope: "Работа с документами",
        readOnly: "Просмотр оригиналов",
        scopeDescription: "Здесь можно просмотреть загруженные документы. Открытие файла не меняет результат разбора или решения по кейсу.",
        unavailable: "Документы недоступны",
        loadFailed: "Не удалось загрузить список документов",
        loadMessage: "Попробуйте обновить страницу. Если ошибка повторится, обратитесь в техническую поддержку. Повторно загружать файлы не нужно.",
        section: "Загруженные документы",
        unknownStatus: "Состояние не определено",
        document: "Документ",
        client: "Клиент",
        case: "Кейс",
        filename: "Файл",
        status: "Статус",
        uploaded: "Загружен",
        open: "Открыть документ",
        unnamed: "Без имени",
        untitled: "Документ без названия",
        empty: "Загруженных документов пока нет.",
        statuses: {
          uploaded: "Загружен",
          queued: "В очереди",
          ready: "Обработан",
          processing: "Обрабатывается",
          identity_mismatch: "Нужно проверить принадлежность документа",
          failed: "Ошибка обработки",
          accepted: "Принят",
          needs_reupload: "Нужна повторная загрузка",
          archived: "В архиве"
        }
      }
    : {
        eyebrow: "Client materials",
        title: "Documents",
        description: "Uploaded files, their status and access to originals.",
        setupTitle: "Documents are currently unavailable",
        setupMessage: "Document access has not been configured yet. Contact technical support.",
        accessFailed: "Unable to check access",
        accessMessage: "We could not confirm staff access. Try refreshing the page. If the error persists, contact technical support.",
        session: "Staff access",
        staff: "Center staff member",
        role: "Role",
        roles: { support: "Support", admin: "Administrator" },
        logout: "Sign out",
        scope: "Working with documents",
        readOnly: "View originals",
        scopeDescription: "You can view uploaded documents here. Opening a file does not change its analysis or any Case decision.",
        unavailable: "Documents unavailable",
        loadFailed: "Unable to load the document list",
        loadMessage: "Try refreshing the page. If the error persists, contact technical support. You do not need to upload the files again.",
        section: "Uploaded documents",
        unknownStatus: "Status unknown",
        document: "Document",
        client: "Client",
        case: "Case",
        filename: "File",
        status: "Status",
        uploaded: "Uploaded",
        open: "Open document",
        unnamed: "Unnamed client",
        untitled: "Untitled document",
        empty: "There are no uploaded documents yet.",
        statuses: {
          uploaded: "Uploaded",
          queued: "Queued",
          ready: "Processed",
          processing: "Processing",
          identity_mismatch: "Document ownership needs review",
          failed: "Processing failed",
          accepted: "Accepted",
          needs_reupload: "Re-upload needed",
          archived: "Archived"
        }
      };
}

function statusText(locale: Locale, value: string): string {
  const labels: Record<string, string> = documentCopy(locale).statuses;
  return labels[value] ?? documentCopy(locale).unknownStatus;
}

function DocumentTable({ documents, locale }: { documents: StaffDocumentIntakeItem[]; locale: Locale }) {
  const copy = documentCopy(locale);
  if (documents.length === 0) {
    return <p className="empty-state staff-document-desktop">{copy.empty}</p>;
  }

  return (
    <div className="table-wrap staff-document-desktop">
      <table className="data-table">
        <thead>
          <tr>
            <th>{copy.document}</th>
            <th>{copy.client}</th>
            <th>{copy.case}</th>
            <th>{copy.filename}</th>
            <th>{copy.status}</th>
            <th>{copy.uploaded}</th>
            <th>{copy.open}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>
                <code title={document.id}>{shortId(document.id)}</code>
              </td>
              <td>
                {document.profiles?.full_name ?? document.profiles?.email ?? copy.unnamed}
              </td>
              <td>
                <code title={document.case_id}>{shortId(document.case_id)}</code>
              </td>
              <td>{document.original_filename ?? copy.untitled}</td>
              <td>
                <span
                  className={`status-badge status-badge--${document.document_status}`}
                >
                  {statusText(locale, document.document_status)}
                </span>
              </td>
              <td>{formatDateTime(document.created_at, locale)}</td>
              <td>
                <Link
                  className="button button--secondary button--compact"
                  href={`/admin/documents/${document.id}/view`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {copy.open}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentCards({ documents, locale }: { documents: StaffDocumentIntakeItem[]; locale: Locale }) {
  const copy = documentCopy(locale);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  if (documents.length === 0) {
    return <p className="empty-state staff-document-mobile">{copy.empty}</p>;
  }

  return (
    <div className="staff-document-mobile staff-document-list">
      {documents.map((document) => {
        const clientName = document.profiles?.full_name ?? document.profiles?.email ?? copy.unnamed;
        return (
          <Link
            className="staff-document-card"
            href={`/admin/documents/${document.id}/view`}
            key={document.id}
            rel="noreferrer"
            target="_blank"
          >
            <span className="staff-document-card__icon" aria-hidden="true">▤</span>
            <span className="staff-document-card__body">
              <strong>{clientName}</strong>
              <span className="staff-document-card__case">
                {copy.case} {shortId(document.case_id)}
                {document.client_cases?.title ? ` · ${document.client_cases.title}` : ""}
              </span>
              <span className="staff-document-card__filename">
                {document.original_filename ?? copy.untitled}
              </span>
              <small>
                {statusText(locale, document.document_status)} · {formatter.format(new Date(document.created_at))}
              </small>
            </span>
            <span className="staff-document-card__open">
              <span>{copy.open}</span><b aria-hidden="true">›</b>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default async function StaffDocumentIntakePage() {
  const auth = await getRequiredStaffUser("/admin/documents");
  const locale = await getLocale();
  const copy = documentCopy(locale);

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />

        <div className="notice notice--warning">
          <h2>{copy.setupTitle}</h2>
          <p>{copy.setupMessage}</p>
        </div>
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
          description={copy.description}
        />

        <div className="notice notice--warning">
          <span className="panel__label">{copy.accessFailed}</span>
          <h2>{copy.unavailable}</h2>
          <p>{copy.accessMessage}</p>
        </div>
      </div>
    );
  }

  const documentsResult = await getStaffDocumentIntakeItems();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <section className="panel-grid staff-document-intro">
        <div className="panel">
          <span className="panel__label">{copy.session}</span>
          <h2>{auth.email ?? copy.staff}</h2>
          <p>{copy.role}: {copy.roles[auth.role]}</p>
          <div className="panel-actions">
            <LogoutButton label={copy.logout} />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{copy.scope}</span>
          <h2>{copy.readOnly}</h2>
          <p>{copy.scopeDescription}</p>
        </div>
      </section>

      <section className="intake-section" aria-label={copy.section}>
        {documentsResult.status === "ready" ? (
          <>
            <DocumentTable documents={documentsResult.documents} locale={locale} />
            <DocumentCards documents={documentsResult.documents} locale={locale} />
          </>
        ) : (
          <div className="notice notice--warning">
            <span className="panel__label">{copy.unavailable}</span>
            <h2>{documentsResult.status === "missing-service-role" ? copy.setupTitle : copy.loadFailed}</h2>
            <p>{documentsResult.status === "missing-service-role" ? copy.setupMessage : copy.loadMessage}</p>
          </div>
        )}
      </section>
    </div>
  );
}
