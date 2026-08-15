import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { formatDateTime } from "@/lib/i18n/format";
import {
  getStaffDocumentIntakeItems,
  type StaffDocumentIntakeItem
} from "@/lib/documents/staff-queries";
import { getLocale, type Locale } from "@/lib/i18n/locale";



function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function documentCopy(locale: Locale) {
  return locale === "ru"
    ? {
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
          accepted: "Принят",
          needs_reupload: "Нужна повторная загрузка",
          archived: "В архиве"
        }
      }
    : {
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
          accepted: "Accepted",
          needs_reupload: "Re-upload needed",
          archived: "Archived"
        }
      };
}

function statusText(locale: Locale, value: string): string {
  const labels: Record<string, string> = documentCopy(locale).statuses;
  return labels[value] ?? formatStatus(value);
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
              <td>{formatDateTime(document.created_at)}</td>
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

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Internal intake"
          title="Documents"
          description="This route requires Supabase Auth before staff access can be evaluated."
        />

        <AuthSetupNotice title="Staff document intake requires Supabase Auth setup" />
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
          eyebrow="Internal intake"
          title="Documents"
          description="Staff access could not be evaluated."
        />

        <div className="notice notice--warning">
          <span className="panel__label">Access check failed</span>
          <h2>Document intake unavailable</h2>
          <p>{auth.message}</p>
        </div>
      </div>
    );
  }

  const documentsResult = await getStaffDocumentIntakeItems();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Internal intake"
        title="Documents"
        description="Read-only staff view of uploaded document metadata and intake lifecycle status."
      />

      <section className="panel-grid staff-document-intro">
        <div className="panel">
          <span className="panel__label">Authorized staff session</span>
          <h2>{auth.email ?? "Signed-in staff user"}</h2>
          <p>Role: {auth.role}</p>
          <div className="panel-actions">
            <LogoutButton />
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">Scope</span>
          <h2>Read-only intake</h2>
          <p>
            This view lists uploaded documents and opens private files by signed
            server URL. It does not change document status or case state.
          </p>
        </div>
      </section>

      <section className="intake-section" aria-label="Uploaded documents">
        {documentsResult.status === "ready" ? (
          <>
            <DocumentTable documents={documentsResult.documents} locale={locale} />
            <DocumentCards documents={documentsResult.documents} locale={locale} />
          </>
        ) : (
          <div className="notice notice--warning">
            <span className="panel__label">Documents unavailable</span>
            <h2>Intake cannot load documents</h2>
            <p>{documentsResult.message}</p>
          </div>
        )}
      </section>
    </div>
  );
}
