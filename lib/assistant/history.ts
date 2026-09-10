import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AssistantTier } from "@/lib/assistant/tiers";
import type { Locale } from "@/lib/i18n/locale";
import { randomUUID } from "node:crypto";

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
  locale: Locale | null;
  message_sequence: number;
};

// What the chat window loads when it opens: enough to remember the thread,
// short enough to stay instant.
export const HISTORY_PAGE_SIZE = 60;


type SaveInput = {
  profileId: string;
  caseId: string | null;
  tier: AssistantTier | "founder" | "karen";
  question: string;
  answer: string;
  locale: Locale;
  questionCreatedAt?: string;
};

// Keep the answer available on storage failure, but explicitly report it.
export async function saveAssistantExchange({
  profileId,
  caseId,
  tier,
  question,
  answer,
  locale,
  questionCreatedAt
}: SaveInput): Promise<{ saved: boolean; messages?: AssistantHistoryMessage[] }> {
  if (tier === "guest") {
    return { saved: false };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { saved: false };
  }

  const userText = question.trim();
  const assistantText = answer.trim();

  if (!userText && !assistantText) {
    return { saved: false };
  }

  // Bulk inserts use the union of row keys. Omitting created_at on just the
  // answer would insert NULL instead of invoking the database default.
  const answerCreatedAt = new Date().toISOString();
  const rows = [
      {
        id: randomUUID(),
        created_at: questionCreatedAt ?? answerCreatedAt,
        profile_id: profileId,
        case_id: caseId,
        role: "user",
        content: userText || "—",
        tier,
        locale
      },
      {
        id: randomUUID(),
        created_at: answerCreatedAt,
        profile_id: profileId,
        case_id: caseId,
        role: "assistant",
        content: assistantText || "—",
        tier,
        locale
      }
    ];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data, error } = await supabase.from("assistant_messages").insert(rows)
        .select("id, role, content, created_at, locale, message_sequence");
      if (!error && data?.length === 2) {
        return { saved: true, messages: (data as AssistantHistoryMessage[]).sort((a, b) => a.message_sequence - b.message_sequence) };
      }
      // A lost acknowledgement can mean the insert committed. Read the same
      // IDs before retrying; never create a second copy of the exchange.
      const existing = await supabase.from("assistant_messages")
        .select("id, role, content, created_at, locale, message_sequence")
        .eq("profile_id", profileId).in("id", rows.map(row => row.id));
      if (!existing.error && existing.data?.length === 2) {
        return { saved: true, messages: (existing.data as AssistantHistoryMessage[]).sort((a, b) => a.message_sequence - b.message_sequence) };
      }
    } catch { /* Retry the same identities, never raw content in logs. */ }
  }
  return { saved: false };
}

export type AssistantHistoryResult =
  | { status: "ready"; messages: AssistantHistoryMessage[] }
  | { status: "error"; message: string };

// The person's own conversation, oldest first — the order it reads in.
export async function getOwnAssistantHistory(
  profileId: string,
  locale: Locale,
  limit = HISTORY_PAGE_SIZE,
  options: { private?: boolean; caseId?: string | null; before?: number } = {}
): Promise<AssistantHistoryResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "error", message: locale === "ru" ? "История временно недоступна." : "History is temporarily unavailable." };
  }

  let query = supabase
    .from("assistant_messages")
    .select("id, role, content, created_at, locale, message_sequence")
    .eq("profile_id", profileId)
    .in("tier", options.private ? ["founder", "karen"] : ["registered", "client"])
    .order("message_sequence", { ascending: false })
    .limit(limit);

  if (options.private) {
    query = options.caseId ? query.eq("case_id", options.caseId) : query.is("case_id", null);
  }
  if (options.before !== undefined) query = query.lt("message_sequence", options.before);
  const { data, error } = await query;

  if (error) {
    return {
      status: "error",
      message: locale === "ru"
        ? "Не удалось загрузить историю переписки с ИИ."
        : "Could not load your AI conversation history."
    };
  }

  const messages = (data ?? []) as AssistantHistoryMessage[];

  return { status: "ready", messages: messages.slice().reverse() };
}

// Staff view: what the person already asked the assistant, so the same
// ground is not covered twice when the case is opened.
export async function getAssistantHistoryForCase(
  profileId: string,
  locale: Locale,
  limit = HISTORY_PAGE_SIZE
): Promise<AssistantHistoryResult> {
  return getOwnAssistantHistory(profileId, locale, limit);
}
