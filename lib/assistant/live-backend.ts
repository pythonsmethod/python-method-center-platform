import { POST as staffPost } from "@/app/api/assistant/staff/route";
import { POST as clientPost } from "@/app/api/assistant/client/route";
import { resolveVoiceActor, VoiceFailure, type VoiceActor } from "./realtime-server";
import { liveConfig } from "./live-config";
import { withLiveContext } from "./live-context";
import { voiceSiteTools, runVoiceSiteTool } from "./voice-site-tools";
import { isConversationArchiveTool, runConversationArchiveTool } from "./conversation-archive";
import { readMyCase } from "./client-case-tools";
import { runVoiceWebSearch } from "./voice-web-search";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { writeAuditLog } from "@/lib/audit/log";
import type { Locale } from "@/lib/i18n/locale";
import { founderMemoryFromCommand } from "./founder-memory";
import { memoryCollectionFromCommand } from "./memory";

export async function runLiveBackend(request: Request, actor: VoiceActor, locale: Locale, sessionId: string, taskId: string,
  messages: { role: "user" | "assistant"; content: string }[], timeZone: string) {
  const fresh = await resolveVoiceActor(request, actor.scope === "client" ? "client" : "staff", actor.caseId);
  if (fresh.profileId !== actor.profileId || fresh.scope !== actor.scope) throw new VoiceFailure("forbidden", 403);
  liveConfig(fresh);
  // Live transcript fragments have no completion boundary. A spoken memory
  // request must be reviewed using the existing text confirmation workflow.
  const draft = founderMemoryFromCommand(messages, locale === "en");
  if (actor.scope !== "client" && (draft || memoryCollectionFromCommand(messages.at(-1)?.content ?? ""))) {
    return { memoryPending: true, reply: (locale === "ru"
      ? "Ещё не сохранено. Завершите голосовой разговор и проверьте текст в чате. Затем подтвердите запись обычной текстовой командой или карточкой памяти.\n\nТекст для проверки:\n"
      : "Not saved yet. End the voice conversation and review the text in chat, then confirm using the usual text command or memory card.\n\nText to review:\n") + (draft?.content || messages.at(-1)?.content || "") };
  }
  const db = createSupabaseServiceClient();
  if (!db) throw new VoiceFailure("unavailable", 503);
  const reserve = await db.rpc("bump_assistant_usage", { p_bucket_key: `live:task:${sessionId}:${taskId}`, p_limit: 1 });
  const row = Array.isArray(reserve.data) ? reserve.data[0] : reserve.data;
  if (reserve.error || row?.allowed !== true) throw new VoiceFailure("unavailable", 503);
  // Existing cabinet writes require a completed later confirmation turn.
  // Live has only overlapping deltas: do not silently inherit those write tools.
  const permitted = (name: string) => !["ask_text_assistant", "prepare_my_cabinet_action", "execute_my_cabinet_action"].includes(name);
  const tools = voiceSiteTools(actor.scope, actor).filter(tool => permitted(tool.name));
  let calls = 0;
  const run = async (name: unknown, args: unknown): Promise<Record<string, unknown>> => {
    const current = await resolveVoiceActor(request, actor.scope === "client" ? "client" : "staff", actor.caseId);
    if (current.profileId !== actor.profileId || current.scope !== actor.scope) throw new VoiceFailure("forbidden", 403);
    liveConfig(current);
    if (++calls > 12 || typeof name !== "string" || !permitted(name) || !voiceSiteTools(current.scope, current).some(t => t.name === name)) throw new VoiceFailure("forbidden", 403);
    const audit = await writeAuditLog({ actorId: actor.profileId, action: "assistant.live.tool", metadata: { sessionId, taskId, name } });
    if (audit.status !== "inserted") throw new VoiceFailure("unavailable", 503);
    if (isConversationArchiveTool(name)) return runConversationArchiveTool({ profileId: actor.profileId, private: actor.scope !== "client", caseId: actor.caseId }, name, args);
    if (name === "read_my_case") return readMyCase(current, args);
    if (name === "search_web") return runVoiceWebSearch(current, args, { id: sessionId, profileId: actor.profileId, scope: actor.scope, caseId: actor.caseId, locale, expires: Date.now() + 60_000 }, request.signal);
    return runVoiceSiteTool(current, name, args, timeZone, new Date(), locale);
  };
  // The same routes retain model routing, memory commands, private persona, case
  // context, retrieval, confirmations and permissions. No second agent persona.
  const headers = new Headers(request.headers); headers.set("content-type", "application/json"); headers.delete("content-length");
  const path = actor.scope === "client" ? "/api/assistant/client" : "/api/assistant/staff";
  const response = await withLiveContext({ tools, run }, () => (actor.scope === "client" ? clientPost : staffPost)(new Request(new URL(path, request.url), {
    method: "POST", headers, signal: request.signal,
    body: JSON.stringify({ messages: messages.slice(-24).map(m => ({ ...m, content: m.content.slice(-4000) })), locale, caseId: actor.caseId, transient: true, memoryConfirmation: actor.scope === "karen" }),
  })));
  const result = await response.json();
  if (!response.ok || typeof result.reply !== "string") throw new VoiceFailure("unavailable", 503);
  return { reply: result.reply as string, memoryPending: false };
}
