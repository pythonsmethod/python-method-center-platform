import type { ReactNode } from "react";
import {
  buildDocumentTimeline,
  type TimelineDocument
} from "@/lib/documents/timeline";
import { documentStatusLabel } from "@/lib/i18n/status-labels";

type DocumentTimelineProps<T extends TimelineDocument> = {
  documents: T[];
  emptyText: string;
  // The staff view adds an "open file" button; the client view adds
  // nothing. Rendering stays on the server either way.
  renderAction?: (document: T) => ReactNode;
};

function dayLabel(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}

function timeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Uploads shown as history, not as a pile: one block per day, and a repeat
// upload of the same file name is marked as a new version — so "the same
// blood test, three months later" reads as exactly that.
export function DocumentTimeline<T extends TimelineDocument>({
  documents,
  emptyText,
  renderAction
}: DocumentTimelineProps<T>) {
  const rounds = buildDocumentTimeline(documents);

  if (rounds.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ol className="doc-rounds">
      {rounds.map((round, index) => (
        <li className="doc-round" key={round.dayKey}>
          <div className="doc-round__head">
            <strong>
              Загрузка от {dayLabel(round.dayKey)}
              {index === 0 ? " · последняя" : ""}
            </strong>
            <span>
              {round.totalCount}{" "}
              {round.totalCount === 1 ? "файл" : round.totalCount < 5 ? "файла" : "файлов"}
              {round.updateCount > 0
                ? ` · обновлений ранее загруженных: ${round.updateCount}`
                : ""}
            </span>
          </div>
          <ul className="doc-round__files">
            {round.entries.map(({ document, version, isUpdate }) => (
              <li className="doc-round__file" key={document.id}>
                <div className="doc-round__file-body">
                  <strong>
                    {document.original_filename ?? "Документ без названия"}
                  </strong>
                  <span>
                    {timeLabel(document.created_at)}
                    {document.document_status
                      ? ` · ${documentStatusLabel(document.document_status)}`
                      : ""}
                  </span>
                </div>
                {isUpdate ? (
                  <span className="doc-round__version">версия {version}</span>
                ) : null}
                {renderAction ? renderAction(document) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
