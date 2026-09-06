"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getReprocessingCopy } from "@/lib/documents/reprocessing-copy";
import {
  reprocessCaseDocumentsAction,
  type ReprocessCaseActionState
} from "./reprocess-actions";

type ReprocessCaseDocumentsFormProps = {
  caseId: string;
  queuedDocumentCount: number;
  locale: "ru" | "en";
};

const initialReprocessCaseActionState: ReprocessCaseActionState = {
  status: "idle",
  message: "",
  queuedCount: 0,
  runId: null
};

export function ReprocessCaseDocumentsForm({
  caseId,
  queuedDocumentCount,
  locale
}: ReprocessCaseDocumentsFormProps) {
  const copy = useMemo(() => getReprocessingCopy(locale), [locale]);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    reprocessCaseDocumentsAction,
    initialReprocessCaseActionState
  );
  const [progress, setProgress] = useState<string | null>(null);
  const [resumeRun, setResumeRun] = useState<{ runId: string; queuedCount: number } | null>(null);
  const [armed, setArmed] = useState(false);
  const startedRun = useRef<string | null>(null);

  useEffect(() => {
    const run = state.status === "queued" && state.runId
      ? { runId: state.runId, queuedCount: state.queuedCount }
      : resumeRun;

    if (!run || run.queuedCount < 1 || startedRun.current === run.runId) {
      return;
    }

    const activeRun = run;
    startedRun.current = activeRun.runId;
    let cancelled = false;

    async function processQueuedDocuments() {
      setProgress(copy.queued(activeRun.queuedCount));
      let completed = 0;

      try {
        for (let index = 0; index < activeRun.queuedCount; index += 1) {
          const response = await fetch("/api/documents/process", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ caseId })
          });
          if (!response.ok) throw new Error("Processing request failed");

          const result = await response.json() as { status?: string };
          if (result.status === "idle") break;

          completed += 1;
          if (!cancelled) {
            setProgress(copy.processing(completed, activeRun.queuedCount));
          }
        }

        if (!cancelled) {
          setProgress(
            completed === activeRun.queuedCount
              ? copy.complete(completed)
              : copy.failed
          );
          router.refresh();
        }
      } catch {
        if (!cancelled) setProgress(copy.failed);
      }
    }

    void processQueuedDocuments();
    return () => {
      cancelled = true;
    };
  }, [caseId, copy, resumeRun, router, state.queuedCount, state.runId, state.status]);

  return (
    <div>
      <span className="panel__label">{copy.label}</span>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      {queuedDocumentCount > 0 && !progress ? (
        <div>
          <p>{copy.resumeDescription}</p>
          <button
            className="button button--secondary"
            onClick={() => setResumeRun({
              runId: crypto.randomUUID(),
              queuedCount: queuedDocumentCount
            })}
            type="button"
          >
            {copy.resumeButton(queuedDocumentCount)}
          </button>
        </div>
      ) : null}
      {armed ? (
        <form action={formAction}>
          <input name="caseId" type="hidden" value={caseId} />
          <input name="locale" type="hidden" value={locale} />
          <p>{copy.confirm}</p>
          <div className="button-row">
            <button className="button button--secondary" disabled={pending} type="submit">
              {pending ? copy.pending : copy.confirmButton}
            </button>
            <button
              className="button button--ghost"
              disabled={pending}
              onClick={() => setArmed(false)}
              type="button"
            >
              {copy.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="button button--secondary"
          onClick={() => setArmed(true)}
          type="button"
        >
          {copy.button}
        </button>
      )}
      {state.status === "error" ? (
        <p className="form-message form-message--error" role="alert">
          {state.message}
        </p>
      ) : null}
      {progress ? (
        <p className="form-message form-message--success" aria-live="polite" role="status">
          {progress}
        </p>
      ) : null}
    </div>
  );
}
