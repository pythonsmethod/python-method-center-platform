"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmCaseDocumentIdentityAction,
  type ConfirmIdentityActionState
} from "./reprocess-actions";

type Props = {
  caseId: string;
  documents: Array<{ id: string; filename: string }>;
  locale: "ru" | "en";
};

const initialState: ConfirmIdentityActionState = {
  status: "idle", message: "", queuedCount: 0, runId: null
};

export function IdentityReviewForm({ caseId, documents, locale }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(confirmCaseDocumentIdentityAction, initialState);
  const [armed, setArmed] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const startedRun = useRef<string | null>(null);
  const ru = locale === "ru";

  useEffect(() => {
    if (state.status !== "queued" || !state.runId || startedRun.current === state.runId) return;
    startedRun.current = state.runId;
    let cancelled = false;

    async function processConfirmedDocuments() {
      let completed = 0;
      setProgress(ru ? `Подтверждение сохранено. Обработано: 0 из ${state.queuedCount}.` : `Confirmation saved. Processed: 0 of ${state.queuedCount}.`);
      try {
        for (let index = 0; index < state.queuedCount; index += 1) {
          const response = await fetch("/api/documents/process", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ caseId })
          });
          if (!response.ok) throw new Error("Processing request failed");
          const result = await response.json() as { status?: string };
          if (result.status === "idle") break;
          completed += 1;
          if (!cancelled) setProgress(ru ? `Обработано: ${completed} из ${state.queuedCount}.` : `Processed: ${completed} of ${state.queuedCount}.`);
        }
        if (!cancelled) router.refresh();
      } catch {
        if (!cancelled) setProgress(ru ? "Подтверждение сохранено, но обработка не завершилась. Продолжите очередь ниже." : "Confirmation was saved, but processing did not finish. Continue the queue below.");
      }
    }

    void processConfirmedDocuments();
    return () => { cancelled = true; };
  }, [caseId, router, ru, state.queuedCount, state.runId, state.status]);

  if (documents.length === 0) return null;

  return (
    <div className="notice notice--warning">
      <span className="panel__label">{ru ? "Проверка принадлежности" : "Identity review"}</span>
      <h3>{ru ? "Документы остановлены" : "Documents are blocked"}</h3>
      <p>{ru
        ? "Автоматическая проверка увидела другое имя. Подтверждайте только после проверки, что перечисленные файлы действительно относятся к человеку в этом кейсе. Исходное несовпадение останется в аудите."
        : "The automatic check found another name. Confirm only after verifying that every listed file belongs to the person in this Case. The original mismatch remains in the audit trail."}</p>
      <ul className="status-list">
        {documents.map((document) => <li key={document.id}>{document.filename}</li>)}
      </ul>
      {armed ? (
        <form action={formAction}>
          <input name="caseId" type="hidden" value={caseId} />
          <input name="locale" type="hidden" value={locale} />
          {documents.map((document) => <input key={document.id} name="documentId" type="hidden" value={document.id} />)}
          <p>{ru
            ? "Подтвердить принадлежность всех перечисленных документов и запустить их две независимые вычитки?"
            : "Confirm that every listed document belongs in this Case and start two independent readings?"}</p>
          <div className="button-row">
            <button className="button button--secondary" disabled={pending} type="submit">
              {pending ? (ru ? "Сохраняю…" : "Saving…") : (ru ? "Да, подтвердить и обработать" : "Yes, confirm and process")}
            </button>
            <button className="button button--ghost" disabled={pending} onClick={() => setArmed(false)} type="button">
              {ru ? "Отмена" : "Cancel"}
            </button>
          </div>
        </form>
      ) : (
        <button className="button button--secondary" onClick={() => setArmed(true)} type="button">
          {ru ? "Подтвердить принадлежность документов" : "Confirm document identity"}
        </button>
      )}
      {state.status === "error" ? <p className="form-message form-message--error" role="alert">{state.message}</p> : null}
      {progress ? <p className="form-message form-message--success" aria-live="polite" role="status">{progress}</p> : null}
    </div>
  );
}
