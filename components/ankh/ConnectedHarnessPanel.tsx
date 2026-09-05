import type { ConnectedHarnessRun } from "@/lib/ankh-harness/connected-pipeline";

export function ConnectedHarnessPanel({ run, locale }: { run: ConnectedHarnessRun; locale: "ru" | "en" }) {
  const ru = locale === "ru";
  const t = ru ? {
    eyebrow: "Ankh · изолированный in-memory контур", title: "Связный тестовый разбор", synthetic: "Только синтетические данные. Это не кейс №480, не диагноз и не решение Карен.", sources: "Источники", facts: "Структурированные свидетельства", missing: "Чего не хватает", review: "Что проверяет Карен", boundaries: "Границы", page: "стр.", reviewText: "Сверить каждое review-only свидетельство с указанным источником; разрешить противоречия и дополнить пропуски.", noWrites: "Внешние вызовы: 0. Записи: 0. Автоматически VERIFIED: 0.",
  } : {
    eyebrow: "Ankh · isolated in-memory environment", title: "Connected test analysis", synthetic: "Synthetic data only. This is not Case 480, a diagnosis, or Karen's decision.", sources: "Sources", facts: "Structured evidence", missing: "Missing context", review: "What Karen reviews", boundaries: "Boundaries", page: "p.", reviewText: "Compare every review-only item with its cited source, resolve contradictions, and complete missing context.", noWrites: "External calls: 0. Writes: 0. Automatically VERIFIED: 0.",
  };
  return <main className="shell shell--narrow"><section className="panel"><span className="panel__label">{t.eyebrow}</span><h1>{t.title}</h1><p>{t.synthetic}</p><p><strong>{t.noWrites}</strong></p></section>
    <section className="panel"><h2>{t.sources}</h2><ul className="status-list">{run.documents.map((doc) => <li key={doc.sourceDocumentId}><strong>{doc.sourceDocumentId}</strong> · {doc.documentType} · {doc.pageCount} {t.page} · {doc.providerVersion} / {doc.parserVersion}{doc.ambiguousType ? " · AMBIGUOUS" : ""}</li>)}</ul></section>
    <section className="panel"><h2>{t.facts}</h2><ol className="status-list">{run.packages.map((pack) => <li key={pack.packageId}><strong>{pack.fact.evidenceClass}</strong> · {pack.trustTransition.effective} · {t.page} {pack.immutableSource.page}<br />{String(pack.representations.extractedOriginal.text)}<br /><small>{pack.immutableSource.sourceDocumentId} · {pack.immutableSource.tokenProvenance?.level ?? (pack.immutableSource.region ? "P2" : "P1")}</small>{pack.contradictions.length ? <><br /><strong>{pack.contradictions.join(", ")}</strong></> : null}</li>)}</ol></section>
    <section className="panel"><h2>{t.missing}</h2><ul>{run.picture.missingContext.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section className="panel"><h2>{t.review}</h2><p>{run.picture.reviewQueue.length} / {run.picture.timeline.length}</p><p>{t.reviewText}</p></section>
    <section className="panel"><h2>{t.boundaries}</h2><ul>{run.picture.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section></main>;
}
