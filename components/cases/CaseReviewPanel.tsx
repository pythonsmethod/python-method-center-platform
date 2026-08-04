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
};

function formatWhen(iso: string): string {
  if (!iso) {
    return "";
  }

  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
  documentsCount
}: CaseReviewPanelProps) {
  const [state, action, pending] = useActionState(
    generateCaseReview,
    initialCaseReviewState
  );
  const [copied, setCopied] = useState(false);

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
    <section className="case-review" aria-label="Разбор анализов ассистентом">
      <div className="case-review__head">
        <div>
          <span className="panel__label">Ассистент по анализам</span>
          <h2>
            {review ? "Разбор загруженных анализов" : "Анализы ещё не прочитаны"}
          </h2>
        </div>
        <form action={action}>
          <input name="case_id" type="hidden" value={caseId} />
          <button
            className="button button--secondary"
            disabled={pending || documentsCount === 0}
            type="submit"
          >
            {pending
              ? "Читаю анализы..."
              : review
                ? "Перечитать"
                : "Прочитать анализы кейса"}
          </button>
        </form>
      </div>

      {documentsCount === 0 ? (
        <p className="case-review__empty">
          В кейсе пока нет загруженных документов.
        </p>
      ) : null}

      {state.message ? (
        <p
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
              Клиент загрузил документы после этого разбора — нажмите
              «Перечитать», чтобы ассистент увидел новые.
            </p>
          ) : null}

          <p className="case-review__origin">
            Это мнение ИИ, а не разбор Professor Python. Прочитано документов:{" "}
            {review.documentsCount} · {formatWhen(review.createdAt)}.
          </p>

          <div className="case-review__body">
            <pre className="case-review__text">{review.summary}</pre>
          </div>

          {review.draft ? (
            <div className="case-review__draft">
              <div className="case-review__draft-head">
                <h3>Черновик ответа клиенту</h3>
                <button
                  className="button button--secondary"
                  onClick={() => void copyDraft()}
                  type="button"
                >
                  {copied ? "Скопировано" : "Скопировать"}
                </button>
              </div>
              <pre className="case-review__text">{review.draft}</pre>
              <p className="case-review__draft-note">
                Клиент не увидит, что текст готовил ассистент. Вставьте его в
                поле ответа ниже, прочитайте, поправьте под себя — и отправьте
                от своего имени. Отправляет только человек.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
