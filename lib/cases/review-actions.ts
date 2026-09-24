"use server";

import { readAllRows } from "@/lib/documents/read-all";
import { revalidatePath } from "next/cache";
import { getKnowledgeForPrompt } from "@/lib/assistant/knowledge";
import { conversationContext } from "@/lib/assistant/conversation-context";
import { withConversationArchive } from "@/lib/assistant/conversation-archive";
import { askClaude } from "@/lib/assistant/claude";
import {
  CASE_REVIEW_SYSTEM_PROMPT,
  CASE_REVIEW_UNREAD_HEADING,
  parseCaseReview
} from "@/lib/assistant/case-review";
import {
  formatAgreed,
  formatDisputed,
  type DisputedValue,
  type TranscribedValue
} from "@/lib/assistant/transcription";
import { buildCaseContext } from "@/lib/assistant/case-context";
import { formatMachineFindings, type StoredRun } from "@/lib/analysis/findings";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { caseEvidenceFingerprint } from "./evidence-fingerprint";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { diffReviewText } from "@/lib/cases/review-diff";
import { getCaseAnalyticalPicture } from "@/lib/analytical-picture";
import type { CaseReviewActionState } from "@/lib/cases/review-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

function errorState(message: string): CaseReviewActionState {
  return { status: "error", message };
}

// Internal synthesis, a separate human decision, and explicit publication.
export async function generateCaseReview(
  _previous: CaseReviewActionState,
  formData: FormData
): Promise<CaseReviewActionState> {
  const locale = formData.get("locale") === "en" ? "en" : "ru";
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return errorState(locale === "en" ? "Access denied." : "Недостаточно прав.");
  }

  const caseId = String(formData.get("case_id") ?? "");

  if (!isUuid(caseId)) {
    return errorState(locale === "en" ? "Invalid case." : "Некорректный кейс.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState(locale === "en" ? "The review service is unavailable." : "Service role key не настроен — разбор недоступен.");
  }

  const fingerprint = await caseEvidenceFingerprint(caseId);
  const { data: documents, error: documentsError } = await supabase
    .from("uploaded_documents")
    // metadata carries the mime type the browser reported at upload;
    // there is no mime_type column on this table.
    .select("id, original_filename, document_status, created_at")
    .eq("case_id", caseId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (documentsError) {
    return errorState(
      locale === "en" ? "The document list is unavailable." : "Не удалось получить список документов кейса."
    );
  }

  if (!documents || documents.length === 0) {
    return errorState(locale === "en" ? "This case has no uploaded documents." : "В кейсе пока нет загруженных документов.");
  }

  const waiting = documents.filter((row) => row.document_status !== "ready");
  if (waiting.length > 0) {
    const reupload = waiting.filter((row) => row.document_status === "needs_reupload").length;
    return errorState(
      locale === "en" ? `Documents are not ready: ${waiting.length} remaining, ${reupload} need a clearer source.` : reupload > 0
        ? `Итог пока не собирается: ${reupload} файл(а) клиенту нужно загрузить повторно. Остальные документы сохранены.`
        : `Документы ещё распознаются: готово ${documents.length - waiting.length} из ${documents.length}.`
    );
  }

  const { data: extractions, error: extractionError } = await readAllRows((from, to) => supabase
    .from("document_extractions")
    .select("document_id, agreed_values, disputed_values")
    .eq("case_id", caseId).order("id").range(from, to));

  if (extractionError) {
    return errorState(`Не удалось получить распознанные документы: ${extractionError.message}`);
  }

  if ((extractions?.length ?? 0) !== documents.length) {
    return errorState(
      `Результаты ещё собираются: готово ${extractions?.length ?? 0} из ${documents.length}. Ни один файл не будет пропущен.`
    );
  }

  // Numbered by document, not by filename. A Map keyed on the name keeps
  // only the last of any repeat, and repeats are normal here: the cabinet
  // tells people to send a newer version of the same test as a new upload,
  // and sanitizeOriginalFilename turns every Cyrillic name into the same
  // run of underscores. Every value from the earlier file then carried the
  // later file's number, and one number was never printed at all — so
  // Professor Python read last year's figures labelled as this month's.
  const numberByDocument = new Map(
    documents.map((document, index) => [document.id, index + 1])
  );
  const numberedFile = (documentId: string, file: string) =>
    `№${numberByDocument.get(documentId) ?? "?"} «${file}»`;

  const numberedAgreed = (extractions ?? []).filter(row => numberByDocument.has(row.document_id)).flatMap((row) =>
    Array.isArray(row.agreed_values)
      ? (row.agreed_values as TranscribedValue[]).map((value) => ({
          ...value,
          file: numberedFile(row.document_id, value.file)
        }))
      : []
  );
  const numberedDisputed = (extractions ?? []).filter(row => numberByDocument.has(row.document_id)).flatMap((row) =>
    Array.isArray(row.disputed_values)
      ? (row.disputed_values as DisputedValue[]).map((value) => ({
          ...value,
          file: numberedFile(row.document_id, value.file)
        }))
      : []
  );

  if (numberedAgreed.length === 0 && numberedDisputed.length === 0) {
    return errorState(locale === "en" ? "The readings contain no content to review." : "В распознанных документах не найдено содержимого для итогового разбора.");
  }

  // The newest analysis run: what modules 1, 3 and 4 made of these same
  // values. A reading without one would be a reading without the unit
  // check, the blockers or the threshold — the state the pipeline exists
  // to end — so it is refused rather than made.
  const { data: runRow } = await supabase
    .from("analysis_runs")
    .select("id, human_review_count, unit_unresolved, blocked, requests, trends")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!runRow) {
    return errorState(
      locale === "en" ? "Analysis is not ready. Wait for document processing and try again." : "Прогон анализа для этого кейса ещё не выполнен — дождитесь обработки последнего документа и попробуйте снова."
    );
  }

  const picture = await getCaseAnalyticalPicture(caseId);
  if (!fingerprint || picture.status !== "ready") return errorState(locale === "en" ? "The evidence snapshot is unavailable." : "Снимок исходных данных недоступен.");
  const evidenceContext = JSON.stringify(picture.picture);
  if (evidenceContext.length > 180000 || documents.length >= 1000) return errorState(locale === "en" ? "The case exceeds the current review limit. No partial review was saved." : "Объём кейса превышает текущий предел разбора. Частичный итог не сохранён.");
  const findings = formatMachineFindings(runRow as unknown as StoredRun);

  const scope = { profileId: auth.userId, private: true, caseId };
  const [context, knowledge, history] = await Promise.all([buildCaseContext(caseId), getKnowledgeForPrompt("staff"), conversationContext(scope, "Case document review: " + picture.picture.extractedEvidence.slice(0, 20).map(row => row.label).join(" "))]);
  const disputedNote = numberedDisputed.length > 0
    ? `\n\nСПОРНЫЕ МЕСТА. Перенеси их все в раздел «${CASE_REVIEW_UNREAD_HEADING}» дословно:\n${formatDisputed(numberedDisputed)}`
    : `\n\nСПОРНЫХ МЕСТ НЕТ. После разделителя «${CASE_REVIEW_UNREAD_HEADING}» напиши только «НЕТ».`;

  const result = await withConversationArchive(scope, () => askClaude(
    `${CASE_REVIEW_SYSTEM_PROMPT}\n\nЯЗЫК РЕЗУЛЬТАТА: ${locale === "en" ? "English. Write the internal review and unresolved questions in English." : "Русский. Оба раздела пиши по-русски."}\n\n${context ?? ""}\n\n${knowledge}\n\n${history}`,
    [
      {
        role: "user",
        content: `Вот непроверенные машинные чтения документов. Подготовь внутреннюю картину для Карена и все неразрешённые вопросы, без клиентского ответа. Совпадение чтений не является подтверждением фактов.\n\n${formatAgreed(
          numberedAgreed
        )}${disputedNote}\n\nМАШИННАЯ ПРОВЕРКА (единицы, блокираторы, порог значимости):\n${findings}\n\nПОЛНАЯ ВНУТРЕННЯЯ КАРТИНА С ID И ИСТОЧНИКАМИ:\n${evidenceContext}`
      }
    ],
    4000
  ));

  if (result.status !== "ok") {
    return errorState(
      locale === "en" ? "The assistant is unavailable. Try again shortly." : "Ассистент сейчас недоступен. Попробуйте через минуту."
    );
  }

  const parsed = parseCaseReview(result.reply, locale);

  if (parsed.status !== "ok") {
    return errorState(locale === "en" ? "The assistant returned an unreadable response." : "Ассистент вернул ответ, который не удалось разобрать.");
  }

  const sourceIds = [...picture.picture.extractedEvidence, ...picture.picture.timeline].map(row => row.id);
  const citations = [...parsed.parts.draft.matchAll(/\[([a-f0-9]{8}-[a-f0-9-]{27}(?:-(?:agreed|disputed)-\d+)?)\]/gi)].map(match => match[1]);
  if (!citations.length || citations.some(id => !sourceIds.includes(id))) return errorState(locale === "en" ? "The draft lacks valid source references. Generate it again." : "В черновике нет корректных ссылок на источники. Соберите разбор заново.");

  const { data: savedId, error: saveError } = await supabase.rpc("save_pmc_case_review", {
    p_case_id: caseId, p_fingerprint: fingerprint, p_summary: parsed.parts.summary,
    p_draft: parsed.parts.draft, p_actor: auth.userId, p_run: runRow.id
  });

  if (saveError || !savedId) {
    return errorState(
      locale === "en" ? "The review could not be saved. The evidence may have changed; refresh the case." : "Разбор готов, но сохранить его не удалось. Применена ли миграция case_ai_reviews?"
    );
  }

  const saved = await supabase.from("case_ai_reviews").select("id,documents_fingerprint,draft,summary").eq("id", savedId).eq("case_id", caseId).maybeSingle();
  if (saved.error || saved.data?.documents_fingerprint !== fingerprint || saved.data?.draft !== parsed.parts.draft || saved.data?.summary !== parsed.parts.summary) return errorState(locale === "en" ? "Save readback failed. Reload the case." : "Сохранение не подтверждено. Обновите кейс.");
  revalidatePath(`/admin/cases/${caseId}`);

  return {
    status: "success",
    message: locale === "en" ? `Internal review saved from ${documents.length} documents.` : `Внутренний разбор сохранён из всех документов: ${documents.length}.`
  };
}

export async function approveCaseReview(
  _previous: CaseReviewActionState,
  formData: FormData
): Promise<CaseReviewActionState> {
  const locale = formData.get("locale") === "en" ? "en" : "ru";
  const caseId = String(formData.get("case_id") ?? "");
  const reviewId = String(formData.get("review_id") ?? "");
  const approvedText = String(formData.get("approved_text") ?? "").trim();
  const auth = await getStaffUserState();

  if (auth.status !== "authorized" || resolvePrivateAssistantRole(auth.email) !== "karen") return errorState(locale === "en" ? "Only Professor Python can approve a conclusion." : "Утвердить заключение может только Professor Python.");
  if (!isUuid(caseId) || !isUuid(reviewId)) return errorState(locale === "en" ? "Invalid review." : "Некорректный разбор.");
  if (!approvedText || approvedText.length > 8000) return errorState(locale === "en" ? "Enter the approved conclusion (up to 8,000 characters)." : "Введите утверждённое заключение (до 8000 символов).");

  const pictureResult = await getCaseAnalyticalPicture(caseId);
  if (pictureResult.status !== "ready" || pictureResult.picture.reviewSummary.approvalBlocked) {
    return errorState(locale === "en" ? "Resolve every disputed reading before approval." : "Перед утверждением разберите все спорные чтения в картине кейса.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorState(locale === "en" ? "The database is unavailable." : "База данных недоступна.");

  const { data: review } = await supabase
    .from("case_ai_reviews")
    .select("id, case_id, draft, documents_fingerprint")
    .eq("id", reviewId)
    .eq("case_id", caseId)
    .maybeSingle();
  if (!review) return errorState(locale === "en" ? "The AI draft was not found." : "Черновик ИИ не найден.");

  const expectedCreatedAt = String(formData.get("review_created_at") ?? "");
  const expectedFingerprint = String(formData.get("evidence_fingerprint") ?? "");
  if (!expectedCreatedAt || !expectedFingerprint || review.documents_fingerprint !== expectedFingerprint) return errorState(locale === "en" ? "The review changed. Reload and check it again." : "Разбор изменился. Обновите страницу и проверьте его заново.");
  const session = await createSupabaseServerClient();
  const verified = session ? await session.auth.getUser() : null;
  if (!verified?.data.user || verified.error || verified.data.user.id !== auth.userId || resolvePrivateAssistantRole(verified.data.user.email) !== "karen") return errorState(locale === "en" ? "Karen sign-in is required." : "Требуется вход Карена.");
  const diff = diffReviewText(String(review.draft), approvedText);
  const { data: approvalId, error } = await supabase.rpc("approve_pmc_case_review", {
    p_case_id: caseId, p_review_id: reviewId, p_review_created_at: expectedCreatedAt,
    p_fingerprint: expectedFingerprint, p_actor: auth.userId, p_text: approvedText, p_diff: diff
  });
  if (error || !approvalId) return errorState(locale === "en" ? "The sources changed or approval could not be saved. Reload and review again." : "Источники изменились или решение не удалось сохранить. Обновите страницу и проверьте заново.");
  const saved = await supabase.from("case_review_learning_events").select("id,approved_text").eq("id", approvalId).eq("case_id", caseId).maybeSingle();
  if (saved.error || saved.data?.approved_text !== approvedText) return errorState(locale === "en" ? "Approval readback failed. Reload before retrying." : "Не удалось подтвердить сохранение решения. Обновите страницу перед повтором.");
  revalidatePath(`/admin/cases/${caseId}`);
  return { status: "success", message: locale === "en" ? "The decision and its source version are saved. You can now publish the approved text." : "Решение и версия источников сохранены. Теперь можно отправить утверждённый текст клиенту." };
}

export async function publishCaseReview(_previous: CaseReviewActionState, formData: FormData): Promise<CaseReviewActionState> {
  const en = formData.get("locale") === "en";
  const caseId = String(formData.get("case_id") ?? "");
  const approvalId = String(formData.get("approval_id") ?? "");
  const auth = await getStaffUserState();
  const session = await createSupabaseServerClient();
  const verified = session ? await session.auth.getUser() : null;
  if (auth.status !== "authorized" || !verified?.data.user || verified.error || auth.userId !== verified.data.user.id || resolvePrivateAssistantRole(verified.data.user.email) !== "karen") return errorState(en ? "Only Karen can publish a conclusion." : "Отправить заключение может только Карен.");
  if (!isUuid(caseId) || !isUuid(approvalId)) return errorState(en ? "Invalid decision." : "Некорректное решение.");
  const db = createSupabaseServiceClient();
  if (!db) return errorState(en ? "The database is unavailable." : "База данных недоступна.");
  const { data: messageId, error } = await db.rpc("publish_pmc_case_review", { p_case_id: caseId, p_approval_id: approvalId, p_actor: auth.userId });
  if (error || !messageId) return errorState(en ? "The sources or decision changed. Review the latest version before publishing." : "Источники или решение изменились. Проверьте актуальную версию перед отправкой.");
  const saved = await db.from("case_messages").select("id,approved_review_event_id").eq("id", messageId).eq("case_id", caseId).maybeSingle();
  if (saved.error || saved.data?.approved_review_event_id !== approvalId) return errorState(en ? "Publication readback failed. Reload before retrying." : "Не удалось подтвердить публикацию. Обновите страницу перед повтором.");
  revalidatePath(`/admin/cases/${caseId}`); revalidatePath("/cabinet");
  return { status: "success", message: en ? "The approved result is saved in the client's conversation." : "Утверждённый результат сохранён в переписке клиента." };
}
