import { NextResponse } from "next/server";
import { getPrivateAssistantUserState } from "@/lib/auth/require-private-assistant";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { sanitizeChatMessages } from "@/lib/assistant/claude";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { buildStaffSystemPrompt } from "@/lib/assistant/prompts";
import { buildCaseContext } from "@/lib/assistant/case-context";
import { conversationContext } from "@/lib/assistant/conversation-context";
import { normalizeAnhamResponse } from "@/lib/assistant/response-style";
import { guardFactualReply } from "@/lib/assistant/factual-honesty";
import { captureKnowledgeGap } from "@/lib/assistant/escalation-store";
import { saveAssistantExchange } from "@/lib/assistant/history";
import { askKarenTextApi } from "@/lib/assistant/karen-api";
import { apiError, apiErrorLocale, assistantFailure } from "@/lib/i18n/api-errors";
import { isUuid } from "@/lib/utils/uuid";
import { POST as legacyStaffPost } from "../staff/route";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let locale = await apiErrorLocale();
  const respondError = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
  const auth = await getPrivateAssistantUserState();
  if (auth.status !== "authorized" || resolvePrivateAssistantRole(auth.email) !== "karen") return respondError(403, apiError("accessDenied", locale));
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return respondError(403, apiError("accessDenied", locale));
  let body: Record<string, unknown>;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 4_000_000) { await reader.cancel(); return respondError(413, apiError("badRequest", locale)); }
      chunks.push(part.value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch { return respondError(400, apiError("badRequest", locale)); }
  if (body.locale === "ru" || body.locale === "en") locale = body.locale;
  const messages = sanitizeChatMessages(body.messages);
  const attachments = sanitizeAttachments(body.attachments);
  if (!messages || attachments === "invalid" || (body.caseId != null && (typeof body.caseId !== "string" || !isUuid(body.caseId)))) return respondError(400, apiError("badRequest", locale));
  if (attachments) {
    // Preserve existing explicitly attached-file handling, without enabling the
    // postponed reading of documents already stored in a Case.
    return legacyStaffPost(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(body) }));
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : null;
  const questionCreatedAt = new Date().toISOString();
  const question = messages[messages.length - 1].content;
  try {
    let system = await buildStaffSystemPrompt("karen");
    system += await conversationContext({ profileId: auth.userId, private: true, caseId }, question);
    system += locale === "en" ? "\nActive interface language: English. Reply in English." : "\nАктивный язык интерфейса: русский. Отвечай по-русски.";
    if (caseId) {
      system += `\nCURRENT_CASE_ID=${caseId}. This is the destination context, never silently replace it with a comparison Case.\n`;
      system += await buildCaseContext(caseId) ?? "Case snapshot unavailable. Do not invent its contents.";
    } else system += "\nNo current Case is selected. Resolve the intended Case using the authorised site tools before preparing a Case-specific client draft.";
    const result = await askKarenTextApi(system, messages, { profileId: auth.userId, email: auth.email, caseId, locale });
    if (result.status === "unavailable") return respondError(503, locale === "ru" ? "Режим Анхама пока недоступен. Обратитесь к основателю для проверки подключения API." : "Anham is not available yet. Contact the founder to check the API connection.");
    if (result.status === "error") return respondError(502, assistantFailure(result, locale));
    const reply = normalizeAnhamResponse(guardFactualReply({ reply: result.reply, question, locale, audience: "karen" }), locale);
    if (!reply) return respondError(502, apiError("assistantEmptyReply", locale));
    await captureKnowledgeGap({ reply, question, audience: "staff", locale });
    const persistence = await saveAssistantExchange({ profileId: auth.userId, questionCreatedAt, caseId, tier: "karen", question: typeof body.displayText === "string" && body.displayText.trim() ? body.displayText.slice(0, 8000) : question, answer: reply, locale });
    return NextResponse.json({ reply, ...persistence }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return respondError(503, locale === "ru" ? "Не удалось завершить запрос. Данные не изменены; попробуйте ещё раз." : "The request could not be completed. No business records were changed; please try again.");
  }
}
