import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  detectKnowledgeGap,
  type GapAudience,
  type GapSignal,
  type GapTopic
} from "@/lib/assistant/escalation";
import { gapDraftSeed } from "@/lib/assistant/escalation-copy";

// Storage for the founder-only knowledge-gap centre.
//
// Everything here goes through the service role, because both tables are
// closed to anon and authenticated and carry no RLS policy of their own. No
// browser ever reads them: the workspace pages are founder-gated and render
// on the server.
//
// Writes never throw. A gap notification is valuable, but it is not worth
// failing a client's answer over — if the centre is unreachable the person
// still gets their reply and the gap is simply not recorded.

export type GapEvent = {
  id: string;
  topic: GapTopic;
  audience: GapAudience;
  escalationTarget: "karen" | "support" | "team" | "clarify";
  locale: "ru" | "en";
  knowledgeDraftId: string | null;
  createdAt: string;
  read: boolean;
};

type GapEventRow = {
  id: string;
  topic: GapTopic;
  audience: GapAudience;
  escalation_target: GapEvent["escalationTarget"];
  locale: "ru" | "en";
  knowledge_draft_id: string | null;
  created_at: string;
};

const EVENT_COLUMNS =
  "id, topic, audience, escalation_target, locale, knowledge_draft_id, created_at";

// One founder reading one screen. High enough to show a real pattern, low
// enough that the page stays a list rather than a log file.
const LIST_LIMIT = 100;

// How long one topic stays "already reported" before the same gap counts
// again. Without this a single popular missing answer would write one row
// per client message and drown every other gap on the page.
const DEDUPE_WINDOW_MINUTES = 60;

function toEvent(row: GapEventRow, readIds: ReadonlySet<string>): GapEvent {
  return {
    id: row.id,
    topic: row.topic,
    audience: row.audience,
    escalationTarget: row.escalation_target,
    locale: row.locale,
    knowledgeDraftId: row.knowledge_draft_id,
    createdAt: row.created_at,
    read: readIds.has(row.id)
  };
}

// An inactive placeholder in the existing knowledge base, one per topic, so
// the founder answers the gap where answers already live instead of in a
// notification screen that no assistant reads.
//
// is_active is false, so it can never reach a prompt before a human has
// written the real answer and switched it on. The seed text is generic by
// construction: it is derived from the enumerated topic alone and contains
// nothing from any conversation.
async function ensureKnowledgeDraft(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  topic: GapTopic
): Promise<string | null> {
  const seed = gapDraftSeed(topic);

  const { data: existing } = await supabase
    .from("assistant_knowledge")
    .select("id")
    .eq("title", seed.title)
    .eq("is_active", false)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data: created, error } = await supabase
    .from("assistant_knowledge")
    .insert({
      title: seed.title,
      content: seed.content,
      // Staff-only until a human decides otherwise: an unfinished draft that
      // was switched on by accident must not be able to reach a client.
      audience: "staff",
      collection: "general",
      is_active: false
    })
    .select("id")
    .maybeSingle();

  if (error || !created?.id) {
    return null;
  }

  return created.id as string;
}

/**
 * Records that Anham could not answer from available knowledge.
 *
 * Only the enumerated values of the signal are written. Never throws.
 */
export async function recordKnowledgeGap(
  signal: GapSignal
): Promise<{ status: "recorded" | "deduplicated" | "skipped" }> {
  try {
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return { status: "skipped" };
    }

    const since = new Date(
      Date.now() - DEDUPE_WINDOW_MINUTES * 60_000
    ).toISOString();

    const { data: recent } = await supabase
      .from("assistant_gap_events")
      .select("id")
      .eq("topic", signal.topic)
      .eq("audience", signal.audience)
      .eq("locale", signal.locale)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    if (recent?.id) {
      return { status: "deduplicated" };
    }

    const knowledgeDraftId = await ensureKnowledgeDraft(supabase, signal.topic);

    const { error } = await supabase.from("assistant_gap_events").insert({
      topic: signal.topic,
      audience: signal.audience,
      escalation_target: signal.escalationTarget,
      locale: signal.locale,
      knowledge_draft_id: knowledgeDraftId
    });

    return error ? { status: "skipped" } : { status: "recorded" };
  } catch {
    return { status: "skipped" };
  }
}

/**
 * The single call an assistant route makes after delivering an answer.
 *
 * Reads the question only to choose one enumerated topic, then forgets it.
 * Awaited deliberately rather than left floating: a serverless instance can
 * be frozen the moment the response is returned, and a dropped promise would
 * make the centre silently miss gaps under exactly the load that matters.
 * Never throws, so an unreachable centre cannot cost anyone their answer.
 */
export async function captureKnowledgeGap(input: {
  reply: string;
  question: string;
  audience: GapAudience;
  locale: "ru" | "en";
}): Promise<void> {
  try {
    const signal = detectKnowledgeGap(input);

    if (!signal) {
      return;
    }

    await recordKnowledgeGap(signal);
  } catch {
    // Recording a gap is never worth failing a delivered answer.
  }
}

async function readIdsFor(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  founderProfileId: string,
  eventIds: readonly string[]
): Promise<ReadonlySet<string>> {
  if (eventIds.length === 0) {
    return new Set<string>();
  }

  const { data } = await supabase
    .from("assistant_gap_reads")
    .select("gap_event_id")
    .eq("founder_profile_id", founderProfileId)
    .in("gap_event_id", eventIds as string[]);

  return new Set(
    ((data ?? []) as { gap_event_id: string }[]).map((row) => row.gap_event_id)
  );
}

export type GapListResult =
  | { status: "ready"; events: GapEvent[] }
  | { status: "error"; message: string };

/**
 * The founder's list, newest first, with this founder's own read marks.
 * Another founder's reading never changes what this one sees.
 */
export async function listGapEvents(
  founderProfileId: string
): Promise<GapListResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "error", message: "supabase-unavailable" };
  }

  const { data, error } = await supabase
    .from("assistant_gap_events")
    .select(EVENT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) {
    return { status: "error", message: error.message };
  }

  const rows = (data ?? []) as GapEventRow[];
  const readIds = await readIdsFor(
    supabase,
    founderProfileId,
    rows.map((row) => row.id)
  );

  return { status: "ready", events: rows.map((row) => toEvent(row, readIds)) };
}

export type GapEventResult =
  | { status: "ready"; event: GapEvent }
  | { status: "absent" }
  | { status: "error"; message: string };

export async function getGapEvent(
  eventId: string,
  founderProfileId: string
): Promise<GapEventResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "error", message: "supabase-unavailable" };
  }

  const { data, error } = await supabase
    .from("assistant_gap_events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!data) {
    return { status: "absent" };
  }

  const row = data as GapEventRow;
  const readIds = await readIdsFor(supabase, founderProfileId, [row.id]);

  return { status: "ready", event: toEvent(row, readIds) };
}

/**
 * Unread events for one founder. Fails soft to zero: a badge is never worth
 * breaking the workspace navigation for.
 */
export async function getGapUnreadCount(
  founderProfileId: string
): Promise<number> {
  try {
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return 0;
    }

    const { data, error } = await supabase.rpc("assistant_gap_unread_count", {
      p_founder_profile_id: founderProfileId
    });

    if (error) {
      return 0;
    }

    const value = Array.isArray(data) ? data[0] : data;

    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Idempotent: reading an already-read event is not an error. */
export async function markGapRead(
  eventId: string,
  founderProfileId: string
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("assistant_gap_reads")
    .upsert(
      { gap_event_id: eventId, founder_profile_id: founderProfileId },
      { onConflict: "gap_event_id,founder_profile_id", ignoreDuplicates: true }
    );

  return !error;
}

/**
 * Returns the event to the unread list for this founder only. The event row
 * itself is never touched — it is append-only audit material.
 */
export async function markGapUnread(
  eventId: string,
  founderProfileId: string
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("assistant_gap_reads")
    .delete()
    .eq("gap_event_id", eventId)
    .eq("founder_profile_id", founderProfileId);

  return !error;
}
