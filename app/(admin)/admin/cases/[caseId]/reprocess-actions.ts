"use server";

import { revalidatePath } from "next/cache";
import { canAccessProfessorMessages } from "@/lib/auth/require-karen";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { writeAuditLog } from "@/lib/audit/log";
import { requeueCaseDocuments } from "@/lib/documents/reprocessing";
import { confirmCaseDocumentIdentity } from "@/lib/documents/identity-review";
import { isUuid } from "@/lib/utils/uuid";

export type ReprocessCaseActionState = {
  status: "idle" | "error" | "queued";
  message: string;
  queuedCount: number;
  runId: string | null;
};

export type ConfirmIdentityActionState = ReprocessCaseActionState;

export async function confirmCaseDocumentIdentityAction(
  _previousState: ConfirmIdentityActionState,
  formData: FormData
): Promise<ConfirmIdentityActionState> {
  const caseId = String(formData.get("caseId") ?? "");
  const documentIds = formData.getAll("documentId").map(String);
  const locale = formData.get("locale") === "en" ? "en" : "ru";
  if (!isUuid(caseId) || documentIds.length === 0 || documentIds.some((id) => !isUuid(id))) {
    return { status: "error", message: locale === "ru" ? "Некорректные документы." : "Invalid documents.", queuedCount: 0, runId: null };
  }

  const auth = await getStaffUserState();
  const canOperate = auth.status === "authorized" && (
    auth.role === "admin" || canAccessProfessorMessages(auth.email)
  );
  if (!canOperate || auth.status !== "authorized") {
    return { status: "error", message: locale === "ru" ? "Нет доступа к проверке принадлежности." : "Identity review access denied.", queuedCount: 0, runId: null };
  }

  const result = await confirmCaseDocumentIdentity({ caseId, documentIds, reviewerId: auth.userId });
  if (result.status === "error") {
    return { status: "error", message: result.message, queuedCount: 0, runId: null };
  }

  await writeAuditLog({
    profileId: result.profileId,
    caseId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: "document_identity_confirmed",
    entityTable: "client_cases",
    entityId: caseId,
    metadata: {
      document_count: result.documentIds.length,
      document_ids: result.documentIds,
      automatic_identity_status_preserved: true
    }
  });
  revalidatePath(`/admin/cases/${caseId}`);
  return { status: "queued", message: "", queuedCount: result.documentIds.length, runId: crypto.randomUUID() };
}

export async function reprocessCaseDocumentsAction(
  _previousState: ReprocessCaseActionState,
  formData: FormData
): Promise<ReprocessCaseActionState> {
  const caseId = String(formData.get("caseId") ?? "");
  const locale = formData.get("locale") === "en" ? "en" : "ru";

  if (!isUuid(caseId)) {
    return {
      status: "error",
      message: locale === "ru" ? "Некорректный идентификатор кейса." : "Invalid case identifier.",
      queuedCount: 0,
      runId: null
    };
  }

  const auth = await getStaffUserState();
  const canOperate = auth.status === "authorized" && (
    auth.role === "admin" || canAccessProfessorMessages(auth.email)
  );
  if (!canOperate || auth.status !== "authorized") {
    return {
      status: "error",
      message: locale === "ru" ? "Нет доступа к повторной обработке." : "Reprocessing access denied.",
      queuedCount: 0,
      runId: null
    };
  }

  const result = await requeueCaseDocuments(caseId);
  if (result.status === "error") {
    return {
      status: "error",
      message: result.message,
      queuedCount: 0,
      runId: null
    };
  }

  await writeAuditLog({
    profileId: result.profileId,
    caseId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: "case_documents_requeued",
    entityTable: "client_cases",
    entityId: caseId,
    metadata: {
      document_count: result.documentIds.length,
      document_ids: result.documentIds
    }
  });

  revalidatePath(`/admin/cases/${caseId}`);

  return {
    status: "queued",
    message: "",
    queuedCount: result.documentIds.length,
    runId: crypto.randomUUID()
  };
}
