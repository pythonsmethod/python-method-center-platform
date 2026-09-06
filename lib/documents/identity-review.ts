import { buildRequeueRecords } from "@/lib/documents/reprocessing";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type DocumentIdentityReviewStatus = "unreviewed" | "confirmed_belongs_to_case";

export function shouldBlockIdentityMismatch(
  automaticStatus: string,
  reviewStatus: DocumentIdentityReviewStatus | string | null | undefined
): boolean {
  return automaticStatus === "mismatch" && reviewStatus !== "confirmed_belongs_to_case";
}

export type ConfirmDocumentIdentityResult =
  | { status: "ready"; profileId: string; documentIds: string[] }
  | { status: "error"; message: string };

export async function confirmCaseDocumentIdentity(input: {
  caseId: string;
  documentIds: string[];
  reviewerId: string;
}): Promise<ConfirmDocumentIdentityResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "error", message: "Supabase service access is unavailable." };

  const uniqueDocumentIds = [...new Set(input.documentIds)];
  if (uniqueDocumentIds.length === 0) return { status: "error", message: "No documents were selected." };

  const { data: clientCase, error: caseError } = await supabase
    .from("client_cases")
    .select("id, profile_id")
    .eq("id", input.caseId)
    .maybeSingle();
  if (caseError) return { status: "error", message: caseError.message };
  if (!clientCase) return { status: "error", message: "Case not found." };

  const { data: documents, error: documentsError } = await supabase
    .from("uploaded_documents")
    .select("id, profile_id, document_status")
    .eq("case_id", input.caseId)
    .in("id", uniqueDocumentIds)
    .is("archived_at", null);
  if (documentsError) return { status: "error", message: documentsError.message };

  const eligible = (documents ?? []).filter((document) =>
    document.document_status === "identity_mismatch" &&
    String(document.profile_id) === String(clientCase.profile_id)
  );
  if (eligible.length !== uniqueDocumentIds.length) {
    return { status: "error", message: "Every selected document must belong to this Case and require identity review." };
  }

  const documentIds = eligible.map((document) => String(document.id));
  const now = new Date().toISOString();
  const { error: reviewError } = await supabase
    .from("uploaded_documents")
    .update({
      identity_review_status: "confirmed_belongs_to_case",
      identity_reviewed_at: now,
      identity_reviewed_by: input.reviewerId
    })
    .eq("case_id", input.caseId)
    .in("id", documentIds)
    .eq("document_status", "identity_mismatch");
  if (reviewError) return { status: "error", message: reviewError.message };

  const { error: queueError } = await supabase
    .from("document_processing_jobs")
    .upsert(buildRequeueRecords({
      caseId: input.caseId,
      profileId: String(clientCase.profile_id),
      documentIds,
      now
    }), { onConflict: "document_id" });
  if (queueError) return { status: "error", message: queueError.message };

  const { error: statusError } = await supabase
    .from("uploaded_documents")
    .update({ document_status: "queued" })
    .eq("case_id", input.caseId)
    .in("id", documentIds);
  if (statusError) return { status: "error", message: statusError.message };

  return { status: "ready", profileId: String(clientCase.profile_id), documentIds };
}
