"use server";

import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils/uuid";
import { getDocumentChainPilotStatus } from "./pilot";
import { getCaseAnalyticalPicture } from "@/lib/analytical-picture/queries";
import { askAssistantWithAttachments } from "@/lib/assistant/router";
import { DOCUMENT_TRANSLATION_PROMPT, parseDocumentTranslation, translationBatches, type TranslatedRow } from "./translation";

export type DocumentTranslationState = {
  status: "idle" | "success" | "error";
  message: string;
  rows: TranslatedRow[];
};

export async function translateDocumentRows(_previous: DocumentTranslationState, formData: FormData): Promise<DocumentTranslationState> {
  const ru = formData.get("locale") !== "en";
  const failure = (russian: string, english: string): DocumentTranslationState => ({ status: "error", message: ru ? russian : english, rows: [] });
  const caseId = String(formData.get("case_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const page = Number(formData.get("page"));
  const batchIndex = Number(formData.get("batch_index"));
  const token = String(formData.get("batch_token") ?? "");

  const auth = await getStaffUserState();
  const session = await createSupabaseServerClient();
  const verifiedUser = session ? await session.auth.getUser() : null;
  if (auth.status !== "authorized" || verifiedUser?.error || !verifiedUser?.data.user || verifiedUser.data.user.id !== auth.userId) {
    return failure("Доступ к переводу ограничен сотрудниками.", "Translation is limited to staff.");
  }
  if (!isUuid(caseId) || !isUuid(documentId) || !Number.isSafeInteger(page) || page < 0 || page > 250 ||
    !Number.isSafeInteger(batchIndex) || batchIndex < 0 || batchIndex > 10_000 || !/^[a-f0-9]{64}$/.test(token)) {
    return failure("Некорректный запрос перевода.", "Invalid translation request.");
  }
  if (await getDocumentChainPilotStatus(caseId) !== "enabled") {
    return failure("Перевод доступен только в разрешённом пилотном кейсе.", "Translation is available only in an enabled pilot Case.");
  }
  const picture = await getCaseAnalyticalPicture(caseId);
  if (picture.status !== "ready") return failure("Данные кейса временно недоступны.", "Case evidence is temporarily unavailable.");
  if (!picture.picture.documents.some(row => row.id === documentId && row.status === "ready")) {
    return failure("Готовый документ не найден в этом кейсе.", "A ready document was not found in this Case.");
  }
  const batch = translationBatches(picture.picture.extractedEvidence).find(item =>
    item.documentId === documentId && item.page === page && item.batchIndex === batchIndex);
  if (!batch || batch.token !== token) return failure("Строки изменились. Обновите кейс перед переводом.", "Rows changed. Refresh the Case before translating.");
  const input = JSON.stringify(batch.rows.map(({ id, section, label, value, alternateValue }) => ({ id, section, label, value, alternateValue })));
  if (input.length > 28_000) return failure("Этот фрагмент слишком велик для точного перевода.", "This excerpt exceeds the safe translation limit.");

  // Text only, from the existing saved literal reading. The existing document
  // provider sees the same pilot-scoped PHI; no original PDF is sent again.
  const result = await askAssistantWithAttachments(DOCUMENT_TRANSLATION_PROMPT,
    [{ role: "user", content: input }], 6500, [], { timeoutMs: 90_000, allowContinuation: false });
  if (result.status !== "ok" || result.refusal) return failure("Перевод сейчас недоступен. Исходные строки сохранены.", "Translation is unavailable. Source rows remain available.");
  const rows = parseDocumentTranslation(result.reply, batch.rows);
  if (!rows) return failure("Перевод не прошёл проверку полноты и чисел. Сверьте оригинал.", "Translation failed completeness or numeric checks. Review the original.");
  return { status: "success", message: ru ? "Машинный перевод для чтения; факты и статус проверки не изменены." : "Machine translation for reading; facts and review status are unchanged.", rows };
}
