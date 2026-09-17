"use client";

import { useActionState } from "react";
import { runOcrSmoke, runRasterSmoke } from "./actions";

export function SyntheticTest({ ru }: { ru: boolean }) {
  const [result, action, pending] = useActionState(runOcrSmoke, "");
  const [stress, stressAction, stressPending] = useActionState(runRasterSmoke, "");
  return <section>
    <h2>{ru ? "Проверка чтения искусственного документа" : "Synthetic document reading test"}</h2>
    <p>{ru ? "Один тестовый лист: ALPHA 12.34, BETA 0.05, GAMMA 1234. Запрос использует Google Document AI и может тарифицироваться как одна страница." : "One test page: ALPHA 12.34, BETA 0.05, GAMMA 1234. This Google Document AI request may be billed as one page."}</p>
    <form action={action}><button disabled={pending}>{pending ? (ru ? "Проверка…" : "Testing…") : (ru ? "Проверить Google OCR" : "Test Google OCR")}</button></form>
    {result && <pre aria-live="polite">{result}</pre>}
    <p>{ru ? "Три искусственных скана: чёткая таблица, поворот на 3°, уменьшение и размытие. По 24 поля в каждом; до трёх тарифицируемых страниц." : "Three synthetic scans: clean table, 3° rotation, downsampling and blur. 24 fields each; up to three billable pages."}</p>
    <form action={stressAction}><button disabled={stressPending}>{stressPending ? (ru ? "Проверка сканов…" : "Testing scans…") : (ru ? "Испытать сложные сканы" : "Test challenging scans")}</button></form>
    {stress && <pre aria-live="polite">{stress}</pre>}
  </section>;
}
