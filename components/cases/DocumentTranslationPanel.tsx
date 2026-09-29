"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CaseAnalyticalPicture } from "@/lib/analytical-picture";
import { translateDocumentRows, type DocumentTranslationState } from "@/lib/documents/translation-action";
import type { TranslationBatch } from "@/lib/documents/translation";

const initialState: DocumentTranslationState = { status: "idle", message: "", rows: [] };

function TranslationBatchView({ caseId, locale, batch, name }: { caseId: string; locale: "ru" | "en"; batch: TranslationBatch; name: string }) {
  const [state, action, pending] = useActionState(translateDocumentRows, initialState);
  const ru = locale === "ru";
  const link = `/admin/documents/${batch.documentId}/view${batch.page ? `?page=${batch.page}` : ""}`;
  const translations = new Map(state.rows.map(row => [row.id, row]));
  return <li className="document-translation__batch">
    <strong>{name} · {batch.page ? `${ru ? "стр." : "page"} ${batch.page}` : ru ? "страница не установлена" : "page unavailable"} · {ru ? "строки" : "rows"} {batch.startIndex + 1}–{batch.startIndex + batch.rows.length}</strong>
    <form action={action}>
      <input type="hidden" name="case_id" value={caseId} /><input type="hidden" name="document_id" value={batch.documentId} />
      <input type="hidden" name="page" value={batch.page} /><input type="hidden" name="batch_index" value={batch.batchIndex} />
      <input type="hidden" name="batch_token" value={batch.token} /><input type="hidden" name="locale" value={locale} />
      <button className="button button--secondary button--compact" disabled={pending} type="submit">{pending ? (ru ? "Переводим…" : "Translating…") : (ru ? "Перевести строки" : "Translate rows")}</button>
    </form>
    {state.message ? <p aria-live="polite" className={`form-message form-message--${state.status}`}>{state.message}</p> : null}
    {state.status === "success" ? <ol className="document-translation__rows">{batch.rows.map(source => {
      const translated = translations.get(source.id);
      if (!translated) return null;
      const original = [source.section, source.label, source.value, source.alternateValue].filter((value): value is string => value !== null).join(" · ");
      const translation = [translated.sectionRu, translated.labelRu, translated.valueRu, translated.alternateValueRu].filter((value): value is string => value !== null).join(" · ");
      return <li key={source.id}>
        <div><small>{ru ? "Оригинал" : "Original"}</small><p lang={translated.sourceLanguage === "und" ? undefined : translated.sourceLanguage}>{original}</p></div>
        <div><small>{ru ? "Рабочий перевод · язык предположен" : "Working translation · language estimated"}: {translated.sourceLanguage}</small><p lang="ru">{translation}</p></div>
        <Link href={link} target="_blank">{ru ? "Открыть исходную страницу" : "Open source page"}</Link>
      </li>;
    })}</ol> : null}
  </li>;
}

export function DocumentTranslationPanel({ caseId, locale, picture, batches }: { caseId: string; locale: "ru" | "en"; picture: CaseAnalyticalPicture; batches: TranslationBatch[] }) {
  const ru = locale === "ru";
  const names = new Map(picture.documents.filter(row => row.status === "ready").map(row => [row.id, row.name ?? row.id]));
  const visibleBatches = batches.filter(batch => names.has(batch.documentId));
  return <section className="document-translation" aria-label={ru ? "Внутренний перевод документов" : "Internal document translation"}>
    <h3>{ru ? "Анхам · перевод документов для Карен" : "Anham · document translation for Karen"}</h3>
    <p>{ru ? "Выберите фрагмент. Оригинал и страница остаются рядом с машинным переводом. Это помощь для чтения, а не подтверждение факта: цифры, единицы, статус проверки и хронология не меняются. Язык определяется приблизительно для каждой строки." : "Choose an excerpt. The original and source page remain beside the machine translation. This helps reading; it does not verify facts or change numbers, units, review status or the timeline. Language is estimated for each row."}</p>
    {visibleBatches.length ? <details><summary>{ru ? "Показать страницы и строки" : "Show pages and rows"} ({visibleBatches.length})</summary><ul className="status-list">{visibleBatches.map(batch => <TranslationBatchView key={`${batch.documentId}-${batch.page}-${batch.batchIndex}`} caseId={caseId} locale={locale} batch={batch} name={names.get(batch.documentId)!} />)}</ul></details> : <p className="empty-state">{ru ? "В готовых документах пока нет сохранённых строк для перевода." : "No saved rows in ready documents are available for translation yet."}</p>}
  </section>;
}
