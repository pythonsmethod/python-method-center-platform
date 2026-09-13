import type { CaptureResult, PostHog } from "posthog-js";
import { CONSENT_DENIED_COOKIE } from "./contract";

const isLanding = (path: string) => path === "/" || path === "/en" || path === "/en/";

// A positive allowlist at the last outbound boundary. SDK defaults and remote
// project settings cannot send replay, DOM text, identities or private routes.
export function sanitizeHeatmapEvent(event: CaptureResult | null, currentUrl: string): CaptureResult | null {
  if (!event) return null;
  const current = new URL(currentUrl);
  if (!isLanding(current.pathname) || !["$$heatmap", "$pageview"].includes(event.event)) return null;
  const cleanUrl = `${current.origin}${current.pathname}`;
  const props: Record<string, unknown> = { $current_url: cleanUrl, $pathname: current.pathname, $host: current.host, $process_person_profile: false, $geoip_disable: true, $ip: null };
  for (const key of ["distinct_id", "$session_id", "$window_id"]) {
    const value = event.properties[key];
    if (typeof value === "string" && /^[a-z0-9-]{1,80}$/i.test(value)) props[key] = value;
  }
  for (const key of ["$viewport_width", "$viewport_height"]) {
    const value = event.properties[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0 && value < 20000) props[key] = value;
  }
  if (event.event === "$$heatmap") {
    const input = event.properties.$heatmap_data;
    if (!input || typeof input !== "object") return null;
    const points: Record<string, unknown>[] = [];
    for (const [raw, rows] of Object.entries(input)) {
      let url: URL;
      try { url = new URL(raw); } catch { continue; }
      if (url.origin !== current.origin || url.pathname !== current.pathname || !Array.isArray(rows)) continue;
      for (const row of rows.slice(0, 1000)) {
        if (!row || !["click", "rageclick", "mousemove"].includes(row.type) || !Number.isFinite(row.x) || !Number.isFinite(row.y) || row.x < 0 || row.y < 0 || row.x > 20000 || row.y > 100000) continue;
        points.push({ x: row.x, y: row.y, type: row.type, target_fixed: row.target_fixed === true });
      }
    }
    if (!points.length) return null;
    props.$heatmap_data = { [cleanUrl]: points.slice(0, 1000) };
  }
  return { uuid: event.uuid, event: event.event, timestamp: event.timestamp, properties: props };
}

let sdk: PostHog | undefined;
export function startLandingHeatmaps(locale: "ru" | "en") {
  let active = true;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (process.env.NEXT_PUBLIC_POSTHOG_HEATMAPS_ENABLED !== "true" || !key || !["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(host ?? "") || !isLanding(window.location.pathname)) return () => undefined;
  void import("posthog-js").then(({ default: posthog }) => {
    if (!active || !isLanding(window.location.pathname)) return;
    const config = {
      api_host: host, persistence: "memory" as const, disable_persistence: true,
      autocapture: false, capture_pageview: false, capture_pageleave: false,
      capture_heatmaps: true, capture_dead_clicks: false, capture_exceptions: false,
      capture_performance: false, disable_session_recording: true, disable_surveys: true,
      disable_external_dependency_loading: true, disable_conversations: true, disable_product_tours: true,
      save_referrer: false, save_campaign_params: false, mask_all_text: true, mask_all_element_attributes: true,
      enable_recording_console_log: false, person_profiles: "never" as const,
      advanced_disable_flags: true, ip: false,
      request_batching: false,
      before_send: (event: CaptureResult | null) => active && !document.cookie.split("; ").includes(`${CONSENT_DENIED_COOKIE}=1`) ? sanitizeHeatmapEvent(event, window.location.href) : null
    };
    if (!sdk) sdk = posthog.init(key, config, "public_landing_heatmaps");
    else sdk.set_config(config);
    sdk?.opt_in_capturing({ captureEventName: false });
    sdk?.capture("$pageview", { locale });
  }).catch(() => undefined);
  return () => {
    active = false;
    sdk?.set_config({ capture_heatmaps: false });
    sdk?.heatmaps?.getAndClearBuffer();
    sdk?.stopSessionRecording();
    sdk?.opt_out_capturing();
  };
}
