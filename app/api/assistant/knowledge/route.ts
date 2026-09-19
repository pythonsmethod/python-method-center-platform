import { NextResponse } from "next/server";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readVoiceBody } from "@/lib/assistant/realtime-server";
import { parseUnifiedNote, unifiedKnowledgeRecord } from "@/lib/assistant/unified-knowledge";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const en = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ?? false;
  const error = (status: number, ru: string, english: string) => NextResponse.json({ error: en ? english : ru }, { status, headers: { "Cache-Control": "private, no-store" } });
  const auth = await getStaffUserState();
  if (auth.status !== "authorized" || resolvePrivateAssistantRole(auth.email) !== "karen") return error(403, "Нет доступа.", "Access denied.");
  let input;
  try { input = parseUnifiedNote(await readVoiceBody(request)); }
  catch { return error(400, "Некорректный запрос.", "Invalid request."); }
  if (!input) return error(400, "Подтвердите сохранение текста длиной не более 7200 символов.", "Confirm saving text of no more than 7200 characters.");
  const db = createSupabaseServiceClient();
  if (!db) return error(503, "Единая память сейчас недоступна.", "Unified knowledge is unavailable.");
  if (input.caseId) {
    const selected = await db.from("client_cases").select("id").eq("id", input.caseId).maybeSingle();
    if (selected.error) return error(503, "Не удалось проверить кейс.", "The Case could not be checked.");
    if (!selected.data) return error(404, "Кейс не найден. Материал не сохранён.", "Case not found. The material was not saved.");
  }
  const record = unifiedKnowledgeRecord(auth.userId, input);
  const audited = await writeAuditLog({ actorId: auth.userId, actorRole: "karen", caseId: input.caseId, action: "assistant.knowledge.save_requested", entityTable: "assistant_knowledge", entityId: record.id, metadata: { channel: "text", collection: "general", audience: "staff" } });
  if (audited.status !== "inserted") return error(503, "Не удалось зарегистрировать сохранение. Повторите попытку.", "Could not register the save. Please retry.");
  const inserted = await db.from("assistant_knowledge").insert(record);
  if (inserted.error) {
    if (inserted.error.code !== "23505") return error(503, "Сохранение не подтверждено. Повторите попытку.", "Saving was not confirmed. Please retry.");
    const previous = await db.from("assistant_knowledge").select("id, content, created_by, audience, collection").eq("id", record.id).maybeSingle();
    if (previous.error) return error(503, "Не удалось проверить прошлую попытку сохранения.", "The earlier save attempt could not be checked.");
    if (!previous.data || previous.data.created_by !== auth.userId || previous.data.content !== record.content || previous.data.audience !== "staff" || previous.data.collection !== "general") return error(409, "Этот запрос уже использован для другого текста. Обновите материал и подтвердите снова.", "This request was already used for different text. Edit the material and confirm again.");
  }
  return NextResponse.json({ saved: true, id: record.id, title: record.title, audience: "staff", collection: "general", clientPublished: false }, { headers: { "Cache-Control": "private, no-store" } });
}
