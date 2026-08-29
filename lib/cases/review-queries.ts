import {
  fingerprintDocuments,
  type CaseDocumentRow
} from "@/lib/cases/case-documents";
import type { CaseReview } from "@/lib/cases/review-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// The stored reading, if there is one. Read with the service key: the
// table has RLS on and no policy, so a client cannot reach the machine's
// opinion about their own analyses even if they went looking.
//
// Fails soft everywhere. A case page that cannot show the reading is worth
// far more than a case page that will not open — and the reading is a
// convenience, not the case.
export async function getCaseReview(
  caseId: string,
  documents: Pick<CaseDocumentRow, "id" | "created_at">[]
): Promise<CaseReview | null> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("case_ai_reviews")
    .select("id, summary, draft, documents_fingerprint, documents_count, created_at")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const current = fingerprintDocuments(documents);
  const { data: approvals } = await supabase
    .from("case_review_learning_events")
    .select("ai_draft, approved_text, approved_at")
    .eq("review_id", data.id)
    .eq("documents_fingerprint", data.documents_fingerprint)
    .order("approved_at", { ascending: false })
    .limit(100);
  const matchingApprovals = (approvals ?? []).filter(
    (approval) => String(approval.ai_draft ?? "") === String(data.draft ?? "")
  );
  const latestApproval = matchingApprovals[0] ?? null;

  return {
    id: String(data.id),
    summary: String(data.summary ?? ""),
    draft: String(data.draft ?? ""),
    documentsFingerprint: String(data.documents_fingerprint ?? ""),
    documentsCount: Number(data.documents_count ?? 0),
    createdAt: String(data.created_at ?? ""),
    isCurrent: String(data.documents_fingerprint ?? "") === current,
    approvedText: latestApproval ? String(latestApproval.approved_text ?? "") : null,
    approvedAt: latestApproval ? String(latestApproval.approved_at ?? "") : null,
    approvalCount: matchingApprovals.length
  };
}
