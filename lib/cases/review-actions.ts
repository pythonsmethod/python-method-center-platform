"use server";

import { revalidatePath } from "next/cache";
import { askClaude } from "@/lib/assistant/claude";
import {
  CASE_REVIEW_SYSTEM_PROMPT,
  parseCaseReview
} from "@/lib/assistant/case-review";
import { buildCaseContext } from "@/lib/assistant/case-context";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { loadCaseDocuments, readMimeType } from "@/lib/cases/case-documents";
import type { CaseReviewActionState } from "@/lib/cases/review-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

function errorState(message: string): CaseReviewActionState {
  return { status: "error", message };
}

const SKIPPED_REASON: Record<string, string> = {
  "too-big": "слишком большой файл",
  unsupported: "формат, который ассистент не читает",
  "no-room": "не поместился в один запрос",
  unreadable: "файл не удалось скачать"
};

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
    .select("id, storage_path, original_filename, metadata, created_at")
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

  const loaded = await loadCaseDocuments(
    (documents ?? []).map((row) => ({
      id: String(row.id),
      storage_path: String(row.storage_path),
      original_filename: String(row.original_filename ?? ""),
      mimeType: readMimeType(row.metadata),
      created_at: String(row.created_at)
    }))
  );

  if (!loaded) {
    return errorState("Хранилище документов недоступно.");
  }

  if (loaded.attachments.length === 0) {
    return errorState(
      "Ни один документ кейса не удалось прочитать — проверьте форматы файлов."
    );
  }

  const context = await buildCaseContext(caseId);
  const skippedNote =
    loaded.skipped.length > 0
      ? `\n\nВНИМАНИЕ: часть файлов не попала в этот запрос — ${loaded.skipped
          .map((item) => `«${item.name}» (${SKIPPED_REASON[item.reason] ?? item.reason})`)
          .join(", ")}. Скажи об этом первой строкой разбора.`
      : "";

  const result = await askClaude(
    `${CASE_REVIEW_SYSTEM_PROMPT}\n\n${context ?? ""}`,
    [
      {
        role: "user",
        content: `Прочитай приложенные анализы клиента и подготовь обе части по заданному формату.${skippedNote}`
      }
    ],
    4000,
    loaded.attachments
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
      documents_fingerprint: loaded.fingerprint,
      documents_count: loaded.attachments.length,
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
    message: `Прочитано документов: ${loaded.attachments.length}.`
  };
}
