import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AssistantTier } from "@/lib/assistant/tiers";

// Conversations with the AI are kept only for people who have an account —
// registered visitors and paying clients. A person who described their
// situation once should be able to come back and re-read the answer instead
// of asking the same question again. Someone who just walks past the site
// leaves no trace at all.

export type AssistantHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

// A single answer can be long; a whole conversation of them is what makes
// re-reading useful. Far above any real message, far below anything that
// would bloat the table.
const MAX_STORED_CHARS = 12_000;

// What the chat window loads when it opens: enough to remember the thread,
// short enough to stay instant.
export const HISTORY_PAGE_SIZE = 60;

function trim(value: string): string {
  const clean = value.trim();

  return clean.length > MAX_STORED_CHARS
    ? `${clean.slice(0, MAX_STORED_CHARS)}…`
    : clean;
}

type SaveInput = {
  profileId: string;
  caseId: string | null;
  tier: AssistantTier;
  question: string;
  answer: string;
};

// Best effort by design: if saving fails, the person still gets their
// answer. Losing a line of history is never a reason to break the reply.
export async function saveAssistantExchange({
  profileId,
  caseId,
  tier,
  question,
  answer
}: SaveInput): Promise<void> {
  if (tier === "guest") {
    return;
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  const userText = trim(question);
  const assistantText = trim(answer);

  if (!userText && !assistantText) {
    return;
  }

  try {
    await supabase.from("assistant_messages").insert([
      {
        profile_id: profileId,
        case_id: caseId,
        role: "user",
        content: userText || "—",
        tier
      },
      {
        profile_id: profileId,
        case_id: caseId,
        role: "assistant",
        content: assistantText || "—",
        tier
      }
    ]);
  } catch {
    // Silent on purpose — see the note above.
  }
}

export type AssistantHistoryResult =
  | { status: "ready"; messages: AssistantHistoryMessage[] }
  | { status: "error"; message: string };

// The person's own conversation, oldest first — the order it reads in.
export async function getOwnAssistantHistory(
  profileId: string,
  limit = HISTORY_PAGE_SIZE
): Promise<AssistantHistoryResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "ready", messages: [] };
  }

  const { data, error } = await supabase
    .from("assistant_messages")
    .select("id, role, content, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      status: "error",
      message: "Не удалось загрузить историю переписки с ИИ."
    };
  }

  const messages = (data ?? []) as AssistantHistoryMessage[];

  return { status: "ready", messages: messages.slice().reverse() };
}

// Staff view: what the person already asked the assistant, so the same
// ground is not covered twice when the case is opened.
export async function getAssistantHistoryForCase(
  profileId: string,
  limit = HISTORY_PAGE_SIZE
): Promise<AssistantHistoryResult> {
  return getOwnAssistantHistory(profileId, limit);
}
