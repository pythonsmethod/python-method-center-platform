"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";

// This is one logical knowledge system. Audience and source Case are metadata,
// not destinations chosen by the person. Nothing is sent to a client here.
export function UnifiedKnowledgePanel({ locale, candidate = "", caseId }: { locale: Locale; candidate?: string; caseId?: string }) {
  const [text, setText] = useState(candidate);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const requestId = useRef<string | null>(null);
  const ru = locale === "ru";
  useEffect(() => { setText(candidate); setMessage(""); requestId.current = null; }, [candidate, caseId]);
  const tooLong = text.length > 7200;
  async function save() {
    if (pending || !text.trim() || tooLong) return;
    setPending(true); setMessage(""); setFailed(false);
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/assistant/knowledge", { method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": locale }, body: JSON.stringify({ text, requestId: requestId.current, caseId: caseId ?? null, locale, confirmed: true }) });
      const data = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || data.saved !== true) throw new Error(data.error || (ru ? "Сохранение не подтверждено." : "Saving was not confirmed."));
      setMessage(ru ? "Сохранено в единую память Анхама. Клиентам не отправлено." : "Saved to Anham's unified knowledge. Not sent to clients.");
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : (ru ? "Ошибка сохранения." : "Could not save.")); }
    finally { setPending(false); }
  }
  return <details className="assistant-memory" open={Boolean(candidate)}>
    <summary>{ru ? "Единая память Анхама" : "Anham unified knowledge"}</summary>
    <p>{ru ? "Проверьте текст и подтвердите сохранение. Материал останется внутренним; он не становится автоматически рекомендацией для всех клиентов." : "Review the text and confirm saving. It stays internal and does not automatically become guidance for every client."}</p>
    <label className="field"><span>{ru ? "Материал для Анхама" : "Material for Anham"}</span>
      <textarea rows={5} value={text} disabled={pending} onChange={event => { setText(event.target.value); setMessage(""); requestId.current = null; }} />
    </label>
    {tooLong ? <p role="alert">{ru ? "Текст длиннее 7200 символов. Сократите его перед сохранением; ничего не будет обрезано автоматически." : "The text exceeds 7200 characters. Shorten it before saving; nothing will be silently truncated."}</p> : null}
    <button className="button" type="button" disabled={pending || !text.trim() || tooLong} onClick={() => void save()}>{pending ? (ru ? "Сохраняю…" : "Saving…") : (ru ? "Подтвердить сохранение в Анхам" : "Confirm save to Anham")}</button>
    {message ? <p role={failed ? "alert" : "status"}>{message}</p> : null}
  </details>;
}
