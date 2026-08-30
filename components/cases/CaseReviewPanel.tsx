"use client";

import { useActionState, useEffect, useState } from "react";
import { approveCaseReview, generateCaseReview } from "@/lib/cases/review-actions";
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
  const [approvalState, approvalAction, approvalPending] = useActionState(
    approveCaseReview,
    initialCaseReviewState
  );
  const [copied, setCopied] = useState(false);
  const [editedText, setEditedText] = useState(review?.approvedText ?? review?.draft ?? "");
  useEffect(() => {
    setEditedText(review?.approvedText ?? review?.draft ?? "");
  }, [review?.id, review?.draft, review?.approvedText]);
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
        approve: "Утвердить заключение",
        approving: "Сохраняю историю...",
        note: "Редактируйте прямо здесь. При утверждении система сохранит исходный текст ИИ, всё удалённое и добавленное Кареном и окончательное заключение.",
        history: "Сохранённых утверждений",
        approved: "Утверждённая версия",
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
        approve: "Approve conclusion",
        approving: "Saving history...",
        note: "Edit directly here. On approval, the system saves the original AI text, everything Karen removed or added, and the final conclusion.",
        history: "Saved approvals",
        approved: "Approved version",
        verify: "Requires verification",
        verifyNote: "The AI could not read these items confidently. The file number and name take you directly to the right document.",
        verified: "No additional verification is required.",
        stale: "The client uploaded new documents after this text was prepared. Prepare it again.",
        recognized: "Files recognized"
      };

  async function copyDraft() {
    if (!review?.approvedText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(review.approvedText);
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
                {review.approvedText ? <button
                  className="button button--secondary"
                  onClick={() => void copyDraft()}
                  type="button"
                >
                  {copied ? t.copied : t.copy}
                </button> : null}
              </div>
              <form action={approvalAction}>
                <input name="case_id" type="hidden" value={caseId} />
                <input name="review_id" type="hidden" value={review.id} />
                <input name="locale" type="hidden" value={locale} />
                <textarea
                  aria-label={t.approved}
                  className="case-review__text case-review__editor"
                  maxLength={8000}
                  name="approved_text"
                  onChange={(event) => setEditedText(event.target.value)}
                  rows={18}
                  value={editedText}
                />
                <div className="panel-actions">
                  <button className="button" disabled={approvalPending || !editedText.trim()} type="submit">
                    {approvalPending ? t.approving : t.approve}
                  </button>
                  {review.approvalCount > 0 ? <span>{t.history}: {review.approvalCount}</span> : null}
                </div>
              </form>
              <p className="case-review__draft-note">
                {t.note}
              </p>
              {approvalState.message ? (
                <p className={approvalState.status === "success" ? "form-message form-message--success" : "form-message form-message--error"}>
                  {approvalState.message}
                </p>
              ) : null}
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
