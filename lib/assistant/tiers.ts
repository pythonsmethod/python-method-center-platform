import { assistantSource, renderSourceContext, type AssistantSource } from "@/lib/assistant/source-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { hasFullClientAssistantPreview } from "./client-voice-pilot";

// Three levels of the client-facing assistant:
//   guest      — public site: only the center, the method, registration,
//                tariffs and the first step. Cheapest, narrowest.
//   registered — after sign-up: accompanies the person inside their cabinet,
//                aware of their own case status and what is missing.
//   client     — active support or owner-granted assistant preview: own case,
//                the published recommendations of Professor Python.
export type AssistantTier = "guest" | "registered" | "client";

export function isPaidSupportProduct(product: unknown): boolean {
  return product === "support_5_weeks" || product === "support_15_weeks";
}

export type AssistantAudience = {
  fullPreview?: boolean;
  tier: AssistantTier;
  profileId: string | null;
  email: string | null;
  // The person's case, when they already have one — saved conversations are
  // attached to it so the team sees them next to the rest of the case.
  caseId: string | null;
  // Human-readable snapshot of the person's own journey, injected into the
  // system prompt for registered and paying clients only.
  context: string | null;
  sources: AssistantSource[];
};

// Cheap tier check for the interface only: decides which greeting and which
// name the chat window shows. The answer itself is always built from the
// full resolver below, on the server.
export async function resolveAssistantTierForUi(): Promise<AssistantTier> {
  try {
    const auth = await createSupabaseServerClient();

    if (!auth) {
      return "guest";
    }

    const {
      data: { user }
    } = await auth.auth.getUser();

    if (!user) {
      return "guest";
    }

    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return "registered";
    }

    const { data } = await supabase
      .from("service_periods")
      .select("product")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .in("product", ["support_5_weeks", "support_15_weeks"])
      .limit(1);

    return hasFullClientAssistantPreview(user) || (data ?? []).some((row) => isPaidSupportProduct(row.product))
      ? "client"
      : "registered";
  } catch {
    return "guest";
  }
}

// Resolves who is asking and builds their personal context in one pass.
// Never throws: on any failure the visitor is treated as a guest, which is
// the safest (narrowest) tier.
export async function resolveAssistantAudience(accessToken?: string | null): Promise<AssistantAudience> {
  const guest: AssistantAudience = {
    tier: "guest",
    profileId: null,
    email: null,
    caseId: null,
    context: null,
    sources: []
  };

  try {
    const auth = await createSupabaseServerClient(accessToken);

    if (!auth) {
      return guest;
    }

    const {
      data: { user }
    } = await auth.auth.getUser(accessToken || undefined);

    if (!user) {
      return guest;
    }

    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return {
        tier: "registered",
        profileId: user.id,
        email: user.email ?? null,
        caseId: null,
        context: null,
        sources: []
      };
    }

    const [caseResult, periodsResult] = await Promise.all([
      supabase
        .from("client_cases")
        .select("id, case_number, direction, created_at")
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase
        .from("service_periods")
        .select("product, status, starts_at, ends_at")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: false })
    ]);

    const retrievedAt = new Date().toISOString();
    const caseRow = caseResult.error ? null : caseResult.data;
    const activePeriods = periodsResult.error ? [] : periodsResult.data ?? [];
    const hasPaidSupport = activePeriods.some((row) => isPaidSupportProduct(row.product));
    const fullPreview = hasFullClientAssistantPreview(user);
    const sources: AssistantSource[] = [
      assistantSource({ id: "account", kind: "system_record", origin: "authenticated session", availability: "available", retrievedAt, freshness: "current_snapshot", scope: "authenticated account only", data: { email: user.email ?? null } }),
      assistantSource({ id: "case", kind: "system_record", origin: "client_cases", availability: caseResult.error ? "unavailable" : caseRow ? "available" : "absent", retrievedAt, recordedAt: caseRow?.created_at ?? null, freshness: "current_snapshot", scope: "own Case metadata; not processing classification", data: caseRow ? { id: caseRow.id, created_at: caseRow.created_at, direction: caseRow.direction } : null }),
      assistantSource({ id: "active_support", kind: "system_record", origin: "service_periods", availability: periodsResult.error ? "unavailable" : activePeriods.length ? "available" : "absent", retrievedAt, freshness: "current_snapshot", scope: "own active service periods; NOT proof of payment", data: activePeriods }),
      assistantSource({ id: "payments", kind: "system_record", origin: "payments", availability: "not_connected", retrievedAt, scope: "payments not queried in client chat", data: null })
    ];

    if (fullPreview) sources.push(assistantSource({ id: "assistant_preview", kind: "system_record", origin: "owner-managed client assistant preview", availability: "available", retrievedAt, scope: "assistant capabilities only; NOT proof of payment or active support", data: { full_client_assistant_preview: true } }));

    if (caseRow) {
      const [documentsResult, eventsResult, periodResult] = await Promise.all([
        supabase.from("uploaded_documents").select("id, original_filename, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("case_lifecycle_events").select("event_type, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("service_periods").select("product, status, starts_at, ends_at").eq("case_id", caseRow.id).order("starts_at", { ascending: false }).limit(1)
      ]);
      for (const [id, origin, result, scope] of [
        ["documents", "uploaded_documents", documentsResult, "metadata_only; up to 20 latest own Case documents; sample_count is NOT total; contents not read"],
        ["events", "case_lifecycle_events", eventsResult, "up to 10 latest own Case events; not proof of any action by this chat"],
        ["support_history", "service_periods", periodResult, "latest own Case service period; unknown product codes remain unknown"]
      ] as const) {
        const rows = result.error ? [] : result.data ?? [];
        sources.push(assistantSource({ id, kind: "system_record", origin, availability: result.error ? "unavailable" : rows.length ? "available" : "absent", retrievedAt, freshness: "current_snapshot", scope, data: { sample_count: rows.length, rows } }));
      }
    }
    return {
      tier: hasPaidSupport || fullPreview ? "client" : "registered",
      fullPreview,
      profileId: user.id,
      email: user.email ?? null,
      caseId: caseRow?.id ?? null,
      context: renderSourceContext(sources),
      sources
    };
  } catch {
    return guest;
  }
}
