"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveCasePictureNote, type PictureNoteActionState } from "@/lib/analytical-picture/actions";
import type { CaseAnalyticalPicture } from "@/lib/analytical-picture";

const initialState: PictureNoteActionState = { status: "idle", message: "" };

export function CaseAnalyticalPicturePanel({ caseId, locale, result, canConfirm }: {
  caseId: string;
  locale: "ru" | "en";
  result: { status: "ready"; picture: CaseAnalyticalPicture } | { status: "unavailable"; message: string };
  canConfirm: boolean;
}) {
  const [state, action, pending] = useActionState(saveCasePictureNote, initialState);
  const ru = locale === "ru";
  const t = ru ? {
    aria: "Целостная картина данных клиента", label: "Анхам · вся доступная информация", title: "Целостная картина кейса",
    intro: "Сводка доказательств из всех доступных документов. Это не диагноз и не решение Карен.", unavailable: "Слой данных пока недоступен",
    documents: "Документы и источники", facts: "Хронология фактов", extracted: "Извлечённые клинические свидетельства", extractedIntro: "Сохранённые прочтения документов. Количество строк не является количеством проверенных клинических фактов.", comparisons: "Сравнения по времени", conflicts: "Противоречия", missing: "Чего не хватает", review: "Требует проверки", notes: "Замечания Карен", noDocuments: "В кейсе нет доступных документов.", noFacts: "Структурированные факты пока отсутствуют. Документы перечислены выше и не считаются обработанными автоматически.", noComparisons: "Для обоснованного сравнения недостаточно сопоставимых датированных данных.", none: "Не выявлено в доступном структурированном слое.", open: "Открыть источник", dateMissing: "дата отсутствует", sourceOnly: "только источник", needsReview: "нужна проверка", potential: "возможное изменение", noChange: "подтверждённой динамики нет", notComparable: "несопоставимо", insufficient: "недостаточно данных", provenance: "Точность ссылки: документ; identity/header, страница и токены не подтверждены в этом сохранённом слое.", notePlaceholder: "Замечание к целостной картине…", saveDraft: "Сохранить черновик", confirm: "Подтвердить замечание", draft: "Черновик", confirmed: "Подтверждено Карен", limitations: "Границы",
  } : {
    aria: "Whole-client evidence picture", label: "Anham · all available information", title: "Whole-case picture",
    intro: "An evidence summary across all available documents. It is not a diagnosis or Karen's decision.", unavailable: "The data layer is not available yet",
    documents: "Documents and sources", facts: "Evidence timeline", extracted: "Extracted clinical evidence", extractedIntro: "Stored document readings. The row count is not a count of verified clinical facts.", comparisons: "Time comparisons", conflicts: "Contradictions", missing: "Missing context", review: "Requires review", notes: "Karen's notes", noDocuments: "No documents are available in this case.", noFacts: "No structured facts are available yet. Documents listed above are not treated as automatically processed.", noComparisons: "There are not enough comparable dated observations for an evidence-based comparison.", none: "None found in the available structured layer.", open: "Open source", dateMissing: "date unavailable", sourceOnly: "source only", needsReview: "review required", potential: "potential change", noChange: "no confirmed change", notComparable: "not comparable", insufficient: "insufficient data", provenance: "Reference precision: document level; identity/header, page and tokens are not confirmed in this stored layer.", notePlaceholder: "Note about the whole-case picture…", saveDraft: "Save draft", confirm: "Confirm note", draft: "Draft", confirmed: "Confirmed by Karen", limitations: "Boundaries",
  };

  if (result.status === "unavailable") return <section className="case-picture panel" aria-label={t.aria}><span className="panel__label">{t.label}</span><h2>{t.unavailable}</h2><p>{t.intro}</p></section>;
  const picture = result.picture;
  const comparisonLabel = (value: CaseAnalyticalPicture["comparisons"][number]["verdict"]) => value === "POTENTIAL_CHANGE" ? t.potential : value === "NO_CONFIRMED_CHANGE" ? t.noChange : value === "NOT_COMPARABLE" ? t.notComparable : t.insufficient;
  const reasonLabel = (code: CaseAnalyticalPicture["comparisons"][number]["reasonCode"]) => ({
    SIGNIFICANT_THRESHOLD: ru ? "Разница выше настроенного порога вариации; клиническое значение проверяет Карен." : "The difference exceeds the configured variation threshold; Karen reviews its clinical meaning.",
    BELOW_THRESHOLD: ru ? "Разница не превышает настроенный порог вариации." : "The difference does not exceed the configured variation threshold.",
    UNIT_MISMATCH: ru ? "Единицы или методы не позволяют безопасное сравнение." : "Units or methods do not allow a safe comparison.",
    MISSING_DATES: ru ? "Для сравнения отсутствуют необходимые даты." : "Required dates are missing from the comparison.",
    STALE_ANALYSIS: ru ? "После этого анализа появились более новые документы; вывод не используется." : "Newer documents exist after this analysis run, so its conclusion is not used.",
    INSUFFICIENT_EVIDENCE: ru ? "Недостаточно фактов, привязанных к текущему запуску анализа." : "Not enough facts are linked to the current analysis run.",
  }[code]);
  const missingLabel = (item: CaseAnalyticalPicture["missingContext"][number]) => ({
    NO_DOCUMENTS: ru ? "Нет доступных загруженных документов." : "No uploaded documents are available.",
    NO_STRUCTURED_FACTS: ru ? "Нет структурированных фактов из документов." : "No structured document facts are available.",
    MISSING_DATES: ru ? "У части фактов нет пригодной даты наблюдения." : "Some facts have no usable observation date.",
    ANALYSIS_REQUESTS: ru ? `Запросов на дополнительный контекст: ${item.count ?? 0}.` : `Requests for additional context: ${item.count ?? 0}.`,
    EXCLUDED_EVIDENCE: ru ? `Исключено из сравнения: ${item.count ?? 0}.` : `Excluded from comparison: ${item.count ?? 0}.`,
    PAGE_TOKEN_PROVENANCE: ru ? "В live-схеме пока нет точной ссылки на страницу и токены." : "The live schema does not yet store exact page/token provenance.",
    STALE_ANALYSIS: ru ? "Последний анализ старше загруженных документов." : "The latest analysis predates uploaded documents.",
  }[item.code]);
  const contradictionLabel = (item: CaseAnalyticalPicture["contradictions"][number]) => item.code === "IDENTITY_MISMATCH" ? (ru ? `Не совпадает идентичность документа: ${item.subject ?? "—"}.` : `Document identity mismatch: ${item.subject ?? "—"}.`) : (ru ? `Доказательство заблокировано для интерпретации${item.subject ? `: ${item.subject}` : ""}.` : `Evidence is blocked from interpretation${item.subject ? `: ${item.subject}` : ""}.`);
  const limitationLabel = (item: CaseAnalyticalPicture["limitations"][number]) => ({ NOT_DIAGNOSIS: ru ? "Это доказательная сводка, а не диагноз, медицинское сканирование или решение Карен." : "This is an evidence overview, not a diagnosis, medical scan or Karen's decision.", NO_CAUSALITY: ru ? "Последовательность и совместное наблюдение не доказывают причинность." : "Sequence and co-occurrence do not establish causality.", NO_LIVE_TRUST_PERSISTENCE: ru ? "В live-схеме ещё нет сохранённого Clinical Trust Decision; все факты требуют проверки." : "The live schema does not yet persist Clinical Trust Decisions; every fact requires review." }[item]);
  const statusLabel = (status: string) => ({ ready: ru ? "готов" : "ready", processing: ru ? "обрабатывается" : "processing", queued: ru ? "в очереди" : "queued", needs_reupload: ru ? "нужна повторная загрузка" : "re-upload required", failed: ru ? "ошибка обработки" : "processing failed", uploaded: ru ? "загружен" : "uploaded", pre_extracting: ru ? "предварительное чтение" : "pre-extraction", identity_mismatch: ru ? "не совпадает идентичность" : "identity mismatch" }[status] ?? (ru ? "неизвестное состояние" : "unknown state"));
  const categoryLabel = (category: CaseAnalyticalPicture["extractedEvidence"][number]["category"]) => ({ RADIOLOGY: ru ? "Радиология" : "Radiology", PATHOLOGY: ru ? "Патология" : "Pathology", PROCEDURE: ru ? "Процедура" : "Procedure", BIOMARKER: ru ? "Биомаркер" : "Biomarker", UNKNOWN: ru ? "Тип не определён" : "Unknown type" }[category]);

  return <section className="case-picture panel" aria-label={t.aria} id="case-picture">
    <span className="panel__label">{t.label}</span><h2>{t.title}</h2><p>{t.intro}</p>
    <div className="case-picture__grid">
      <section><h3>{t.documents}</h3>{picture.documents.length ? <ul className="status-list">{picture.documents.map((document) => <li key={document.id}><strong>{document.name ?? document.id}</strong> · {statusLabel(document.status)} <Link href={`/admin/documents/${document.id}/view`} target="_blank">{t.open}</Link></li>)}</ul> : <p className="empty-state">{t.noDocuments}</p>}</section>
      <section><h3>{t.facts}</h3>{picture.timeline.length ? <ol className="case-picture__timeline">{picture.timeline.map((fact) => <li key={fact.id}><time>{fact.observedAt ?? t.dateMissing}</time><strong>{fact.label}</strong>: {fact.originalValue}{fact.originalUnit ? ` ${fact.originalUnit}` : ""}{fact.reference ? ` · ${fact.reference}` : ""}<span className="case-picture__trust">{fact.trustState === "SOURCE_ONLY" ? t.sourceOnly : t.needsReview}</span>{fact.documentId ? <Link href={`/admin/documents/${fact.documentId}/view`} target="_blank">{t.open}</Link> : null}<small>{t.provenance}</small></li>)}</ol> : <p className="empty-state">{t.noFacts}</p>}</section>
      <section><h3>{t.extracted}</h3><p>{t.extractedIntro}</p>{picture.extractedEvidence.length ? <ul className="status-list">{picture.extractedEvidence.map((item) => <li key={item.id}><strong>{categoryLabel(item.category)} · {item.section} · {item.label}</strong><br />{item.value ?? "—"}{item.alternateValue !== null ? ` ↔ ${item.alternateValue}` : ""}<br /><span className="case-picture__trust">{item.trustState === "SOURCE_ONLY" ? t.sourceOnly : t.needsReview}</span>{item.disputeReason ? ` · ${item.disputeReason}` : ""} · <Link href={`/admin/documents/${item.documentId}/view`} target="_blank">{t.open}</Link><br /><small>{t.provenance}</small></li>)}</ul> : <p className="empty-state">{t.none}</p>}</section>
      <section><h3>{t.comparisons}</h3>{picture.comparisons.length ? <ul className="status-list">{picture.comparisons.map((item) => <li key={item.comparisonKey}><strong>{item.comparisonKey}: {comparisonLabel(item.verdict)}</strong><br />{reasonLabel(item.reasonCode)}<br /><small>{t.needsReview} · {item.evidenceFactIds.length} {ru ? "источн." : "evidence items"}</small></li>)}</ul> : <p className="empty-state">{t.noComparisons}</p>}</section>
      <section><h3>{t.conflicts}</h3>{picture.contradictions.length ? <ul>{picture.contradictions.map((item, index) => <li key={`${item.code}-${item.subject}-${index}`}>{contradictionLabel(item)}</li>)}</ul> : <p>{t.none}</p>}</section>
      <section><h3>{t.missing}</h3><ul>{picture.missingContext.map((item) => <li key={item.code}>{missingLabel(item)}</li>)}</ul></section>
      <section><h3>{t.review}</h3><p>{picture.reviewQueue.length} / {picture.timeline.length}</p></section>
    </div>
    <section className="case-picture__notes"><h3>{t.notes}</h3>{picture.notes.length ? <ul className="status-list">{picture.notes.map((note) => <li key={note.id}><strong>{note.state === "confirmed" ? t.confirmed : t.draft}</strong> · <time>{new Date(note.createdAt).toLocaleString(ru ? "ru-RU" : "en-US")}</time><br />{note.body}</li>)}</ul> : <p>{t.none}</p>}
      <form action={action}><input name="case_id" type="hidden" value={caseId} /><input name="locale" type="hidden" value={locale} /><textarea aria-label={t.notePlaceholder} maxLength={4000} name="body" placeholder={t.notePlaceholder} required rows={4} /><div className="panel-actions"><button className="button button--secondary" disabled={pending} name="review_state" value="draft">{t.saveDraft}</button>{canConfirm ? <button className="button" disabled={pending} name="review_state" value="confirmed">{t.confirm}</button> : null}</div></form>{state.message ? <p aria-live="polite" className={`form-message form-message--${state.status}`}>{state.message}</p> : null}
    </section>
    <details><summary>{t.limitations}</summary><ul>{picture.limitations.map((item) => <li key={item}>{limitationLabel(item)}</li>)}</ul></details>
  </section>;
}
