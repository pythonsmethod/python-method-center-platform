"use client";

import { useActionState, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { prepareFiles } from "@/lib/assistant/prepare-files";
import { saveExtractedMetrics } from "@/lib/metrics/actions";
import { initialMetricActionState } from "@/lib/metrics/action-state";
import type { ExtractedRow } from "@/lib/metrics/extraction";

type MetricsUploadProps = {
  labels: Dictionary["cabinet"]["metricsUpload"];
};

type Stage =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "review"; rows: ExtractedRow[] }
  | { kind: "error"; message: string };

// The paperclip on the progress page. A person photographs their printout,
// the assistant reads the numbers off it, and the person confirms them
// before anything is written down.
//
// The confirmation step is not politeness. A model can misread a digit on
// a photographed form, and a wrong number on a health chart is worse than
// no number: it is a fact the person will later believe. So what comes back
// is a proposal with every row unticked-able, and the person is the one who
// decides what lands in their table.
export function MetricsUpload({ labels: t }: MetricsUploadProps) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [saveState, saveAction, savePending] = useActionState(
    saveExtractedMetrics,
    initialMetricActionState
  );

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setStage({ kind: "reading" });

    const prepared = await prepareFiles([...files], 0);

    if (prepared.files.length === 0) {
      setStage({ kind: "error", message: prepared.errors[0] ?? t.errorRead });
      return;
    }

    try {
      const response = await fetch("/api/metrics/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachments: prepared.files.map((file) => ({
            name: file.name,
            mediaType: file.mediaType,
            data: file.data
          }))
        })
      });

      if (!response.ok) {
        setStage({
          kind: "error",
          message:
            response.status === 429
              ? t.errorTooOften
              : response.status === 422
                ? t.errorUnreadable
                : t.errorService
        });
        return;
      }

      const data = (await response.json()) as { rows?: ExtractedRow[] };
      const rows = Array.isArray(data.rows) ? data.rows : [];

      if (rows.length === 0) {
        setStage({ kind: "error", message: t.errorNothingFound });
        return;
      }

      setChosen(
        Object.fromEntries(rows.map((row, index) => [String(index), true]))
      );
      setStage({ kind: "review", rows });
    } catch {
      setStage({ kind: "error", message: t.errorService });
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const selectedRows =
    stage.kind === "review"
      ? stage.rows.filter((_, index) => chosen[String(index)])
      : [];

  return (
    <section className="panel metrics-upload" aria-label={t.aria}>
      <span className="panel__label">{t.label}</span>
      <h2>{t.title}</h2>
      <p>{t.text}</p>

      <div className="metrics-upload__actions">
        <button
          className="button button--secondary metrics-upload__clip"
          disabled={stage.kind === "reading"}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span aria-hidden="true">📎</span>
          {stage.kind === "reading" ? t.reading : t.pick}
        </button>
        <input
          accept="image/*,application/pdf"
          className="metrics-upload__input"
          multiple
          onChange={(event) => void onPick(event.target.files)}
          ref={inputRef}
          type="file"
        />
      </div>

      <p className="metrics-upload__boundary">{t.boundary}</p>

      {stage.kind === "error" ? (
        <p aria-live="assertive" className="form-message form-message--error" role="alert">{stage.message}</p>
      ) : null}

      {stage.kind === "review" && saveState.status !== "success" ? (
        <form action={saveAction} className="metrics-upload__review">
          <p className="metrics-upload__found">{t.found}</p>
          <ul className="metrics-upload__rows">
            {stage.rows.map((row, index) => (
              <li key={`${row.name}-${row.measured_at}-${index}`}>
                <label className="checkbox-field">
                  <input
                    checked={Boolean(chosen[String(index)])}
                    onChange={(event) =>
                      setChosen((current) => ({
                        ...current,
                        [String(index)]: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                  <span>
                    <strong>{row.name}</strong> — {row.value}
                    {row.unit ? ` ${row.unit}` : ""} · {row.measured_at}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <input
            name="rows"
            type="hidden"
            value={JSON.stringify(
              selectedRows.map((row) => ({
                name: row.name,
                value: row.value,
                unit: row.unit,
                measured_at: row.measured_at
              }))
            )}
          />

          <div className="metrics-upload__confirm">
            <button
              className="button"
              disabled={savePending || selectedRows.length === 0}
              type="submit"
            >
              {savePending ? t.saving : `${t.save} (${selectedRows.length})`}
            </button>
            <button
              className="button button--secondary"
              onClick={() => setStage({ kind: "idle" })}
              type="button"
            >
              {t.cancel}
            </button>
          </div>

          <p className="metrics-upload__check">{t.checkNote}</p>
        </form>
      ) : null}

      {saveState.message ? (
        <p
          aria-live="polite"
          role="status"
          className={`form-message form-message--${
            saveState.status === "success" ? "success" : "error"
          }`}
        >
          {saveState.message}
        </p>
      ) : null}
    </section>
  );
}
