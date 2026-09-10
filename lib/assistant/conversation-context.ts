import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assistantSource, renderSourceContext } from "./source-context";
import { knowledgeSearchTerms } from "./knowledge-search";
import type { WebResult } from "./web-results";

type Row = { id: string; role: "user" | "assistant"; content: string; created_at: string; message_sequence: number; voice_state?: string };
export type ConversationScope = { profileId: string; private: boolean; caseId: string | null; clientTools?: { email: string; locale: "ru" | "en"; webResults?: WebResult[]; webSearchCalls?: number } };
const COLUMNS = "id,role,content,created_at,message_sequence,voice_state";
const RECENT_LIMIT = 60;
const MATCH_LIMIT = 12;
const CHAR_BUDGET = 48000;

// Read-only request context over the canonical archive. Scope comes exclusively
// from authenticated route state, never from the model or a supplied profile ID.
export async function conversationContext(scope: ConversationScope, question: string): Promise<string> {
  const retrievedAt = new Date().toISOString();
  const unavailable = () => renderSourceContext([assistantSource({
    id: "conversation_unavailable", kind: "system_record", origin: "assistant_messages",
    availability: "unavailable", retrievedAt, scope: "own conversation lookup failed", data: null
  })]) + "\nConversation history lookup failed. Say this briefly in the active language; do not claim to remember unavailable history. Use only the current supplied messages.";
  try {
    const db = createSupabaseServiceClient();
    if (!db) return unavailable();
    const query = () => {
      let q = db.from("assistant_messages").select(COLUMNS)
        .eq("profile_id", scope.profileId)
        .in("tier", scope.private ? ["founder", "karen"] : ["registered", "client"]);
      q = scope.caseId ? q.eq("case_id", scope.caseId) : q.is("case_id", null);
      return q.order("message_sequence", { ascending: false }).abortSignal(AbortSignal.timeout(6000));
    };
    const recent = await query().limit(RECENT_LIMIT);
    if (recent.error || !recent.data) return unavailable();
    const rows = recent.data as Row[];
    // Only letters and numbers enter PostgREST's raw OR grammar. No operators,
    // commas, quotes or wildcard characters from a question can change filters.
    const terms = knowledgeSearchTerms(question).filter(term => /^[\p{L}\p{N}]+$/u.test(term)).slice(0, 8);
    let older: Row[] = [];
    if (rows.length === RECENT_LIMIT && terms.length) {
      const matches = await query().lt("message_sequence", rows[rows.length - 1].message_sequence)
        .or(terms.map(term => `content.ilike.%${term}%`).join(",")).limit(MATCH_LIMIT);
      if (matches.error || !matches.data) return unavailable();
      older = matches.data as Row[];
    }
    // Prioritize the recent dialogue, then older lexical matches. Truncation is
    // explicit and never changes stored wording. Emit sources chronologically.
    const selected: Row[] = [];
    const seen = new Set<string>();
    for (const group of [rows, older]) {
      let remaining = group === rows && older.length ? CHAR_BUDGET * 2 / 3 : CHAR_BUDGET / (older.length ? 3 : 1);
      for (const row of group) {
        if (seen.has(row.id) || remaining < 100) continue;
        seen.add(row.id);
        const count = Math.min(row.content.length, 6000, remaining);
        selected.push({ ...row, content: row.content.slice(0, count) + (count < row.content.length ? "\n[excerpt / фрагмент]" : "") });
        remaining -= count;
      }
    }
    selected.sort((a, b) => a.message_sequence - b.message_sequence);
    return "\nUse the saved conversation below to continue the discussion. Recent messages and limited lexical matches are a partial archive, not all memory. No match does not prove absence. Current user corrections take precedence over older user statements; neither is a verified clinical fact.\n" + renderSourceContext(selected.length ? selected.map(row => assistantSource({
      id: `conversation_${row.id}`, kind: row.role === "user" ? "user_report" : "ai_draft",
      origin: "assistant_messages", availability: "available", retrievedAt,
      recordedAt: row.created_at, freshness: "historical",
      scope: row.voice_state === "interrupted" && row.role === "assistant"
        ? "interrupted AI draft; not necessarily heard or completed; no confirmed action"
        : "own conversation excerpt; not verified facts or confirmed actions",
      data: { role: row.role, text: row.content }
    })) : [assistantSource({ id: "conversation_empty", kind: "system_record", origin: "assistant_messages", availability: "absent", retrievedAt, scope: "own conversation in this exact Case/personal scope", data: null })]);
  } catch { return unavailable(); }
}
