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
import { documentStatusLabel } from "@/lib/i18n/status-labels";
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
    return "Размер неизвестен";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDocumentStatus(status: DocumentIntakeStatus): string {
  return documentStatusLabel(status);
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
        message: "Сначала выберите файл документа."
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
        message: "Сервис временно недоступен: не настроено подключение к базе данных."
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
      message: "Загрузка документа..."
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
        message: "Документ загружен и привязан к вашему кейсу."
      });
    });
  }

  const uploading = state.status === "uploading" || isPending;

  return (
    <section className="documents-section" aria-label="Документы кейса">
      <div className="documents-layout">
        <form className="document-upload" onSubmit={handleSubmit}>
          <div>
            <span className="panel__label">Документы</span>
            <h2>Загрузить документ</h2>
          </div>
          <label className="field">
            <span>Файл документа</span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              disabled={uploading}
              ref={fileInputRef}
              type="file"
            />
          </label>
          <button className="button" disabled={uploading} type="submit">
            {uploading ? "Загрузка..." : "Загрузить документ"}
          </button>
          {state.message ? (
            <p className={stateClassName(state)}>{state.message}</p>
          ) : null}
        </form>

        <div className="documents-list-panel">
          <div>
            <span className="panel__label">Ваш кейс</span>
            <h2>Загруженные документы</h2>
          </div>

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
                    <span
                      className={`status-badge status-badge--${document.document_status}`}
                    >
                      {formatDocumentStatus(document.document_status)}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>Статус</dt>
                      <dd>{formatDocumentStatus(document.document_status)}</dd>
                    </div>
                    <div>
                      <dt>Тип</dt>
                      <dd>
                        {String(
                          document.metadata.mime_type ?? document.document_type
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Размер</dt>
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
