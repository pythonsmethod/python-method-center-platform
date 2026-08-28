import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ReactNode } from "react";
import { plural } from "@/lib/i18n/plural";
import {
  buildDocumentTimeline,
  type TimelineDocument
} from "@/lib/documents/timeline";
import {
  clientDocumentStatusLabel,
  documentStatusLabel
} from "@/lib/i18n/status-labels";
import type { Locale } from "@/lib/i18n/locale";

type DocumentTimelineProps<T extends TimelineDocument> = {
  labels: Dictionary["cabinet"]["timeline"];
  documents: T[];
  emptyText: string;
  locale?: Locale;
  // The staff view adds an "open file" button; the client view adds
  // nothing. Rendering stays on the server either way.
  renderAction?: (document: T) => ReactNode;
  // Who is reading. The team needs the queue's own vocabulary; the client
  // needs to know whether their file is being worked on or done.
  audience?: "client" | "staff";
};

function dayLabel(dayKey: string, locale: Locale): string {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}

function timeLabel(createdAt: string, locale: Locale): string {
  return new Date(createdAt).toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Uploads shown as history, not as a pile: one block per day, and a repeat
// upload of the same file name is marked as a new version — so "the same
// blood test, three months later" reads as exactly that.
export function DocumentTimeline<T extends TimelineDocument>({
  audience = "staff",
  documents,
  emptyText,
  locale = "ru",
  renderAction,
  labels: t
}: DocumentTimelineProps<T>) {
  const statusLabel =
    audience === "client" ? clientDocumentStatusLabel : documentStatusLabel;
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
              {t.uploadFrom} {dayLabel(round.dayKey, locale)}
              {index === 0 ? ` · ${t.latest}` : ""}
            </strong>
            <span>
              {round.totalCount}{" "}
              {plural(round.totalCount, t.files)}
              {round.updateCount > 0
                ? ` · ${t.updatesPrefix} ${round.updateCount}`
                : ""}
            </span>
          </div>
          <ul className="doc-round__files">
            {round.entries.map(({ document, version, isUpdate }) => (
              <li className="doc-round__file" key={document.id}>
                <div className="doc-round__file-body">
                  <strong>
                    {document.original_filename ?? t.untitled}
                  </strong>
                  <span>
                    {timeLabel(document.created_at, locale)}
                    {document.document_status
                      ? ` · ${statusLabel(document.document_status, locale)}`
                      : ""}
                  </span>
                </div>
                {isUpdate ? (
                  <span className="doc-round__version">
                    {t.version} {version}
                  </span>
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
