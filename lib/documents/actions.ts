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
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    return errorState("Сервис временно недоступен: не настроено подключение к базе данных.");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/cabinet");
  }

  if (!isUuid(input.caseId) || !isUuid(input.documentId)) {
    return errorState("Данные загрузки документа некорректны.");
  }

  const validation = validateDocumentFile({
    name: input.originalFilename,
    size: input.fileSize,
    type: input.mimeType
  });

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
    return errorState("Путь хранения документа не соответствует вашему аккаунту и кейсу.");
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
    return errorState("Кейс для вашего аккаунта не найден.");
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
    return errorState("Загруженный файл не найден в хранилище.");
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

  return {
    status: "success",
    document: document as UploadedDocument
  };
}
