import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit/log";
import {
  buildDocumentStoragePath,
  DOCUMENT_STORAGE_BUCKET,
  validateDocumentFile
} from "@/lib/documents/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

export const runtime = "nodejs";

// Registers a document the phone has already uploaded to private storage.
//
// The app uploads the file itself — Storage RLS pins the first path segment
// to auth.uid(), so that part is safe on its own. What it cannot do is write
// the audit row: audit_logs has no client insert policy, and it should not.
// So registration lands here, where the same checks the web action performs
// run against the same shared helpers, and the upload is recorded.
function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();
  const token = bearerToken(request);

  if (!supabase) {
    return NextResponse.json({ error: "Сервис недоступен." }, { status: 503 });
  }

  if (!token) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  }

  const { data: auth, error: authError } = await supabase.auth.getUser(token);

  if (authError || !auth.user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  }

  let payload: {
    documentId?: unknown;
    storagePath?: unknown;
    originalFilename?: unknown;
    mimeType?: unknown;
    fileSize?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const documentId = typeof payload.documentId === "string" ? payload.documentId : "";
  const storagePath = typeof payload.storagePath === "string" ? payload.storagePath : "";
  const originalFilename =
    typeof payload.originalFilename === "string" ? payload.originalFilename : "";
  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "";
  const fileSize = Number(payload.fileSize);

  if (!isUuid(documentId)) {
    return NextResponse.json({ error: "Некорректные данные документа." }, { status: 400 });
  }

  const validation = validateDocumentFile({
    name: originalFilename,
    size: fileSize,
    type: mimeType
  });

  if (validation.status === "invalid") {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  // The case is derived from the caller's identity — never taken from the
  // request — so one client can never register a file against another's case.
  const { data: caseRow } = await supabase
    .from("client_cases")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!caseRow) {
    return NextResponse.json({ error: "Сначала заполните анкету." }, { status: 409 });
  }

  const expectedPath = buildDocumentStoragePath({
    userId: auth.user.id,
    caseId: caseRow.id,
    documentId,
    originalFilename
  });

  if (storagePath !== expectedPath) {
    return NextResponse.json(
      { error: "Путь хранения документа не соответствует вашему аккаунту и кейсу." },
      { status: 400 }
    );
  }

  // Trust the row only once the object is really in the bucket.
  const { data: storedObjects, error: objectError } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .list(`${auth.user.id}/${caseRow.id}/${documentId}`, {
      limit: 1,
      search: validation.safeFilename
    });

  if (objectError) {
    return NextResponse.json({ error: "Не удалось проверить загруженный файл." }, { status: 502 });
  }

  if (!storedObjects?.some((object) => object.name === validation.safeFilename)) {
    return NextResponse.json({ error: "Загруженный файл не найден в хранилище." }, { status: 409 });
  }

  const { data: document, error: insertError } = await supabase
    .from("uploaded_documents")
    .insert({
      id: documentId,
      profile_id: auth.user.id,
      case_id: caseRow.id,
      document_type: "other",
      status: "uploaded",
      document_status: "uploaded",
      storage_path: storagePath,
      original_filename: originalFilename,
      metadata: {
        storage_bucket: DOCUMENT_STORAGE_BUCKET,
        mime_type: validation.mimeType,
        file_size: fileSize,
        uploaded_via: "mobile_app",
        storage_path_version: "user_case_document_filename_v1"
      }
    })
    .select("id, original_filename, document_type, status, document_status, storage_path, created_at")
    .single();

  if (insertError || !document) {
    return NextResponse.json(
      { error: "Не удалось сохранить документ. Попробуйте ещё раз." },
      { status: 502 }
    );
  }

  await writeAuditLog({
    profileId: auth.user.id,
    caseId: caseRow.id,
    actorId: auth.user.id,
    actorRole: "client",
    action: "document_uploaded",
    entityTable: "uploaded_documents",
    entityId: document.id,
    metadata: {
      storage_bucket: DOCUMENT_STORAGE_BUCKET,
      mime_type: validation.mimeType,
      file_size: fileSize,
      uploaded_via: "mobile_app"
    }
  });

  return NextResponse.json({ document }, { status: 201 });
}
