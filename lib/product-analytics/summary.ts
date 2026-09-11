import { getFounderState } from "@/lib/auth/require-founder";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { analyticsEnabled } from "./session";
import { analyticsPeriod } from "./contract";

// This adapter exposes links only, not a claim of provider connectivity or observed recordings.
export function providerLinks() {
  const links: { kind: string; url: string; status: "configured_link_only" }[] = [];
  for (const [kind, raw] of [["heatmaps", process.env.PRODUCT_ANALYTICS_HEATMAP_URL], ["recordings", process.env.PRODUCT_ANALYTICS_RECORDINGS_URL]]) {
    try {
      const url = new URL(raw ?? "");
      if (url.protocol !== "https:" || !["us.posthog.com", "eu.posthog.com", "app.posthog.com", "clarity.microsoft.com"].includes(url.hostname) || url.username || url.password || url.search || url.hash) continue;
      links.push({ kind: kind!, url: url.toString(), status: "configured_link_only" });
    } catch { /* Missing/invalid configuration is not connectivity. */ }
  }
  return links;
}

type Period = NonNullable<ReturnType<typeof analyticsPeriod>>;
async function readWindow(start: string, end: string) {
  let db: ReturnType<typeof createSupabaseServiceClient>;
  try { db = createSupabaseServiceClient(); } catch { db = null; }
  if (!db) return { start, end, status: "unavailable" as const, operational: null, funnel: null };
  const definitions = [
    ["client_profiles_created", "profiles", "created_at", "role", "client"],
    ["onboarding_submissions", "onboarding_submissions", "submitted_at", null, null],
    ["client_case_messages", "case_messages", "created_at", "sender_role", "client"],
    ["stored_assistant_user_messages", "assistant_messages", "created_at", "role", "user"]
  ] as const;
  const operational = await Promise.all(definitions.map(async ([metric, table, time, filter, value]) => {
    try {
      let query = db.from(table).select("id", { count: "exact", head: true }).gte(time, start).lt(time, end);
      if (filter) query = query.eq(filter, value);
      const result = await query;
      return { metric, source: `${table}.${time}`, unit: "rows", status: result.error || result.count === null ? "unavailable" : "ready", value: result.error ? null : result.count };
    } catch { return { metric, source: `${table}.${time}`, unit: "rows", status: "unavailable", value: null }; }
  }));
  try {
    const { data, error } = await db.rpc("product_analytics_summary", { p_start: start, p_end: end });
    return { start, end, status: "ready", operational, funnel: error || !data ? { status: "unavailable" } : { status: "ready", source: "product_events", ...data } };
  } catch { return { start, end, status: "ready", operational, funnel: { status: "unavailable" } }; }
}

// Authorization is inside the data boundary, shared by HTTP and the staff prompt.
// No user-supplied SQL, provider credentials, raw rows, identifiers or case payloads.
export async function getProductAnalytics(period?: Period) {
  const auth = await getFounderState();
  if (auth.status !== "authorized") return { status: "forbidden" as const };
  const now = new Date();
  const selected = period ?? analyticsPeriod(null, null, now)!;
  const [current, previous, last7days] = await Promise.all([
    readWindow(selected.start, selected.end),
    readWindow(selected.previousStart, selected.start),
    readWindow(new Date(now.getTime() - 7 * 86400000).toISOString(), now.toISOString())
  ]);
  const links = providerLinks();
  const heatmapsConfigured = analyticsEnabled() && process.env.NEXT_PUBLIC_POSTHOG_HEATMAPS_ENABLED === "true" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) && ["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "");
  return {
    status: "authorized" as const, generatedAt: now.toISOString(), timezone: "UTC",
    collection: analyticsEnabled() ? "enabled_configuration_only" : "disabled",
    current, previous, last7days,
    eventDefinitions: {
      landing_view: "Public home rendered after consent (browser-reported)",
      registration_started: "Sign-up tab displayed (browser-reported)",
      registration_completed: "New account returned by successful signUp; email confirmation may still be pending",
      onboarding_view: "Authenticated contact/consent onboarding page rendered (browser-reported)",
      onboarding_completed: "Contact/consent onboarding successfully saved; not completion of the separate health questionnaire",
      cabinet_view: "Authenticated cabinet route rendered (includes health questionnaire)",
      chat_completed: "Successful non-transient Anham response to a signed-in client; not a message to Karen"
    },
    provider: { status: heatmapsConfigured ? "configured_unverified" : links.length ? "configured_link_only" : "not_connected", heatmapCapture: heatmapsConfigured ? "configured_unverified" : "disabled", links, recordingsCapturedByThisIntegration: false },
    limitations: ["Operational counts are rows, not a cohort or unique clients.", "Funnel includes consenting browser journeys only; no cross-device identity stitching.", "Ordered steps must all occur before the period end; recent journeys are right-censored.", "Browser views can be blocked or forged; server completion events follow successful actions.", "No historical page views are reconstructed. First observed event does not prove uninterrupted collection.", "Retention is 90 days; UTC intervals are start-inclusive/end-exclusive."]
  };
}

// Keep day-by-day detail on the HTTP endpoint; avoid sending hundreds of rows
// with every unrelated founder question. Only aggregates reach the LLM.
export function analyticsPromptContext(summary: Awaited<ReturnType<typeof getProductAnalytics>>) {
  if (summary.status !== "authorized") return summary;
  return JSON.parse(JSON.stringify(summary, (key, value) => key === "daily" ? undefined : value));
}
