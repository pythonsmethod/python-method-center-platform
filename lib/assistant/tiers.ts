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

// What the client's own assistant may read about money, and nothing more.
//
// The person asks "did my payment go through, and until when am I
// accompanied?" — answering that needs the recorded status and the recorded
// dates. It never needs `processor_reference`, the external transaction id,
// the metadata blob, or anything resembling card or bank data: those cannot
// help the answer and must not reach a model prompt at all.
const CLIENT_PAYMENT_FIELDS = "product, status, amount_cents, currency, paid_at, created_at";
// Recorded boundaries only. A period that is not stored stays unknown: an end
// date is never derived from a tariff, a duration or the date of a payment.
const CLIENT_SERVICE_PERIOD_FIELDS = "product, status, starts_at, ends_at";
// A bounded window of recent own records, not the person's whole ledger.
const CLIENT_RECORD_LIMIT = 20;

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

    const [caseResult, periodsResult, paymentsResult, ownPeriodsResult] = await Promise.all([
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
        .order("ends_at", { ascending: false }),
      // Own profile only, both times: the assistant of one person must never
      // be able to read another person's money records.
      supabase
        .from("payments")
        .select(CLIENT_PAYMENT_FIELDS)
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(CLIENT_RECORD_LIMIT),
      supabase
        .from("service_periods")
        .select(CLIENT_SERVICE_PERIOD_FIELDS)
        .eq("profile_id", user.id)
        .order("starts_at", { ascending: false })
        .limit(CLIENT_RECORD_LIMIT)
    ]);

    const retrievedAt = new Date().toISOString();
    const caseRow = caseResult.error ? null : caseResult.data;
    const activePeriods = periodsResult.error ? [] : periodsResult.data ?? [];
    // Rebuild each row field by field instead of forwarding what the query
    // returned. The select list above already narrows it, but then the
    // guarantee would live in a string: one added column, one view that
    // returns more than it used to, and a processor reference would reach a
    // model prompt. Named fields cannot drift that way.
    const payments = (paymentsResult.error ? [] : paymentsResult.data ?? []).map((row) => ({
      product: row.product, status: row.status, amount_cents: row.amount_cents,
      currency: row.currency, paid_at: row.paid_at, created_at: row.created_at
    }));
    const ownPeriods = (ownPeriodsResult.error ? [] : ownPeriodsResult.data ?? []).map((row) => ({
      product: row.product, status: row.status, starts_at: row.starts_at, ends_at: row.ends_at
    }));
    const hasPaidSupport = activePeriods.some((row) => isPaidSupportProduct(row.product));
    const fullPreview = hasFullClientAssistantPreview(user);
    const sources: AssistantSource[] = [
      assistantSource({ id: "account", kind: "system_record", origin: "authenticated session", availability: "available", retrievedAt, freshness: "current_snapshot", scope: "authenticated account only", data: { email: user.email ?? null } }),
      assistantSource({ id: "case", kind: "system_record", origin: "client_cases", availability: caseResult.error ? "unavailable" : caseRow ? "available" : "absent", retrievedAt, recordedAt: caseRow?.created_at ?? null, freshness: "current_snapshot", scope: "own Case metadata; not processing classification", data: caseRow ? { id: caseRow.id, created_at: caseRow.created_at, direction: caseRow.direction } : null }),
      assistantSource({ id: "active_support", kind: "system_record", origin: "service_periods", availability: periodsResult.error ? "unavailable" : activePeriods.length ? "available" : "absent", retrievedAt, freshness: "current_snapshot", scope: "own active service periods; NOT proof of payment", data: activePeriods }),
      // Payment history of this account. A recorded status is a system fact
      // about the record, never a medical or access conclusion — and a paid
      // status on its own does not open a support period.
      assistantSource({ id: "payments", kind: "system_record", origin: "payments", availability: paymentsResult.error ? "unavailable" : payments.length ? "available" : "absent", retrievedAt, freshness: "current_snapshot", scope: `own profile payments only; up to ${CLIENT_RECORD_LIMIT} latest; sample_count is NOT total; product/status/amount_cents/currency/paid_at/created_at only; no processor reference, transaction id, card or bank data; amount_cents is minor currency units; paid status is NOT proof of an active service period`, data: { sample_count: payments.length, rows: payments } }),
      // Recorded support periods of this account: the only place a start or
      // end date may come from.
      assistantSource({ id: "service_periods", kind: "system_record", origin: "service_periods", availability: ownPeriodsResult.error ? "unavailable" : ownPeriods.length ? "available" : "absent", retrievedAt, freshness: "current_snapshot", scope: `own profile service periods only; up to ${CLIENT_RECORD_LIMIT} latest; recorded starts_at/ends_at only, never calculated or extended; NOT proof of payment; absent means no period record was found, not that a payment is missing`, data: { sample_count: ownPeriods.length, rows: ownPeriods } })
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
