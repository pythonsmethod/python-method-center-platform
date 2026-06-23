import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import {
  getStaffDocumentIntakeItems,
  type StaffDocumentIntakeItem
} from "@/lib/documents/staff-queries";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function DocumentTable({ documents }: { documents: StaffDocumentIntakeItem[] }) {
  if (documents.length === 0) {
    return <p className="empty-state">No uploaded documents are waiting in intake.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Profile</th>
            <th>Case</th>
            <th>Filename</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>
                <code title={document.id}>{shortId(document.id)}</code>
              </td>
              <td>
                <code title={document.profile_id}>
                  {shortId(document.profile_id)}
                </code>
              </td>
              <td>
                <code title={document.case_id}>{shortId(document.case_id)}</code>
              </td>
              <td>{document.original_filename ?? "Untitled document"}</td>
              <td>
                <span
                  className={`status-badge status-badge--${document.document_status}`}
                >
                  {formatStatus(document.document_status)}
                </span>
              </td>
              <td>{formatDate(document.created_at)}</td>
              <td>
                <Link
                  className="button button--secondary button--compact"
                  href={`/admin/documents/${document.id}/view`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StaffDocumentIntakePage() {
  const auth = await getRequiredStaffUser("/admin/documents");

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

      <section className="panel-grid">
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
          <DocumentTable documents={documentsResult.documents} />
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
