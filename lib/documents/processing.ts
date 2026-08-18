import { askAssistantWithAttachments } from "@/lib/assistant/router";
import {
  compareTranscriptions,
  parseTranscription,
  TRANSCRIPTION_SYSTEM_PROMPT
} from "@/lib/assistant/transcription";
import { loadCaseDocuments, readMimeType } from "@/lib/cases/case-documents";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const MAX_ATTEMPTS = 3;
const RETRY_MINUTES = [1, 5, 20];

type ProcessingJob = {
  id: string;
  document_id: string;
  case_id: string;
  profile_id: string;
  attempts: number;
};

export type ProcessDocumentResult =
  | { status: "idle" }
  | { status: "ready"; documentId: string }
  | { status: "retrying"; documentId: string }
  | { status: "needs_reupload"; documentId: string }
  | { status: "failed"; documentId: string };

export function buildDocumentReuploadMessage(
  locale: "ru" | "en",
  filename: string
): string {
  return locale === "en"
    ? `We could not read “${filename}” after several attempts. Please upload this file again as a clear scan or a sharper, evenly lit photograph with the whole page visible. If it is a large PDF, split it into smaller parts. Your other documents remain safely attached to the case and continue processing.`
    : `Нам не удалось распознать файл «${filename}» после нескольких попыток. Пожалуйста, загрузите именно этот файл ещё раз: лучше в виде чёткого скана или резкой фотографии при ровном освещении, чтобы страница целиком попадала в кадр. Большой PDF можно разделить на несколько частей. Остальные документы сохранены в кейсе и продолжают обрабатываться.`;
}

function retryAt(attempts: number): string {
  const minutes = RETRY_MINUTES[Math.min(Math.max(attempts - 1, 0), RETRY_MINUTES.length - 1)];
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function finishFailure(
  job: ProcessingJob,
  kind: "unreadable" | "service",
  error: string
): Promise<ProcessDocumentResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "failed", documentId: job.document_id };

  if (job.attempts < MAX_ATTEMPTS) {
    await supabase.from("document_processing_jobs").update({
      status: "queued",
      available_at: retryAt(job.attempts),
      locked_at: null,
      last_error: error,
      updated_at: new Date().toISOString()
    }).eq("id", job.id);
    await supabase.from("uploaded_documents")
      .update({ document_status: "queued" }).eq("id", job.document_id);
    return { status: "retrying", documentId: job.document_id };
  }

  const finalStatus = kind === "unreadable" ? "needs_reupload" : "failed";
  await supabase.from("document_processing_jobs").update({
    status: finalStatus,
    locked_at: null,
    last_error: error,
    updated_at: new Date().toISOString()
  }).eq("id", job.id);
  await supabase.from("uploaded_documents")
    .update({ document_status: finalStatus }).eq("id", job.document_id);

  if (kind === "unreadable") {
    const { data: details } = await supabase
      .from("uploaded_documents")
      .select("original_filename, profiles(locale)")
      .eq("id", job.document_id)
      .maybeSingle();
    const locale = (details?.profiles as { locale?: string } | null)?.locale === "en" ? "en" : "ru";
    const filename = String(details?.original_filename ?? (locale === "en" ? "document" : "документ"));
    const body = buildDocumentReuploadMessage(locale, filename);

    const { error: messageError } = await supabase.from("case_messages").insert({
      case_id: job.case_id,
      profile_id: job.profile_id,
      sender_id: null,
      sender_role: "system",
      body
    });
    if (!messageError) {
      await supabase.from("document_processing_jobs")
        .update({ client_notified_at: new Date().toISOString() })
        .eq("id", job.id).is("client_notified_at", null);
    }
  }

  return { status: finalStatus, documentId: job.document_id };
}

export async function enqueueDocumentProcessing(input: {
  documentId: string;
  caseId: string;
  profileId: string;
}): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from("document_processing_jobs").upsert({
    document_id: input.documentId,
    case_id: input.caseId,
    profile_id: input.profileId,
    status: "queued",
    available_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: "document_id", ignoreDuplicates: true });

  if (!error) {
    await supabase.from("uploaded_documents")
      .update({ document_status: "queued" }).eq("id", input.documentId);
  }
  return !error;
}

export async function processNextDocument(): Promise<ProcessDocumentResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "idle" };

  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_document_processing_job"
  );
  if (claimError || !claimed?.[0]) return { status: "idle" };

  const job = claimed[0] as ProcessingJob;
  await supabase.from("uploaded_documents")
    .update({ document_status: "processing" }).eq("id", job.document_id);

  const { data: document, error: documentError } = await supabase
    .from("uploaded_documents")
    .select("id, storage_path, original_filename, metadata, created_at")
    .eq("id", job.document_id)
    .maybeSingle();
  if (documentError || !document) {
    return finishFailure(job, "service", documentError?.message ?? "Document row not found");
  }

  const loaded = await loadCaseDocuments([{
    id: String(document.id),
    storage_path: String(document.storage_path),
    original_filename: String(document.original_filename ?? "document"),
    mimeType: readMimeType(document.metadata),
    created_at: String(document.created_at)
  }]);
  if (!loaded || loaded.attachments.length !== 1) {
    return finishFailure(job, "unreadable", loaded?.skipped[0]?.reason ?? "Storage unavailable");
  }

  const prompt = "Перепиши всё содержимое этого документа по заданному формату. Не пропускай ни одной строки, даты, подписи или части заключения.";
  // Run the two independent readings sequentially. Parallel vision requests
  // hit provider rate limits on real multi-file cases and wasted both reads;
  // independence means separate calls, not simultaneous calls.
  const first = await askAssistantWithAttachments(
    TRANSCRIPTION_SYSTEM_PROMPT,
    [{ role: "user", content: prompt }],
    8000,
    loaded.attachments
  );
  if (first.status !== "ok") {
    return finishFailure(
      job,
      "service",
      first.status === "error" ? first.message : "Reading provider is not configured"
    );
  }

  const second = await askAssistantWithAttachments(
    TRANSCRIPTION_SYSTEM_PROMPT,
    [{ role: "user", content: prompt }],
    8000,
    loaded.attachments
  );
  if (second.status !== "ok") {
    return finishFailure(
      job,
      "service",
      second.status === "error" ? second.message : "Reading provider is not configured"
    );
  }

  const firstRows = parseTranscription(first.reply);
  const secondRows = parseTranscription(second.reply);
  const comparison = compareTranscriptions(firstRows, secondRows);
  if (comparison.agreed.length === 0 && comparison.disputed.length === 0) {
    return finishFailure(job, "unreadable", "No readable content found");
  }

  const { error: extractionError } = await supabase.from("document_extractions").upsert({
    document_id: job.document_id,
    case_id: job.case_id,
    profile_id: job.profile_id,
    source_fingerprint: loaded.fingerprint,
    agreed_values: comparison.agreed,
    disputed_values: comparison.disputed,
    first_reading: firstRows,
    second_reading: secondRows,
    extracted_at: new Date().toISOString()
  }, { onConflict: "document_id" });
  if (extractionError) {
    return finishFailure(job, "service", extractionError.message);
  }

  await supabase.from("document_processing_jobs").update({
    status: "ready",
    locked_at: null,
    last_error: null,
    updated_at: new Date().toISOString()
  }).eq("id", job.id);
  await supabase.from("uploaded_documents")
    .update({ document_status: "ready" }).eq("id", job.document_id);
  return { status: "ready", documentId: job.document_id };
}
