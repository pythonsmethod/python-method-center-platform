import { createHash } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { truncateExcerpt } from "@/lib/notifications/format";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";

export type RedFlagCategory = "physical" | "psychological";

// How the crisis was noticed: the model's own marker, the deterministic
// screen over the person's message, or both agreeing.
export type RedFlagSource = "marker" | "deterministic" | "both";

const markerPattern = /\[RED_FLAG:(physical|psychological)\]/gi;

// The client assistant is instructed to append a [RED_FLAG:...] marker when
// its emergency protocol triggers. The marker is machine-readable metadata:
// it is stripped before the reply reaches the visitor.
export function extractRedFlag(reply: string): {
  cleanedReply: string;
  category: RedFlagCategory | null;
} {
  let category: RedFlagCategory | null = null;

  const cleanedReply = reply
    .replace(markerPattern, (_match, kind: string) => {
      category ??= kind.toLowerCase() as RedFlagCategory;
      return "";
    })
    .trim();

  return { cleanedReply, category };
}

// P1-04: the marker is one strand — the model appending a token sequence.
// A prompt injection, a long multi-topic message or an unusual language can
// snap it. This screen reads the PERSON'S message, not the model's output,
// so the safety net has a second, deterministic strand.
//
// Tuned deliberately toward false positives: a spurious alert costs the
// team thirty seconds; a missed crisis costs far more. Patterns are scoped
// to first-person crisis language, not to any mention of a symptom word.
const CRISIS_PATTERNS_PSYCHOLOGICAL: RegExp[] = [
  /не\s+хочу\s+(больше\s+)?жить/i,
  /не\s+вижу\s+смысла\s+жить/i,
  /покончить\s+с\s+собой/i,
  /покончу\s+с\s+собой/i,
  /суицид/i,
  /убить\s+себя/i,
  /убью\s+себя/i,
  /свести\s+счёты\s+с\s+жизнью/i,
  /наложить\s+на\s+себя\s+руки/i,
  /причинить\s+себе\s+вред/i,
  /режу\s+себя/i,
  /kill\s+myself/i,
  /end\s+my\s+life/i,
  /suicid/i,
  /self.?harm/i,
  /hurt\s+myself/i,
  /don'?t\s+want\s+to\s+live/i,
  /no\s+reason\s+to\s+live/i
];

const CRISIS_PATTERNS_PHYSICAL: RegExp[] = [
  /боль\s+в\s+груди/i,
  /давит\s+в\s+груди/i,
  /не\s+могу\s+дышать/i,
  /нечем\s+дышать/i,
  /задыхаюсь/i,
  /теряю\s+сознание/i,
  /потерял[аи]?\s+сознание/i,
  /сильное\s+кровотечение/i,
  /кровотечение\s+не\s+останавливается/i,
  /рвота\s+с\s+кровью/i,
  /кровь\s+в\s+рвоте/i,
  /немеет\s+(рука|лицо|нога|половина)/i,
  /онемел[аио]?\s+(рука|лицо|нога|половина)/i,
  /перекосило\s+лицо/i,
  /нарушилась\s+речь/i,
  /chest\s+pain/i,
  /can'?t\s+breathe/i,
  /cannot\s+breathe/i,
  /losing\s+consciousness/i,
  /passed\s+out/i,
  /severe\s+bleeding/i,
  /vomiting\s+blood/i,
  /face\s+droop/i,
  /slurred\s+speech/i
];

// Reads the person's own words. Physical wins a tie: a medical emergency
// with psychological language still needs the ambulance first.
export function detectRedFlagInMessage(
  message: string
): RedFlagCategory | null {
  if (CRISIS_PATTERNS_PHYSICAL.some((pattern) => pattern.test(message))) {
    return "physical";
  }

  if (CRISIS_PATTERNS_PSYCHOLOGICAL.some((pattern) => pattern.test(message))) {
    return "psychological";
  }

  return null;
}

// Combines the two strands. The model's marker carries context, so its
// category wins when both fire; the deterministic screen guarantees the
// escalation exists even when the marker was suppressed or forgotten.
export function resolveRedFlag(
  markerCategory: RedFlagCategory | null,
  userMessage: string
): { category: RedFlagCategory; source: RedFlagSource } | null {
  const detected = detectRedFlagInMessage(userMessage);

  if (markerCategory && detected) {
    return { category: markerCategory, source: "both" };
  }

  if (markerCategory) {
    return { category: markerCategory, source: "marker" };
  }

  if (detected) {
    return { category: detected, source: "deterministic" };
  }

  return null;
}

// The row exactly as it is inserted. Extracted so a test can pin the shape
// — including profile_id staying null for a guest — without a database.
export function buildEscalationInsert(
  input: {
    category: RedFlagCategory;
    messageExcerpt: string;
    profileId: string | null;
    source?: RedFlagSource;
  },
  caseId: string | null
) {
  return {
    profile_id: input.profileId,
    case_id: caseId,
    category:
      input.category === "physical" ? "physical_medical" : "psychological_crisis",
    routing_target: input.category === "physical" ? "karen" : "support",
    status: "open",
    requires_immediate_review: true,
    signals: {
      source: "client_ai_chat",
      detected_by: input.source ?? "marker",
      message_excerpt: input.messageExcerpt.slice(0, 600)
    }
  };
}

// Deterministic: the same failing situation on the same day produces the
// same key, so repeats collapse in the dedupe ledger instead of flooding
// the notification health view. Date.now() made every repeat unique.
export function buildInsertFailureDedupeKey(
  category: RedFlagCategory,
  messageExcerpt: string,
  dayKey: string
): string {
  const digest = createHash("sha256")
    .update(messageExcerpt.slice(0, 600))
    .digest("hex")
    .slice(0, 16);

  return `red-flag-insert-failed:${category}:${digest}:${dayKey}`;
}

// Records the escalation per RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1:
// physical/medical routes to Karen, psychological/crisis routes to support.
// This is a transient priority marker only — never case urgency or status.
// Fails soft: a logging failure must never break the safety reply itself.
export async function recordRedFlagEvent(input: {
  category: RedFlagCategory;
  messageExcerpt: string;
  profileId: string | null;
  profileEmail?: string | null;
  source?: RedFlagSource;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  let caseId: string | null = null;

  if (input.profileId) {
    const { data: caseRow } = await supabase
      .from("client_cases")
      .select("id")
      .eq("profile_id", input.profileId)
      .maybeSingle();

    caseId = caseRow?.id ?? null;
  }

  const { data: event, error: insertError } = await supabase
    .from("escalation_events")
    .insert(buildEscalationInsert(input, caseId))
    .select("id, created_at")
    .single();

  if (insertError || !event) {
    // The DB record failed — still push the external alert so the team
    // learns about the situation, and flag the processing failure.
    await notifyTeam({
      kind: "processing_error",
      dedupeKey: buildInsertFailureDedupeKey(
        input.category,
        input.messageExcerpt,
        new Date().toISOString().slice(0, 10)
      ),
      title: "ОШИБКА ОБРАБОТКИ: красный флаг не записан в базу",
      lines: [
        `Категория: ${input.category === "physical" ? "физический/медицинский" : "психологический кризис"}`,
        `Ошибка: ${insertError?.message ?? "неизвестно"}`,
        "Проверьте ситуацию вручную — событие требует проверки."
      ],
      link: adminLink()
    });
    return;
  }

  // External alert (P0-1). The DB row alone is not "delivered" — the team
  // must actually be pinged. Excerpt is truncated: no full medical details
  // leave the platform.
  await notifyTeam({
    kind: "red_flag",
    dedupeKey: `red_flag:${event.id}`,
    title:
      input.category === "physical"
        ? "🔴 КРАСНЫЙ ФЛАГ — физический/медицинский → Professor Python"
        : "🔴 КРАСНЫЙ ФЛАГ — психологический кризис → поддержка",
    lines: [
      `Событие: ${event.id}`,
      input.profileId
        ? `Клиент: ${input.profileEmail ?? input.profileId}${caseId ? ` · кейс ${caseId}` : ""}`
        : "Клиент: гость сайта (не в системе — связаться нельзя)",
      "Приоритет: немедленная проверка (requires_immediate_review)",
      `Время: ${event.created_at}`,
      truncateExcerpt(input.messageExcerpt)
        ? `Фрагмент: «${truncateExcerpt(input.messageExcerpt)}»`
        : null,
      "Событие требует проверки в панели красных флагов."
    ],
    link: adminLink("/admin")
  });
}
