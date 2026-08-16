"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

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
import { documentStatusLabel } from "@/lib/i18n/status-labels";
import { formatDateTime } from "@/lib/i18n/format";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n/locale";

type DocumentUploadPanelProps = {
  userId: string;
  caseId: string;
  initialDocuments: UploadedDocument[];
  labels: Dictionary["cabinet"]["documents"];
  locale: Locale;
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

function formatFileSize(value: unknown, unknownLabel: string): string {
  const bytes = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return unknownLabel;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocumentStatus(status: DocumentIntakeStatus, locale: Locale): string {
  return documentStatusLabel(status, locale);
}

function stateClassName(state: UploadState): string {
  return `form-message form-message--${state.status === "uploading" ? "idle" : state.status}`;
}

export function DocumentUploadPanel({
  userId,
  caseId,
  initialDocuments,
  labels,
  locale
}: DocumentUploadPanelProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [state, setState] = useState<UploadState>({
    status: "idle",
    message: ""
  });
  const [isPending, startTransition] = useTransition();
  const [openError, setOpenError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleOpenDocument(document: UploadedDocument) {
    setOpenError("");

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setOpenError(SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }

    // Open the tab synchronously inside the click gesture: window.open after
    // an await is blocked by Safari/iOS popup rules.
    const documentWindow = window.open("about:blank", "_blank");

    const { data, error } = await supabase.storage
      .from(DOCUMENT_STORAGE_BUCKET)
      .createSignedUrl(document.storage_path, 60);

    if (error || !data?.signedUrl) {
      documentWindow?.close();
      setOpenError(error?.message ?? labels.errorOpen);
      return;
    }

    if (documentWindow) {
      documentWindow.location.replace(data.signedUrl);
    } else {
      window.location.assign(data.signedUrl);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setState({
        status: "error",
        message: labels.errorPickFile
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
        message: SERVICE_UNAVAILABLE_MESSAGE
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
      message: labels.progressUploading
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
        message: labels.uploaded
      });
    });
  }

  const uploading = state.status === "uploading" || isPending;

  return (
    <section className="documents-section" aria-label={labels.uploadAria}>
      <div className="documents-layout">
        <form className="document-upload" onSubmit={handleSubmit}>
          <div>
            <span className="panel__label">{labels.uploadLabel}</span>
            <h2>{labels.uploadTitle}</h2>
          </div>
          <label className="field">
            <span>{labels.fileField}</span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              disabled={uploading}
              ref={fileInputRef}
              type="file"
            />
          </label>
          <button className="button" disabled={uploading} type="submit">
            {uploading ? labels.uploading : labels.uploadCta}
          </button>
          {state.message ? (
            <p className={stateClassName(state)}>{state.message}</p>
          ) : null}
        </form>

        <div className="documents-list-panel">
          <div>
            <span className="panel__label">{labels.listLabel}</span>
            <h2>{labels.listTitle}</h2>
          </div>

          {openError ? (
            <p className="form-message form-message--error">{openError}</p>
          ) : null}

          {documents.length === 0 ? (
            <p className="empty-state">{labels.listEmpty}</p>
          ) : (
            <ul className="document-list">
              {documents.map((document) => (
                <li className="document-list__item" key={document.id}>
                  <div>
                    <strong>
                      {document.original_filename ?? labels.untitled}
                    </strong>
                    <span>{formatDateTime(document.created_at, locale)}</span>
                    <span
                      className={`status-badge status-badge--${document.document_status}`}
                    >
                      {formatDocumentStatus(document.document_status, locale)}
                    </span>
                  </div>
                  <div className="panel-actions">
                    <button
                      className="button button--secondary button--compact"
                      onClick={() => handleOpenDocument(document)}
                      type="button"
                    >
                      {labels.open}
                    </button>
                  </div>
                  <dl>
                    <div>
                      <dt>{labels.status}</dt>
                      <dd>{formatDocumentStatus(document.document_status, locale)}</dd>
                    </div>
                    <div>
                      <dt>{labels.kind}</dt>
                      <dd>
                        {String(
                          document.metadata.mime_type ?? document.document_type
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{labels.size}</dt>
                      <dd>{formatFileSize(document.metadata.file_size, labels.sizeUnknown)}</dd>
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
