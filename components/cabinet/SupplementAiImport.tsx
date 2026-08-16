"use client";

import { useActionState, useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/lib/assistant/attachments";
import { prepareFiles, splitIntoBatches } from "@/lib/assistant/prepare-files";
import { initialSupplementActionState } from "@/lib/supplements/action-state";
import { saveExtractedSupplements } from "@/lib/supplements/actions";
import type { ExtractedSupplement } from "@/lib/supplements/extraction";
import type { Locale } from "@/lib/i18n/locale";

const copy = {
  ru: {
    label: "Быстрое добавление с Анхамом", title: "Сфотографируйте добавки — Анхам соберёт расписание",
    text: "Прикрепите фотографии упаковок, этикеток или документ со списком. Анхам распознает названия, дозировки и указания и подготовит таблицу для проверки.",
    pick: "Прикрепить фото или документ", reading: "Анхам читает файлы…", found: "Проверьте распознанное расписание",
    name: "Добавка", dose: "Дозировка", time: "Время", note: "Подсказка по приёму", save: "Добавить выбранное", cancel: "Отменить",
    boundary: "ИИ ничего не назначает и не меняет дозировки. Он переносит сведения из файла и даёт только общие подсказки по времени. Проверьте таблицу перед сохранением.",
    empty: "Не удалось найти читаемый список добавок.", error: "Не удалось обработать файлы. Попробуйте более чёткое фото или внесите данные вручную.",
    often: "Слишком много попыток подряд. Подождите минуту.", check: "Вы можете снять галочку с любой строки. После подтверждения выбранные строки появятся в ежедневном чек-листе."
  },
  en: {
    label: "Quick add with Anham", title: "Photograph your supplements — Anham will build the schedule",
    text: "Attach photos of packages or labels, or a document containing your list. Anham will extract names, doses and directions and prepare a table for you to review.",
    pick: "Attach photos or a document", reading: "Anham is reading the files…", found: "Review the extracted schedule",
    name: "Supplement", dose: "Dose", time: "Time", note: "Timing note", save: "Add selected", cancel: "Cancel",
    boundary: "The AI does not prescribe supplements or change doses. It copies details from your files and gives general timing guidance only. Check the table before saving.",
    empty: "No readable supplement list was found.", error: "The files could not be processed. Try a clearer photo or enter the details manually.",
    often: "Too many attempts. Please wait a minute.", check: "You can untick any row. After confirmation, the selected rows will appear in your daily checklist."
  }
} as const;

type Stage = { kind: "idle" } | { kind: "reading" } | { kind: "review"; rows: ExtractedSupplement[] } | { kind: "error"; message: string };

export function SupplementAiImport({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [saveState, saveAction, savePending] = useActionState(saveExtractedSupplements, initialSupplementActionState);

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    setStage({ kind: "reading" });
    const prepared = await prepareFiles([...list], 0);
    if (!prepared.files.length) { setStage({ kind: "error", message: prepared.errors[0] ?? t.error }); return; }
    try {
      const rows: ExtractedSupplement[] = [];
      for (const batch of splitIntoBatches(prepared.files)) {
        const response = await fetch("/api/supplements/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attachments: batch.map(({ name, mediaType, data }) => ({ name, mediaType, data })) }) });
        if (!response.ok) { setStage({ kind: "error", message: response.status === 429 ? t.often : t.error }); return; }
        const data = await response.json() as { rows?: ExtractedSupplement[] };
        if (Array.isArray(data.rows)) rows.push(...data.rows);
      }
      if (!rows.length) { setStage({ kind: "error", message: t.empty }); return; }
      setChosen(Object.fromEntries(rows.map((_, index) => [String(index), true])));
      setStage({ kind: "review", rows });
    } catch { setStage({ kind: "error", message: t.error }); }
    finally { if (inputRef.current) inputRef.current.value = ""; }
  }

  const selected = stage.kind === "review" ? stage.rows.filter((_, index) => chosen[String(index)]) : [];
  return <section className="panel supplements-import" aria-label={t.title}>
    <span className="panel__label">{t.label}</span><h2>{t.title}</h2><p>{t.text}</p>
    <button className="button button--secondary supplements-import__pick" disabled={stage.kind === "reading"} onClick={() => inputRef.current?.click()} type="button"><span aria-hidden="true">📎</span>{stage.kind === "reading" ? t.reading : t.pick}</button>
    <input accept={ACCEPT_ATTRIBUTE} className="metrics-upload__input" multiple onChange={(event) => void onPick(event.target.files)} ref={inputRef} type="file" />
    <p className="supplements-import__boundary">{t.boundary}</p>
    {stage.kind === "error" ? <p className="form-message form-message--error">{stage.message}</p> : null}
    {stage.kind === "review" && saveState.status !== "success" ? <form action={saveAction} className="supplements-import__review">
      <strong>{t.found}</strong>
      <div className="supplements-import__table" role="table">
        <div className="supplements-import__row supplements-import__head" role="row"><span></span><span>{t.name}</span><span>{t.dose}</span><span>{t.time}</span><span>{t.note}</span></div>
        {stage.rows.map((row, index) => <label className="supplements-import__row" key={`${row.name}-${index}`}>
          <input checked={Boolean(chosen[String(index)])} onChange={(event) => setChosen((old) => ({ ...old, [String(index)]: event.target.checked }))} type="checkbox" />
          <strong>{row.name}</strong><span>{row.dose || "—"}</span><span>{row.times.join(" · ")}</span><span>{row.timing_note || row.notes || "—"}</span>
        </label>)}
      </div>
      <input name="locale" type="hidden" value={locale} /><input name="rows" type="hidden" value={JSON.stringify(selected)} />
      <div className="supplements-import__actions"><button className="button" disabled={savePending || !selected.length} type="submit">{savePending ? "…" : `${t.save} (${selected.length})`}</button><button className="button button--secondary" onClick={() => setStage({ kind: "idle" })} type="button">{t.cancel}</button></div>
      <p className="supplements-import__check">{t.check}</p>
    </form> : null}
    {saveState.message ? <p className={`form-message form-message--${saveState.status === "success" ? "success" : "error"}`}>{saveState.message}</p> : null}
  </section>;
}
