import { buildCaseAnalyticalPicture, type PictureDocument, type PictureFact, type PictureReviewNote } from "./case-picture";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { TrendAssessment } from "@/lib/analysis/trend-gate";

export type PictureQueryResult =
  | { status: "ready"; picture: ReturnType<typeof buildCaseAnalyticalPicture> }
  | { status: "unavailable"; message: string };

export async function getCaseAnalyticalPicture(caseId: string): Promise<PictureQueryResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "unavailable", message: "Supabase service access is not configured." };

  const [documentsResult, factsResult, runResult, notesResult] = await Promise.all([
    supabase.from("uploaded_documents").select("id, original_filename, document_status, created_at").eq("case_id", caseId).is("archived_at", null).order("created_at"),
    supabase.from("lab_values").select("id, document_id, measured_on, label_original, value_original, unit_original, value_canonical, unit_resolved, reference_original, analyte, unit_resolution_method, analysis_run_id").eq("case_id", caseId).order("measured_on"),
    supabase.from("analysis_runs").select("id, document_id, created_at, trends, blocked, requests, excluded").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("admin_notes").select("id, body, author_id, created_at, metadata").eq("case_id", caseId).contains("metadata", { kind: "case_picture_review" }).order("created_at", { ascending: false }),
  ]);

  const firstError = documentsResult.error ?? factsResult.error ?? runResult.error ?? notesResult.error;
  if (firstError) {
    console.error("Case Analytical Picture query failed", { caseId, code: firstError.code });
    return { status: "unavailable", message: "CASE_PICTURE_DATA_UNAVAILABLE" };
  }

  const documents: PictureDocument[] = (documentsResult.data ?? []).map((row) => ({
    id: String(row.id), name: row.original_filename ? String(row.original_filename) : null,
    status: String(row.document_status ?? "unknown"), createdAt: String(row.created_at), identityStatus: row.document_status === "identity_mismatch" ? "mismatch" : "unknown",
  }));
  const facts: PictureFact[] = (factsResult.data ?? []).map((row) => ({
    id: String(row.id), documentId: row.document_id ? String(row.document_id) : null,
    observedAt: row.measured_on ? String(row.measured_on) : null, label: String(row.label_original),
    originalValue: String(row.value_original), originalUnit: row.unit_original ? String(row.unit_original) : null,
    canonicalValue: row.value_canonical === null ? null : Number(row.value_canonical), canonicalUnit: row.unit_resolved ? String(row.unit_resolved) : null,
    reference: row.reference_original ? String(row.reference_original) : null, comparisonKey: row.analyte ? String(row.analyte) : null,
    trustState: row.unit_resolution_method === "unresolved" ? "SOURCE_ONLY" : "NEEDS_REVIEW", provenance: { level: "DOCUMENT", page: null }, analysisRunId: row.analysis_run_id ? String(row.analysis_run_id) : null,
  }));
  const run = runResult.data as { id?: string; created_at?: string; trends?: Record<string, TrendAssessment>; blocked?: PictureInputRun["blocked"]; requests?: string[]; excluded?: PictureInputRun["excluded"] } | null;
  const notes: PictureReviewNote[] = (notesResult.data ?? []).map((row) => ({
    id: String(row.id), body: String(row.body), authorId: row.author_id ? String(row.author_id) : null,
    createdAt: String(row.created_at), state: (row.metadata as { state?: string } | null)?.state === "confirmed" ? "confirmed" : "draft",
  }));

  const newestDocumentAt = documents.reduce((latest, item) => item.createdAt > latest ? item.createdAt : latest, "");
  const analysisCurrent = Boolean(run?.id && run.created_at && run.created_at >= newestDocumentAt);
  return { status: "ready", picture: buildCaseAnalyticalPicture({ caseId, documents, facts, trends: run?.trends ?? {}, blocked: run?.blocked ?? [], requests: run?.requests ?? [], excluded: run?.excluded ?? [], notes, analysisRunId: run?.id ? String(run.id) : null, analysisCurrent }) };
}

type PictureInputRun = {
  blocked: Array<{ analyte?: string; reason?: string; request?: string }>;
  excluded: Array<{ analyte?: string; documentId?: string; reason?: string }>;
};
