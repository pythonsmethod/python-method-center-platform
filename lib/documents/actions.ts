"use server";

import { redirect } from "next/navigation";
import {
  buildDocumentStoragePath,
  DOCUMENT_STORAGE_BUCKET,
  validateDocumentFile
} from "@/lib/documents/config";
import type {
  DocumentUploadActionState,
  UploadedDocument
} from "@/lib/documents/types";
import { writeAuditLog } from "@/lib/audit/log";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { enqueueDocumentProcessing } from "@/lib/documents/processing";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

type RecordUploadedDocumentInput = {
  caseId: string;
  documentId: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorState(message: string): DocumentUploadActionState {
  return { status: "error", message };
}

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export async function recordUploadedDocumentMetadata(
  input: RecordUploadedDocumentInput
): Promise<DocumentUploadActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/cabinet");
  }

  const locale = await getLocale();
  const t =
    locale === "en"
      ? {
          badInput: "The upload details are not valid.",
          wrongPath:
            "The storage path does not match your account and case.",
          noCase: "No case was found for your account.",
          notStored: "The uploaded file was not found in storage."
        }
      : {
          badInput: "Данные загрузки документа некорректны.",
          wrongPath:
            "Путь хранения документа не соответствует вашему аккаунту и кейсу.",
          noCase: "Кейс для вашего аккаунта не найден.",
          notStored: "Загруженный файл не найден в хранилище."
        };

  if (!isUuid(input.caseId) || !isUuid(input.documentId)) {
    return errorState(t.badInput);
  }

  const validation = validateDocumentFile(
    {
      name: input.originalFilename,
      size: input.fileSize,
      type: input.mimeType
    },
    locale
  );

  if (validation.status === "invalid") {
    return errorState(validation.message);
  }

  const expectedStoragePath = buildDocumentStoragePath({
    userId: user.id,
    caseId: input.caseId,
    documentId: input.documentId,
    originalFilename: input.originalFilename
  });

  if (input.storagePath !== expectedStoragePath) {
    return errorState(t.wrongPath);
  }

  const { data: clientCase, error: caseError } = await supabase
    .from("client_cases")
    .select("id")
    .eq("id", input.caseId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (caseError) {
    return errorState(caseError.message);
  }

  if (!clientCase) {
    return errorState(t.noCase);
  }

  const objectDirectory = `${user.id}/${input.caseId}/${input.documentId}`;
  const { data: storedObjects, error: objectError } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .list(objectDirectory, {
      limit: 1,
      search: validation.safeFilename
    });

  if (objectError) {
    return errorState(objectError.message);
  }

  if (!storedObjects?.some((object) => object.name === validation.safeFilename)) {
    return errorState(t.notStored);
  }

  const { data: document, error: documentError } = await supabase
    .from("uploaded_documents")
    .insert({
      id: input.documentId,
      profile_id: user.id,
      case_id: input.caseId,
      document_type: "other",
      status: "uploaded",
      document_status: "uploaded",
      storage_path: input.storagePath,
      original_filename: input.originalFilename,
      metadata: {
        storage_bucket: DOCUMENT_STORAGE_BUCKET,
        mime_type: validation.mimeType,
        file_size: input.fileSize,
        uploaded_via: "client_cabinet",
        storage_path_version: "user_case_document_filename_v1"
      }
    })
    .select(
      "id, profile_id, case_id, document_type, status, document_status, storage_path, original_filename, metadata, created_at"
    )
    .single();

  if (documentError) {
    return errorState(documentError.message);
  }

  await writeAuditLog({
    profileId: user.id,
    caseId: input.caseId,
    actorId: user.id,
    actorRole: "client",
    action: "document_uploaded",
    entityTable: "uploaded_documents",
    entityId: document.id,
    metadata: {
      storage_bucket: DOCUMENT_STORAGE_BUCKET,
      mime_type: validation.mimeType,
      file_size: input.fileSize
    }
  });

  const queued = await enqueueDocumentProcessing({
    documentId: document.id,
    caseId: input.caseId,
    profileId: user.id
  });

  return {
    status: "success",
    document: {
      ...document,
      document_status: queued ? "queued" : document.document_status
    } as UploadedDocument
  };
}

export async function deleteOwnDocument(documentId: string): Promise<{ status: "success" | "error"; message: string }> {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  const locale = await getLocale();
  const failure = locale === "ru" ? "Не удалось удалить документ." : "Could not delete the document.";
  if (!supabase || !service || !isUuid(documentId)) return { status: "error", message: failure };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cabinet/documents");
  const { data: document } = await service.from("uploaded_documents")
    .select("id, profile_id, case_id, storage_path, original_filename")
    .eq("id", documentId).eq("profile_id", user.id).maybeSingle();
  if (!document || !document.storage_path.startsWith(`${user.id}/`)) return { status: "error", message: failure };
  const removed = await service.storage.from(DOCUMENT_STORAGE_BUCKET).remove([document.storage_path]);
  if (removed.error) return { status: "error", message: removed.error.message };
  const deleted = await service.from("uploaded_documents").delete().eq("id", document.id).eq("profile_id", user.id);
  if (deleted.error) return { status: "error", message: deleted.error.message };
  await writeAuditLog({
    profileId: user.id,
    caseId: document.case_id,
    actorId: user.id,
    actorRole: "client",
    action: "document_deleted",
    entityTable: "uploaded_documents",
    entityId: document.id,
    metadata: { original_filename: document.original_filename }
  });
  revalidatePath("/cabinet/documents");
  return { status: "success", message: locale === "ru" ? "Документ удалён." : "Document deleted." };
}
