import { ASSISTANT_MODEL } from "@/lib/assistant/claude";
import { METADATA_SYSTEM_PROMPT, parseMetadata, type DocumentHeader } from "@/lib/assistant/metadata";
import { askAssistantWithAttachments } from "@/lib/assistant/router";
import { relateDocument, resolveIdentity, type IdentityVerdict } from "@/lib/analysis/identity";
import { runAnalysis, type PriorLabValue } from "@/lib/analysis/pipeline";
import { hasAllVersions } from "@/lib/analysis/versions";
import { getLatestQuestionnaireFor } from "@/lib/health/queries";
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
  | { status: "identity_mismatch"; documentId: string }
  | { status: "retrying"; documentId: string }
  | { status: "needs_reupload"; documentId: string }
  | { status: "failed"; documentId: string };

// A document whose processing broke on our side, not on the file. Nothing
// used to be said about it: only the unreadable case wrote to the client, so
// a file that hit a service failure sat in the cabinet looking as if it were
// still being read. Now the cabinet shows only "in progress" and "ready", so
// silence here would be the whole story a person gets.
export function buildDocumentServiceFailureMessage(
  locale: "ru" | "en",
  filename: string
): string {
  return locale === "en"
    ? `We could not finish reading “${filename}” — this is a fault on our side, not with your file. The team has been told and will deal with it; you do not need to upload anything again. Your other documents are safe in the case and continue processing.`
    : `Нам не удалось дочитать файл «${filename}» — это сбой на нашей стороне, а не с вашим файлом. Команда уже знает и разберётся; загружать что-либо заново не нужно. Остальные документы сохранены в кейсе и продолжают обрабатываться.`;
}

export function buildDocumentReuploadMessage(
  locale: "ru" | "en",
  filename: string
): string {
  return locale === "en"
    ? `We could not read “${filename}” after several attempts. Please upload this file again as a clear scan or a sharper, evenly lit photograph with the whole page visible. If it is a large PDF, split it into smaller parts. Your other documents remain safely attached to the case and continue processing.`
    : `Нам не удалось распознать файл «${filename}» после нескольких попыток. Пожалуйста, загрузите именно этот файл ещё раз: лучше в виде чёткого скана или резкой фотографии при ровном освещении, чтобы страница целиком попадала в кадр. Большой PDF можно разделить на несколько частей. Остальные документы сохранены в кейсе и продолжают обрабатываться.`;
}

// The header names somebody else. The file is not read further and the
// person is asked, not accused: a maiden name, a typo in the profile or a
// relative's document under the family plan are all ordinary explanations,
// and the team settles it by hand.
export function buildIdentityMismatchMessage(
  locale: "ru" | "en",
  filename: string,
  printedName: string | null
): string {
  const who = printedName ? `«${printedName}»` : locale === "en" ? "another name" : "другое имя";

  return locale === "en"
    ? `The file “${filename}” seems to belong to someone else: the header shows ${who}. We have not read it further. If it is yours — for example, a former surname or a typo in your profile — write to us in the case chat and we will check it by hand. If it was attached by mistake, simply remove it.`
    : `Файл «${filename}», похоже, относится к другому человеку: в шапке указано ${who}. Дальше мы его не читали. Если это ваш документ — например, прежняя фамилия или опечатка в профиле, — напишите нам в чат кейса, и мы проверим вручную. Если файл попал случайно, просто удалите его.`;
}

export function buildDuplicateMessage(locale: "ru" | "en", filename: string): string {
  return locale === "en"
    ? `The file “${filename}” is the same document you already uploaded, so it was not added a second time. Your earlier copy stays in the case.`
    : `Файл «${filename}» — тот же документ, что вы уже загружали, поэтому второй раз он не добавлен. Ваша прежняя копия остаётся в кейсе.`;
}

async function readLocaleAndFilename(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  documentId: string
): Promise<{ locale: "ru" | "en"; filename: string }> {
  const { data } = await supabase
    .from("uploaded_documents")
    .select("original_filename, profiles(locale)")
    .eq("id", documentId)
    .maybeSingle();
  const locale = (data?.profiles as { locale?: string } | null)?.locale === "en" ? "en" : "ru";

  return {
    locale,
    filename: String(data?.original_filename ?? (locale === "en" ? "document" : "документ"))
  };
}

async function tellClient(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  job: ProcessingJob,
  body: string
): Promise<void> {
  const { error } = await supabase.from("case_messages").insert({
    case_id: job.case_id,
    profile_id: job.profile_id,
    sender_id: null,
    sender_role: "system",
    body
  });
  if (!error) {
    await supabase.from("document_processing_jobs")
      .update({ client_notified_at: new Date().toISOString() })
      .eq("id", job.id).is("client_notified_at", null);
  }
}

async function finishIdentityMismatch(
  job: ProcessingJob,
  header: DocumentHeader,
  verdict: IdentityVerdict
): Promise<ProcessDocumentResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "failed", documentId: job.document_id };

  await supabase.from("document_processing_jobs").update({
    status: "identity_mismatch",
    locked_at: null,
    last_error: verdict.reasons.join(" "),
    updated_at: new Date().toISOString()
  }).eq("id", job.id);
  await supabase.from("uploaded_documents")
    .update({ document_status: "identity_mismatch" }).eq("id", job.document_id);

  const { locale, filename } = await readLocaleAndFilename(supabase, job.document_id);
  await tellClient(supabase, job, buildIdentityMismatchMessage(locale, filename, header.fullName));

  return { status: "identity_mismatch", documentId: job.document_id };
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

  // Both endings are told to the client, because the cabinet no longer
  // distinguishes them in the document list: it shows "in progress" until a
  // file is read and "ready" once it is, and a file that ends here is
  // neither. The message is the only place the difference is explained.
  const { data: details } = await supabase
    .from("uploaded_documents")
    .select("original_filename, profiles(locale)")
    .eq("id", job.document_id)
    .maybeSingle();
  const locale = (details?.profiles as { locale?: string } | null)?.locale === "en" ? "en" : "ru";
  const filename = String(details?.original_filename ?? (locale === "en" ? "document" : "документ"));
  const body =
    kind === "unreadable"
      ? buildDocumentReuploadMessage(locale, filename)
      : buildDocumentServiceFailureMessage(locale, filename);

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

  // --- metadata_pre_extraction ---
  // A cheap pass over the header only. It answers two questions before the
  // document is read in full: whose it is, and whether the case already
  // holds this study. Not full OCR, on purpose: the header is a few lines.
  await supabase.from("document_processing_jobs")
    .update({ status: "pre_extracting", updated_at: new Date().toISOString() }).eq("id", job.id);

  const headerRead = await askAssistantWithAttachments(
    METADATA_SYSTEM_PROMPT,
    [{ role: "user", content: "Прочитай только шапку этого документа по заданному формату." }],
    600,
    loaded.attachments
  );
  if (headerRead.status !== "ok") {
    return finishFailure(
      job,
      "service",
      headerRead.status === "error" ? headerRead.message : "Reading provider is not configured"
    );
  }
  const header = parseMetadata(headerRead.reply);

  // --- identity_resolver ---
  // Name from the profile, date of birth from the questionnaire. Neither is
  // guessed from the document itself.
  const [{ data: profile }, questionnaire] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", job.profile_id).maybeSingle(),
    getLatestQuestionnaireFor(supabase, job.profile_id)
  ]);
  const identity = resolveIdentity(header, {
    fullName: profile?.full_name ? String(profile.full_name) : null,
    birthDate: questionnaire?.birth_date ?? null
  });

  await supabase.from("uploaded_documents").update({
    header,
    identity_status: identity.status,
    identity_reasons: identity.reasons
  }).eq("id", job.document_id);

  if (identity.status === "mismatch") {
    return finishIdentityMismatch(job, header, identity);
  }

  await supabase.from("document_processing_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", job.id);

  // --- full_extraction ---
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

  // --- duplicate_version_detection ---
  const { data: siblings } = await supabase
    .from("uploaded_documents")
    .select("id, header, version_of_document_id, document_extractions(source_fingerprint)")
    .eq("case_id", job.case_id)
    .neq("id", job.document_id)
    .is("archived_at", null);
  const existing = (siblings ?? []).map((row) => {
    const extraction = Array.isArray(row.document_extractions)
      ? row.document_extractions[0]
      : row.document_extractions;

    return {
      documentId: String(row.id),
      fingerprint: String((extraction as { source_fingerprint?: string } | null)?.source_fingerprint ?? ""),
      header: (row.header as DocumentHeader | null) ?? null
    };
  });
  const relation = relateDocument({ fingerprint: loaded.fingerprint, header }, existing);

  await supabase.from("uploaded_documents").update({
    duplicate_of_document_id: relation.kind === "duplicate" ? relation.of : null,
    version_of_document_id: relation.kind === "version" ? relation.of : null
  }).eq("id", job.document_id);

  const markReady = async () => {
    await supabase.from("document_processing_jobs").update({
      status: "ready",
      locked_at: null,
      last_error: null,
      updated_at: new Date().toISOString()
    }).eq("id", job.id);
    await supabase.from("uploaded_documents")
      .update({ document_status: "ready" }).eq("id", job.document_id);
  };

  if (relation.kind === "duplicate") {
    // Nothing new to analyse, and analysing it would put every value on the
    // timeline twice. The person is told, and the earlier copy stands.
    await markReady();
    const { locale, filename } = await readLocaleAndFilename(supabase, job.document_id);
    await tellClient(supabase, job, buildDuplicateMessage(locale, filename));
    return { status: "ready", documentId: job.document_id };
  }

  // --- unit_resolution → analysis_rcv ---
  // Earlier values of the case are the companions and the baseline. A
  // report that has since been corrected is left out: a trend through the
  // original and its correction would show a change that never happened.
  const superseded = new Set<string>(
    (siblings ?? [])
      .map((row) => row.version_of_document_id)
      .filter((id): id is string => typeof id === "string")
  );
  if (relation.kind === "version") superseded.add(relation.of);

  const { data: priorRows } = await supabase
    .from("lab_values")
    .select("document_id, analyte, measured_on, value_canonical, unit_resolved, unit_resolution_method, reference_low, reference_high, position_in_reference")
    .eq("case_id", job.case_id)
    .neq("document_id", job.document_id);
  const prior: PriorLabValue[] = (priorRows ?? [])
    .filter((row) => !superseded.has(String(row.document_id)))
    .map((row) => ({
      documentId: row.document_id ? String(row.document_id) : null,
      analyte: row.analyte ? String(row.analyte) : null,
      measured_on: row.measured_on ? String(row.measured_on) : null,
      value_canonical: row.value_canonical === null ? null : Number(row.value_canonical),
      unit_resolved: row.unit_resolved ? String(row.unit_resolved) : null,
      unit_resolution_method: String(row.unit_resolution_method),
      reference_low: row.reference_low === null ? null : Number(row.reference_low),
      reference_high: row.reference_high === null ? null : Number(row.reference_high),
      position_in_reference: row.position_in_reference === null ? null : Number(row.position_in_reference)
    }));

  const run = runAnalysis({
    documents: [{
      documentId: job.document_id,
      collectionDate: header.collectionDate,
      agreed: comparison.agreed.map((value) => ({
        label: value.label,
        value: value.value,
        reference: value.reference,
        referenceConfirmed: value.referenceConfirmed
      }))
    }],
    prior,
    questionnaire,
    extractionModelVersion: ASSISTANT_MODEL
  });

  // The five fields are a constraint in the table as well; this is the
  // earlier, plainer refusal.
  if (!hasAllVersions(run.versions)) {
    return finishFailure(job, "service", "Analysis run is missing a version field");
  }

  const { data: runRow, error: runError } = await supabase.from("analysis_runs").insert({
    case_id: job.case_id,
    profile_id: job.profile_id,
    document_id: job.document_id,
    ...run.versions,
    unit_unresolved: run.unitUnresolved,
    human_review_count: run.humanReview.length,
    blocked: run.blocked,
    requests: run.requests,
    trends: run.trends,
    excluded: run.excluded
  }).select("id").single();
  if (runError || !runRow) {
    return finishFailure(job, "service", runError?.message ?? "Analysis run not stored");
  }

  // Reprocessing replaces this document's values rather than adding to them.
  await supabase.from("lab_values").delete().eq("document_id", job.document_id);
  if (run.labValues.length > 0) {
    const { error: valuesError } = await supabase.from("lab_values").insert(
      run.labValues.map(({ document_id, ...record }) => ({
        ...record,
        document_id,
        case_id: job.case_id,
        profile_id: job.profile_id,
        analysis_run_id: runRow.id
      }))
    );
    if (valuesError) {
      return finishFailure(job, "service", valuesError.message);
    }
  }

  await markReady();
  return { status: "ready", documentId: job.document_id };
}
