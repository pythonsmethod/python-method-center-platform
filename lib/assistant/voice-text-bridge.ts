import { POST as staffTextRequest } from "@/app/api/assistant/staff/route";
import { VoiceFailure, type Receipt, type VoiceActor } from "./realtime-server";
import type { Locale } from "@/lib/i18n/locale";
import { getOwnAssistantHistory } from "./history";

export async function runVoiceTextBridge(request: Request, actor: VoiceActor, receipt: Receipt, locale: Locale, body: Record<string, unknown>) {
  if (actor.scope === "client") throw new VoiceFailure("forbidden", 403);
  if (!body.arguments || typeof body.arguments !== "object" || Array.isArray(body.arguments) || Object.keys(body.arguments).length) throw new VoiceFailure("invalid", 400);
  const turn = body.userTurn as { id?: unknown; text?: unknown } | undefined;
  if (!turn || typeof turn.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(turn.id) || typeof turn.text !== "string" || !turn.text.trim() || turn.text.length > 8000) throw new VoiceFailure("invalid", 400);
  // Actual browser transcript has the same trust boundary as typed user input.
  // The realtime model cannot choose the command/content or override role/Case.
  const { createSupabaseServiceClient } = await import("@/lib/supabase/service");
  const db = createSupabaseServiceClient();
  if (!db) throw new VoiceFailure("unavailable", 503);
  const reserve = await db.rpc("bump_assistant_usage", { p_bucket_key: `voice:text:${receipt.id}:${turn.id}`, p_limit: 1 });
  const reservation = Array.isArray(reserve.data) ? reserve.data[0] : reserve.data;
  if (reserve.error || !reservation?.allowed) throw new VoiceFailure("unavailable", 503);
  const previous = typeof body.previousAssistant === "string" && body.previousAssistant.length <= 8000 ? body.previousAssistant : "";
  const history = await getOwnAssistantHistory(actor.profileId, locale, 16, { private: true, caseId: actor.caseId });
  if (history.status !== "ready") throw new VoiceFailure("unavailable", 503);
  const context = history.messages.map(({ role, content }) => ({ role, content: content.slice(0, 8000) }));
  const messages = [...context, ...(previous && context.at(-1)?.content !== previous ? [{ role: "assistant", content: previous }] : []), { role: "user", content: turn.text }];
  while (messages[0]?.role === "assistant") messages.shift();
  const response = await staffTextRequest(new Request(new URL("/api/assistant/staff", request.url), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, locale, caseId: actor.caseId, transient: true, memoryConfirmation: actor.scope === "karen" }),
  }));
  const result = await response.json();
  if (!response.ok || typeof result.reply !== "string") return { error: "unavailable", instruction: "The text assistant did not confirm success. Do not claim that anything was saved or completed." };
  return { reply: result.reply, source: "staff_text_assistant", instruction: "Speak this reply faithfully. Any request for confirmation remains pending in the text chat; never claim it was completed." };
}
