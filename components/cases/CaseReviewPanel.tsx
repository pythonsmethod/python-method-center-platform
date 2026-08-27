"use client";

import { useActionState, useState } from "react";
import { generateCaseReview } from "@/lib/cases/review-actions";
import {
  initialCaseReviewState,
  type CaseReview
} from "@/lib/cases/review-state";

type CaseReviewPanelProps = {
  caseId: string;
  review: CaseReview | null;
  documentsCount: number;
  documentStatuses?: string[];
  locale?: "ru" | "en";
};

// What Professor Python meets when he opens a case: the assistant's reading
// of the analyses already sitting in that case, and a draft reply.
//
// Two things this deliberately does not do. It does not send: the draft is
// copied into the message box below, where he edits it and sends it under
// his own name, having read it. And it does not hide what it is — the
// reading carries a label saying it is the machine's opinion, so nobody on
// the team mistakes it for his.
export function CaseReviewPanel({
  caseId,
  review,
  documentsCount,
  documentStatuses = [],
  locale = "ru"
}: CaseReviewPanelProps) {
  const [state, action, pending] = useActionState(
    generateCaseReview,
    initialCaseReviewState
  );
  const [copied, setCopied] = useState(false);
  const readyCount = documentStatuses.filter((status) => status === "ready").length;
  const reuploadCount = documentStatuses.filter((status) => status === "needs_reupload").length;
  const allReady = documentsCount > 0 && readyCount === documentsCount;
  const t = locale === "ru"
    ? {
        aria: "Подготовленный разбор анализов",
        label: "ИИ-разбор документов",
        title: "Готовый текст для клиента",
        empty: "Анализы ещё не прочитаны",
        build: "Подготовить текст",
        rebuild: "Подготовить заново",
        building: "Готовлю текст...",
        noDocuments: "В кейсе пока нет загруженных документов.",
        copied: "Скопировано",
        copy: "Копировать",
        note: "Проверьте текст, сверьте его с документами, дополните или скорректируйте при необходимости, затем отправьте клиенту в личных сообщениях.",
        verify: "Требует проверки",
        verifyNote: "ИИ не смог уверенно прочитать эти места. Номер и название помогут сразу открыть нужный файл.",
        verified: "Дополнительная проверка не требуется.",
        stale: "Клиент загрузил новые документы после подготовки текста. Подготовьте его заново.",
        recognized: "Распознано файлов"
      }
    : {
        aria: "Prepared test result review",
        label: "AI document review",
        title: "Client-ready text",
        empty: "The test results have not been reviewed yet",
        build: "Prepare text",
        rebuild: "Prepare again",
        building: "Preparing text...",
        noDocuments: "No documents have been uploaded to this case yet.",
        copied: "Copied",
        copy: "Copy",
        note: "Review the text against the original documents, amend it if needed, then send it to the client in a private message.",
        verify: "Requires verification",
        verifyNote: "The AI could not read these items confidently. The file number and name take you directly to the right document.",
        verified: "No additional verification is required.",
        stale: "The client uploaded new documents after this text was prepared. Prepare it again.",
        recognized: "Files recognized"
      };

  async function copyDraft() {
    if (!review?.draft) {
      return;
    }

    try {
      await navigator.clipboard.writeText(review.draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard refused (older browser, denied permission): the text is
      // on screen and selectable, which is what matters.
      setCopied(false);
    }
  }

  return (
    <section className="case-review" aria-label={t.aria}>
      <div className="case-review__head">
        <div>
          <span className="panel__label">{t.label}</span>
          <h2>
            {review ? t.title : t.empty}
          </h2>
        </div>
        <form action={action}>
          <input name="case_id" type="hidden" value={caseId} />
          <input name="locale" type="hidden" value={locale} />
          <button
            className="button button--secondary"
            disabled={pending || !allReady}
            type="submit"
          >
            {pending
              ? t.building
              : review
                ? t.rebuild
                : t.build}
          </button>
        </form>
      </div>

      {documentsCount === 0 ? (
        <p className="case-review__empty">
          {t.noDocuments}
        </p>
      ) : null}

      {documentsCount > 0 ? (
        <p className="case-review__origin">
          {t.recognized}: {readyCount} / {documentsCount}.
          {reuploadCount > 0
            ? ` Нужна повторная загрузка: ${reuploadCount}. Клиент получил сообщение с названием файла.`
            : allReady
              ? " Все материалы учтены — итог можно собрать без повторного чтения файлов."
              : " Остальные файлы находятся в очереди или обрабатываются."}
        </p>
      ) : null}

      {state.message ? (
        <p
          aria-live="polite"
          role="status"
          className={`form-message form-message--${
            state.status === "success" ? "success" : "error"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      {review ? (
        <>
          {!review.isCurrent ? (
            <p className="case-review__stale">
              {t.stale}
            </p>
          ) : null}

          {review.draft ? (
            <div className="case-review__draft">
              <div className="case-review__draft-head">
                <h3>{t.title}</h3>
                <button
                  className="button button--secondary"
                  onClick={() => void copyDraft()}
                  type="button"
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <pre className="case-review__text">{review.draft}</pre>
              <p className="case-review__draft-note">
                {t.note}
              </p>
            </div>
          ) : null}

          {review.summary ? (
            <aside className="case-review__verification" aria-label={t.verify}>
              <span className="panel__label">{t.verify}</span>
              <p className="case-review__draft-note">{t.verifyNote}</p>
              <pre className="case-review__text">{review.summary}</pre>
            </aside>
          ) : (
            <p className="case-review__verified">{t.verified}</p>
          )}
        </>
      ) : null}
    </section>
  );
}
