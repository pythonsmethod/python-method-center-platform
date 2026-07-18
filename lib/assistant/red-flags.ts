import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RedFlagCategory = "physical" | "psychological";

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

// Records the escalation per RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1:
// physical/medical routes to Karen, psychological/crisis routes to support.
// This is a transient priority marker only — never case urgency or status.
// Fails soft: a logging failure must never break the safety reply itself.
export async function recordRedFlagEvent(input: {
  category: RedFlagCategory;
  messageExcerpt: string;
  profileId: string | null;
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

  await supabase.from("escalation_events").insert({
    profile_id: input.profileId,
    case_id: caseId,
    category:
      input.category === "physical" ? "physical_medical" : "psychological_crisis",
    routing_target: input.category === "physical" ? "karen" : "support",
    status: "open",
    requires_immediate_review: true,
    signals: {
      source: "client_ai_chat",
      detected_by: "assistant",
      message_excerpt: input.messageExcerpt.slice(0, 600)
    }
  });
}
