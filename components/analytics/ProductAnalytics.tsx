"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_DENIED_COOKIE, JOURNEY_MAX_AGE, pageEvent } from "@/lib/product-analytics/contract";
import { setBrowserAnalyticsConsent, trackProductEvent } from "@/lib/product-analytics/browser";
import { startLandingHeatmaps } from "@/lib/product-analytics/heatmaps";

export function ProductAnalytics({ enabled, initialConsent, locale }: { enabled: boolean; initialConsent: boolean | null; locale: "ru" | "en" }) {
  const [consent, setConsent] = useState(initialConsent);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const path = usePathname();
  const ru = locale === "ru";

  useEffect(() => {
    setBrowserAnalyticsConsent(enabled && consent === true);
    if (!enabled || consent !== true) return;
    window.dispatchEvent(new Event("pm-analytics-consent-changed"));
    const event = pageEvent(path);
    if (event) trackProductEvent(event, locale);
    // Heatmap module loads only for the public landing; no replay is ever enabled.
    if (event === "landing_view") return startLandingHeatmaps(locale);
  }, [path, enabled, consent, locale]);

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("pm-analytics-consent");
    channel.onmessage = (message: MessageEvent<unknown>) => {
      if (typeof message.data === "boolean") setConsent(message.data);
    };
    return () => channel.close();
  }, [enabled]);

  async function choose(granted: boolean) {
    setBusy(true); setFailed(false);
    if (!granted) {
      // Denial can only remove permission, so it may be written immediately.
      // Even if the endpoint is down, server actions and the next load stop capture.
      document.cookie = `${CONSENT_DENIED_COOKIE}=1; Path=/; Max-Age=${JOURNEY_MAX_AGE}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      setBrowserAnalyticsConsent(false); setConsent(false);
    }
    try {
      const result = await fetch("/api/analytics/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ granted }) });
      if (!result.ok) throw new Error();
      setConsent(granted);
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("pm-analytics-consent");
        channel.postMessage(granted); channel.close();
      }
    } catch { setFailed(true); } finally { setBusy(false); }
  }

  if (!enabled || path.startsWith("/admin")) return null;
  return <aside className="product-analytics-consent" aria-label={ru ? "Настройки аналитики" : "Analytics preferences"}>
    {consent === null ? <>
      <p>{ru ? "Помочь улучшить сайт? С вашего согласия мы на 30 дней сохраним случайный код браузера и шаги пути. Если PostHog подключён, ему передаются клики на главной странице для тепловой карты. Содержание форм и чатов, документы и записи сессий не собираются." : "Help improve the site? With your consent, we keep a random browser code and journey steps for 30 days. If PostHog is connected, landing-page clicks are sent to it for heatmaps. Form and chat contents, documents and session recordings are not collected."}</p>
      <button type="button" disabled={busy} onClick={() => void choose(true)}>{ru ? "Разрешить аналитику" : "Allow analytics"}</button>{" "}
      <button type="button" disabled={busy} onClick={() => void choose(false)}>{ru ? "Отказаться" : "Decline"}</button>
    </> : <button type="button" disabled={busy} onClick={() => void choose(!consent)}>{consent ? (ru ? "Отключить аналитику" : "Disable analytics") : (ru ? "Разрешить аналитику" : "Allow analytics")}</button>}
    {failed && <p role="alert">{ru ? "Не удалось сохранить выбор. Попробуйте ещё раз." : "Could not save your choice. Please try again."}</p>}
  </aside>;
}
