"use client";

import { useActionState } from "react";
import { runOcrSmoke } from "./actions";

export function SyntheticTest({ ru }: { ru: boolean }) {
  const [result, action, pending] = useActionState(runOcrSmoke, "");
  return <section>
    <h2>{ru ? "Проверка чтения искусственного документа" : "Synthetic document reading test"}</h2>
    <p>{ru ? "Один тестовый лист: ALPHA 12.34, BETA 0.05, GAMMA 1234. Запрос использует Google Document AI и может тарифицироваться как одна страница." : "One test page: ALPHA 12.34, BETA 0.05, GAMMA 1234. This Google Document AI request may be billed as one page."}</p>
    <form action={action}><button disabled={pending}>{pending ? (ru ? "Проверка…" : "Testing…") : (ru ? "Проверить Google OCR" : "Test Google OCR")}</button></form>
    {result && <pre aria-live="polite">{result}</pre>}
  </section>;
}
