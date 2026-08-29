"use server";

import { revalidatePath } from "next/cache";
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
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { fingerprintDocuments } from "@/lib/cases/case-documents";
import { diffReviewText } from "@/lib/cases/review-diff";
import type { CaseReviewActionState } from "@/lib/cases/review-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

function errorState(message: string): CaseReviewActionState {
  return { status: "error", message };
}

// Reads the case's own analyses and writes down what the assistant made of
// them. Staff only, and stored where no client can reach it.
//
// The draft reply produced here is never sent anywhere by this action or by
// any other. It is text on Professor Python's screen, which he copies into
// the message box, edits, and sends himself.
export async function generateCaseReview(
  _previous: CaseReviewActionState,
  formData: FormData
): Promise<CaseReviewActionState> {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return errorState("Недостаточно прав.");
  }

  const caseId = String(formData.get("case_id") ?? "");
  const locale = formData.get("locale") === "en" ? "en" : "ru";

  if (!isUuid(caseId)) {
    return errorState("Некорректный кейс.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState("Service role key не настроен — разбор недоступен.");
  }

  const { data: documents, error: documentsError } = await supabase
    .from("uploaded_documents")
    // metadata carries the mime type the browser reported at upload;
    // there is no mime_type column on this table.
    .select("id, original_filename, document_status, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(60);

  if (documentsError) {
    return errorState(
      `Не удалось получить список документов кейса: ${documentsError.message}`
    );
  }

  if (!documents || documents.length === 0) {
    return errorState("В кейсе пока нет загруженных документов.");
  }

  const waiting = documents.filter((row) => row.document_status !== "ready");
  if (waiting.length > 0) {
    const reupload = waiting.filter((row) => row.document_status === "needs_reupload").length;
    return errorState(
      reupload > 0
        ? `Итог пока не собирается: ${reupload} файл(а) клиенту нужно загрузить повторно. Остальные документы сохранены.`
        : `Документы ещё распознаются: готово ${documents.length - waiting.length} из ${documents.length}.`
    );
  }

  const { data: extractions, error: extractionError } = await supabase
    .from("document_extractions")
    .select("document_id, agreed_values, disputed_values")
    .eq("case_id", caseId);

  if (extractionError) {
    return errorState(`Не удалось получить распознанные документы: ${extractionError.message}`);
  }

  if ((extractions?.length ?? 0) !== documents.length) {
    return errorState(
      `Результаты ещё собираются: готово ${extractions?.length ?? 0} из ${documents.length}. Ни один файл не будет пропущен.`
    );
  }

  const agreed = (extractions ?? []).flatMap((row) =>
    Array.isArray(row.agreed_values) ? row.agreed_values as TranscribedValue[] : []
  );
  const disputed = (extractions ?? []).flatMap((row) =>
    Array.isArray(row.disputed_values) ? row.disputed_values as DisputedValue[] : []
  );

  const fileNumbers = new Map(
    documents.map((document, index) => [
      String(document.original_filename ?? "document"),
      index + 1
    ])
  );
  const numberedFile = (file: string) =>
    `№${fileNumbers.get(file) ?? "?"} «${file}»`;
  const numberedAgreed = agreed.map((value) => ({
    ...value,
    file: numberedFile(value.file)
  }));
  const numberedDisputed = disputed.map((value) => ({
    ...value,
    file: numberedFile(value.file)
  }));

  if (agreed.length === 0 && disputed.length === 0) {
    return errorState("В распознанных документах не найдено содержимого для итогового разбора.");
  }

  const context = await buildCaseContext(caseId);
  const disputedNote = disputed.length > 0
    ? `\n\nСПОРНЫЕ МЕСТА. Перенеси их все в раздел «${CASE_REVIEW_UNREAD_HEADING}» дословно:\n${formatDisputed(numberedDisputed)}`
    : `\n\nСПОРНЫХ МЕСТ НЕТ. После разделителя «${CASE_REVIEW_UNREAD_HEADING}» напиши только «НЕТ».`;

  const result = await askClaude(
    `${CASE_REVIEW_SYSTEM_PROMPT}\n\nЯЗЫК РЕЗУЛЬТАТА: ${locale === "en" ? "English. Write both the client-ready text and the verification list in English." : "Русский. Оба раздела пиши по-русски."}\n\n${context ?? ""}`,
    [
      {
        role: "user",
        content: `Вот значения, переписанные из документов клиента и подтверждённые двумя независимыми чтениями. Сначала подготовь готовый клиентский текст, затем короткий блок проверки. Опирайся только на эти данные.\n\n${formatAgreed(
          numberedAgreed
        )}${disputedNote}`
      }
    ],
    4000
  );

  if (result.status !== "ok") {
    return errorState(
      "Ассистент сейчас недоступен. Попробуйте через минуту."
    );
  }

  const parsed = parseCaseReview(result.reply);

  if (parsed.status !== "ok") {
    return errorState("Ассистент вернул ответ, который не удалось разобрать.");
  }

  const { error: saveError } = await supabase.from("case_ai_reviews").upsert(
    {
      case_id: caseId,
      summary: parsed.parts.summary,
      draft: parsed.parts.draft,
      documents_fingerprint: fingerprintDocuments(documents),
      documents_count: documents.length,
      created_by: auth.userId,
      created_at: new Date().toISOString()
    },
    { onConflict: "case_id" }
  );

  if (saveError) {
    return errorState(
      "Разбор готов, но сохранить его не удалось. Применена ли миграция case_ai_reviews?"
    );
  }

  revalidatePath(`/admin/cases/${caseId}`);

  return {
    status: "success",
    message: `Итог собран из всех документов: ${documents.length}.`
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

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorState(locale === "en" ? "The database is unavailable." : "База данных недоступна.");

  const { data: review } = await supabase
    .from("case_ai_reviews")
    .select("id, case_id, draft, documents_fingerprint")
    .eq("id", reviewId)
    .eq("case_id", caseId)
    .maybeSingle();
  if (!review) return errorState(locale === "en" ? "The AI draft was not found." : "Черновик ИИ не найден.");

  const diff = diffReviewText(String(review.draft), approvedText);
  const { error } = await supabase.from("case_review_learning_events").insert({
    case_id: caseId,
    review_id: reviewId,
    ai_draft: String(review.draft),
    approved_text: approvedText,
    edit_operations: diff.operations,
    removed_fragments: diff.removed,
    added_fragments: diff.added,
    documents_fingerprint: String(review.documents_fingerprint),
    approved_by: auth.userId
  });

  if (error) return errorState(locale === "en" ? "Could not save the approval history. Apply the latest database migration." : "Не удалось сохранить историю утверждения. Примените последнюю миграцию базы данных.");
  revalidatePath(`/admin/cases/${caseId}`);
  return { status: "success", message: locale === "en" ? "Approved. The AI draft, edits, and final conclusion have been saved for learning." : "Утверждено. Черновик ИИ, правки и итоговое заключение сохранены для обучения." };
}
