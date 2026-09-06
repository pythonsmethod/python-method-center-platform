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
  locale
}: ReprocessCaseDocumentsFormProps) {
  const copy = useMemo(() => getReprocessingCopy(locale), [locale]);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    reprocessCaseDocumentsAction,
    initialReprocessCaseActionState
  );
  const [progress, setProgress] = useState<string | null>(null);
  const startedRun = useRef<string | null>(null);

  useEffect(() => {
    if (
      state.status !== "queued" ||
      !state.runId ||
      state.queuedCount < 1 ||
      startedRun.current === state.runId
    ) {
      return;
    }

    startedRun.current = state.runId;
    let cancelled = false;

    async function processQueuedDocuments() {
      setProgress(copy.queued(state.queuedCount));
      let completed = 0;

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
          if (!cancelled) {
            setProgress(copy.processing(completed, state.queuedCount));
            router.refresh();
          }
        }

        if (!cancelled) {
          setProgress(
            completed === state.queuedCount
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
  }, [caseId, copy, router, state.queuedCount, state.runId, state.status]);

  return (
    <div>
      <span className="panel__label">{copy.label}</span>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(copy.confirm)) event.preventDefault();
        }}
      >
        <input name="caseId" type="hidden" value={caseId} />
        <input name="locale" type="hidden" value={locale} />
        <button className="button button--secondary" disabled={pending} type="submit">
          {pending ? copy.pending : copy.button}
        </button>
      </form>
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
