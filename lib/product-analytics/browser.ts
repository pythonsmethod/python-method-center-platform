import type { ProductEvent } from "./contract";
let allowed = false;
export function setBrowserAnalyticsConsent(value: boolean) { allowed = value; }

// Events have no text, URLs, queries, referrer, account IDs or arbitrary properties.
export function trackProductEvent(event: ProductEvent, locale: "ru" | "en") {
  if (typeof window === "undefined" || !allowed) return;
  void fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, locale }), keepalive: true }).catch(() => undefined);
}
