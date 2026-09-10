"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";

export function AssistantOutreachPreference({ locale }: { locale: Locale }) {
  const [optedOut, setOptedOut] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/assistant/outreach", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Preference unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) {
          // A slow initial GET must not undo a successful stop click.
          setOptedOut((previous) => previous || data.optedOut === true);
        }
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);

  async function stop() {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/assistant/outreach", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optedOut: true })
      });
      if (!response.ok) throw new Error("Preference unavailable");
      setOptedOut(true);
    } catch { setFailed(true); }
    finally { setPending(false); }
  }

  return (
    <div>
      {optedOut ? (
        <p role="status">{locale === "ru" ? "Автоматические сообщения Анхама отключены." : "Anham’s automatic messages are off."}</p>
      ) : (
        <button type="button" disabled={pending} onClick={() => void stop()}>
          {pending
            ? locale === "ru" ? "Сохраняем…" : "Saving…"
            : locale === "ru" ? "Отключить автоматические сообщения Анхама" : "Turn off Anham’s automatic messages"}
        </button>
      )}
      {failed ? <p role="alert">{locale === "ru" ? "Не удалось загрузить или сохранить настройку. Попробуйте ещё раз." : "Could not load or save your preference. Please try again."}</p> : null}
    </div>
  );
}
