import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RequeueCaseResult =
  | { status: "ready"; profileId: string; documentIds: string[] }
  | { status: "error"; message: string };

export function buildRequeueRecords(input: {
  caseId: string;
  profileId: string;
  documentIds: string[];
  now: string;
}) {
  return input.documentIds.map((documentId) => ({
    document_id: documentId,
    case_id: input.caseId,
    profile_id: input.profileId,
    status: "queued",
    attempts: 0,
    available_at: input.now,
    locked_at: null,
    last_error: null,
    client_notified_at: null,
    updated_at: input.now
  }));
}

/**
 * Requeues every active document in one existing Case. Source uploads stay
 * untouched; the next processing pass replaces only derived extraction and
 * analysis rows through the repository's existing idempotent pipeline.
 */
export async function requeueCaseDocuments(
  caseId: string
): Promise<RequeueCaseResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { status: "error", message: "Supabase service access is unavailable." };
  }

  const { data: clientCase, error: caseError } = await supabase
    .from("client_cases")
    .select("id, profile_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) return { status: "error", message: caseError.message };
  if (!clientCase) return { status: "error", message: "Case not found." };

  const { data: documents, error: documentsError } = await supabase
    .from("uploaded_documents")
    .select("id")
    .eq("case_id", caseId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (documentsError) {
    return { status: "error", message: documentsError.message };
  }

  const documentIds = (documents ?? []).map((document) => String(document.id));
  if (documentIds.length === 0) {
    return { status: "error", message: "Case has no active documents." };
  }

  const now = new Date().toISOString();
  const { error: queueError } = await supabase
    .from("document_processing_jobs")
    .upsert(buildRequeueRecords({
      caseId,
      profileId: String(clientCase.profile_id),
      documentIds,
      now
    }), { onConflict: "document_id" });

  if (queueError) return { status: "error", message: queueError.message };

  const { error: statusError } = await supabase
    .from("uploaded_documents")
    .update({ document_status: "queued" })
    .in("id", documentIds)
    .eq("case_id", caseId);

  if (statusError) return { status: "error", message: statusError.message };

  return {
    status: "ready",
    profileId: String(clientCase.profile_id),
    documentIds
  };
}
