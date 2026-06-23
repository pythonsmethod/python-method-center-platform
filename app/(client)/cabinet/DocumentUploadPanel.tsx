"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import {
  buildDocumentStoragePath,
  DOCUMENT_STORAGE_BUCKET,
  validateDocumentFile
} from "@/lib/documents/config";
import { recordUploadedDocumentMetadata } from "@/lib/documents/actions";
import type {
  DocumentIntakeStatus,
  UploadedDocument
} from "@/lib/documents/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type DocumentUploadPanelProps = {
  userId: string;
  caseId: string;
  initialDocuments: UploadedDocument[];
};

type UploadState =
  | {
      status: "idle";
      message: string;
    }
  | {
      status: "uploading";
      message: string;
    }
  | {
      status: "success";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function formatFileSize(value: unknown): string {
  const bytes = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Size unavailable";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDocumentStatus(status: DocumentIntakeStatus): string {
  return status.replaceAll("_", " ");
}

function stateClassName(state: UploadState): string {
  return `form-message form-message--${state.status === "uploading" ? "idle" : state.status}`;
}

export function DocumentUploadPanel({
  userId,
  caseId,
  initialDocuments
}: DocumentUploadPanelProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [state, setState] = useState<UploadState>({
    status: "idle",
    message: ""
  });
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setState({
        status: "error",
        message: "Choose a document file before uploading."
      });
      return;
    }

    const validation = validateDocumentFile(file);

    if (validation.status === "invalid") {
      setState({
        status: "error",
        message: validation.message
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setState({
        status: "error",
        message: "Supabase is not configured. Add the public URL and anon key to the environment."
      });
      return;
    }

    const documentId = crypto.randomUUID();
    const storagePath = buildDocumentStoragePath({
      userId,
      caseId,
      documentId,
      originalFilename: file.name
    });

    setState({
      status: "uploading",
      message: "Uploading document..."
    });

    startTransition(async () => {
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: validation.mimeType,
          upsert: false
        });

      if (uploadError) {
        setState({
          status: "error",
          message: uploadError.message
        });
        return;
      }

      const metadataResult = await recordUploadedDocumentMetadata({
        caseId,
        documentId,
        storagePath,
        originalFilename: file.name,
        mimeType: validation.mimeType,
        fileSize: file.size
      });

      if (metadataResult.status === "error") {
        await supabase.storage.from(DOCUMENT_STORAGE_BUCKET).remove([
          storagePath
        ]);
        setState({
          status: "error",
          message: metadataResult.message
        });
        return;
      }

      setDocuments((currentDocuments) => [
        metadataResult.document,
        ...currentDocuments
      ]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setState({
        status: "success",
        message: "Document uploaded and linked to this case."
      });
    });
  }

  const uploading = state.status === "uploading" || isPending;

  return (
    <section className="documents-section" aria-label="Case documents">
      <div className="documents-layout">
        <form className="document-upload" onSubmit={handleSubmit}>
          <div>
            <span className="panel__label">Documents</span>
            <h2>Upload a case document</h2>
          </div>
          <label className="field">
            <span>Document file</span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              disabled={uploading}
              ref={fileInputRef}
              type="file"
            />
          </label>
          <button className="button" disabled={uploading} type="submit">
            {uploading ? "Uploading..." : "Upload document"}
          </button>
          {state.message ? (
            <p className={stateClassName(state)}>{state.message}</p>
          ) : null}
        </form>

        <div className="documents-list-panel">
          <div>
            <span className="panel__label">Current case</span>
            <h2>Uploaded documents</h2>
          </div>

          {documents.length === 0 ? (
            <p className="empty-state">No documents uploaded yet.</p>
          ) : (
            <ul className="document-list">
              {documents.map((document) => (
                <li className="document-list__item" key={document.id}>
                  <div>
                    <strong>
                      {document.original_filename ?? "Untitled document"}
                    </strong>
                    <span>{formatDate(document.created_at)}</span>
                    <span
                      className={`status-badge status-badge--${document.document_status}`}
                    >
                      {formatDocumentStatus(document.document_status)}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>{formatDocumentStatus(document.document_status)}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>
                        {String(
                          document.metadata.mime_type ?? document.document_type
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{formatFileSize(document.metadata.file_size)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
