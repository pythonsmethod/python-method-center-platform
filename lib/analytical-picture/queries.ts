import { caseEvidenceFingerprint } from "@/lib/cases/evidence-fingerprint";
import { readAllRows } from "@/lib/documents/read-all";
import { buildCaseAnalyticalPicture, type ExtractedClinicalEvidence, type PictureDocument, type PictureFact, type PictureReviewNote } from "./case-picture";
import {
  looksLikeUnselectedStandaloneTemplateChoice,
  type DisputedValue,
  type TranscribedValue,
} from "@/lib/assistant/transcription";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { TrendAssessment } from "@/lib/analysis/trend-gate";
import { prepareEvidenceForKaren } from "./evidence-presentation";
import { sourceAnchor } from "@/lib/documents/source";
import { makeReviewSnapshot, reviewMatchesSnapshot, reviewSnapshotToken, type StoredReviewSnapshot } from "./review-snapshot";

export type PictureQueryResult =
  | { status: "ready"; picture: ReturnType<typeof buildCaseAnalyticalPicture> }
  | { status: "unavailable"; message: string };

function isUnselectedStandaloneTemplateDispute(row: DisputedValue): boolean {
  const values = [row.first, row.second].filter((value): value is string => value !== null);
  return values.length > 0 && values.every((value) =>
    looksLikeUnselectedStandaloneTemplateChoice({
      file: row.file,
      section: row.section,
      label: row.label,
      value,
      reference: "",
      referenceConfirmed: false,
      confident: false,
      note: row.note,
    })
  );
}

export function projectStoredExtractionEvidence(input: { id: string; documentId: string; extractedAt?: string; agreed: TranscribedValue[]; disputed: DisputedValue[] }, allowedDocumentIds: Set<string>, _structuredKeys = new Set<string>()): ExtractedClinicalEvidence[] {
  if (!allowedDocumentIds.has(input.documentId)) throw new Error("Stored extraction belongs to another Case");
  const classify = (section: string, label: string): ExtractedClinicalEvidence["category"] => {
    const text = `${section} ${label}`.toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
    const has = (pattern: RegExp) => pattern.test(text);
    const signals = new Set<Exclude<ExtractedClinicalEvidence["category"], "UNKNOWN">>();
    const guidedProcedure = /\b(?:ultrasound|image)[ -]guided biopsy\b/;
    const explicitProcedure = has(/\b(procedure|surgery|surgical)\b|\b(?:ultrasound|image)[ -]guided biopsy\b|\bclip placement\b|\bspecimen collection\b/);
    const independentText = text.replace(guidedProcedure, "guided biopsy");
    if (/\b(radiology|radiological|mammography|mammogram|mri|imaging|bi-rads)\b/.test(independentText)) signals.add("RADIOLOGY");
    if (has(/\b(pathology|pathological|histology|histological|histologic)\b|\btissue exam\b/)) signals.add("PATHOLOGY");
    if (has(/\b(biomarker|receptor|her2|estrogen|progesterone|er|pgr)\b/)) signals.add("BIOMARKER");
    if (explicitProcedure) {
      signals.add("PROCEDURE");
    }
    return signals.size === 1 ? [...signals][0] : "UNKNOWN";
  };
  const projected: ExtractedClinicalEvidence[] = [
    ...input.agreed.flatMap((row, index) => looksLikeUnselectedStandaloneTemplateChoice(row) ? [] : [{ id: `${input.id}-agreed-${index}`, documentId: input.documentId, section: row.section, label: row.label, value: row.value, alternateValue: null, category: classify(row.section, row.label), trustState: "SOURCE_ONLY" as const, disputeReason: null, provenance: sourceAnchor(row), priority: "SUPPORTING" as const, reviewDecision: "PENDING" as const, correction: null }]),
    ...input.disputed.flatMap((row, index) => isUnselectedStandaloneTemplateDispute(row) ? [] : [{ id: `${input.id}-disputed-${index}`, documentId: input.documentId, section: row.section, label: row.label, value: row.first, alternateValue: row.second, category: classify(row.section, row.label), trustState: "NEEDS_REVIEW" as const, disputeReason: row.reason, provenance: sourceAnchor(row), priority: "SUPPORTING" as const, reviewDecision: "PENDING" as const, correction: null }]),
  ];
  return projected.map(item => {
    const match = /-(agreed|disputed)-(\d+)$/.exec(item.id)!;
    const kind = match[1] as "agreed" | "disputed";
    const index = Number(match[2]);
    const snapshot = makeReviewSnapshot({ extractionId: input.id, documentId: input.documentId, extractedAt: input.extractedAt ?? "", rowKind: kind, rowIndex: index, row: input[kind][index] });
    return { ...item, reviewSnapshot: snapshot };
  });
}

export async function getCaseAnalyticalPicture(caseId: string): Promise<PictureQueryResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "unavailable", message: "Supabase service access is not configured." };

  const before = await caseEvidenceFingerprint(caseId);
  if (!before) return { status: "unavailable", message: "CASE_PICTURE_DATA_UNAVAILABLE" };
  const [documentsResult, factsResult, runResult, notesResult] = await Promise.all([
    readAllRows((from, to) => supabase.from("uploaded_documents").select("id, original_filename, document_status, created_at").eq("case_id", caseId).is("archived_at", null).order("created_at").order("id").range(from, to)),
    readAllRows((from, to) => supabase.from("lab_values").select("id, document_id, measured_on, label_original, value_original, unit_original, value_canonical, unit_resolved, reference_original, analyte, unit_resolution_method, analysis_run_id, source_anchor, value_printed, comparison_context").eq("case_id", caseId).order("measured_on").order("id").range(from, to)),
    supabase.from("analysis_runs").select("id, document_id, created_at, trends, blocked, requests, excluded").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    readAllRows((from, to) => supabase.from("admin_notes").select("id, body, author_id, created_at, metadata").eq("case_id", caseId).order("created_at", { ascending: false }).order("id").range(from, to)),
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
  const documentIds = new Set(documents.map((item) => item.id));
  const extractionResult = documents.length ? await readAllRows((from, to) => supabase.from("document_extractions")
    .select("id, document_id, extracted_at, agreed_values, disputed_values")
    .eq("case_id", caseId)
    .order("id").range(from, to)) : { data: [], error: null };
  if (extractionResult.error) {
    console.error("Case Analytical Picture extraction query failed", { caseId, code: extractionResult.error.code });
    return { status: "unavailable", message: "CASE_PICTURE_DATA_UNAVAILABLE" };
  }
  const facts: PictureFact[] = (factsResult.data ?? []).filter(row => documentIds.has(String(row.document_id))).map((row) => ({
    comparisonContext: row.comparison_context ?? undefined,
    id: String(row.id), documentId: row.document_id ? String(row.document_id) : null,
    observedAt: row.measured_on ? String(row.measured_on) : null, label: String(row.label_original),
    originalValue: String(row.value_printed ?? row.value_original), originalUnit: row.value_printed ? null : row.unit_original ? String(row.unit_original) : null,
    canonicalValue: row.value_canonical === null ? null : Number(row.value_canonical), canonicalUnit: row.unit_resolved ? String(row.unit_resolved) : null,
    reference: row.reference_original ? String(row.reference_original) : null, comparisonKey: row.analyte ? String(row.analyte) : null,
    trustState: row.unit_resolution_method === "unresolved" ? "SOURCE_ONLY" : "NEEDS_REVIEW", provenance: sourceAnchor({ source: row.source_anchor }), analysisRunId: row.analysis_run_id ? String(row.analysis_run_id) : null,
  }));
  const structuredKeys = new Set(facts.map((item) => `${item.documentId}|${item.label}|${item.originalValue}`));
  const extractedEvidence: ExtractedClinicalEvidence[] = [];
  for (const extraction of extractionResult.data ?? []) {
    const documentId = String(extraction.document_id);
    if (!documentIds.has(documentId)) continue;
    extractedEvidence.push(...projectStoredExtractionEvidence({ id: String(extraction.id), documentId, extractedAt: String(extraction.extracted_at ?? ""), agreed: (extraction.agreed_values ?? []) as TranscribedValue[], disputed: (extraction.disputed_values ?? []) as DisputedValue[] }, documentIds, structuredKeys));
  }
  const run = runResult.data as { id?: string; created_at?: string; trends?: Record<string, TrendAssessment>; blocked?: PictureInputRun["blocked"]; requests?: string[]; excluded?: PictureInputRun["excluded"] } | null;
  const noteRows = notesResult.data ?? [];
  const notes: PictureReviewNote[] = noteRows.filter((row) => (row.metadata as { kind?: string } | null)?.kind === "case_picture_review").map((row) => ({
    id: String(row.id), body: String(row.body), authorId: row.author_id ? String(row.author_id) : null,
    createdAt: String(row.created_at), state: (row.metadata as { state?: string } | null)?.state === "confirmed" ? "confirmed" : "draft",
  }));
  const latestReviews = new Map<string, { decision: ExtractedClinicalEvidence["reviewDecision"]; correction: string | null; snapshot?: StoredReviewSnapshot; snapshot_token?: string; evidence_id?: string; document_id?: string }>();
  for (const row of noteRows) {
    const metadata = row.metadata as { kind?: string; evidence_id?: string; document_id?: string; snapshot?: StoredReviewSnapshot; snapshot_token?: string; decision?: string; correction?: string } | null;
    if (metadata?.kind !== "case_picture_evidence_review" || !metadata.evidence_id || latestReviews.has(metadata.evidence_id)) continue;
    const decision = metadata.decision;
    if (decision !== "CONFIRMED" && decision !== "CORRECTED" && decision !== "REJECTED") continue;
    latestReviews.set(metadata.evidence_id, { ...metadata, decision, correction: metadata.correction?.trim() || null });
  }
  const preparedEvidence = prepareEvidenceForKaren(extractedEvidence).map(item => {
    const review = latestReviews.get(item.id);
    const applies = review && reviewMatchesSnapshot(review, item.reviewSnapshot, item.id);
    return { ...item, reviewToken: item.reviewSnapshot ? reviewSnapshotToken(item.reviewSnapshot, item.id) : "",
      reviewDecision: applies ? review.decision : "PENDING" as const, correction: applies ? review.correction : null };
  });

  const newestDocumentAt = documents.reduce((latest, item) => item.createdAt > latest ? item.createdAt : latest, "");
  const analysisCurrent = Boolean(run?.id && run.created_at && run.created_at >= newestDocumentAt && documents.every(document => document.status === "ready"));
  if (await caseEvidenceFingerprint(caseId) !== before) return { status: "unavailable", message: "CASE_PICTURE_CHANGED_DURING_READ" };
  return { status: "ready", picture: buildCaseAnalyticalPicture({ caseId, documents, facts, extractedEvidence: preparedEvidence, trends: run?.trends ?? {}, blocked: run?.blocked ?? [], requests: run?.requests ?? [], excluded: run?.excluded ?? [], notes, analysisRunId: run?.id ? String(run.id) : null, analysisCurrent }) };
}

type PictureInputRun = {
  blocked: Array<{ analyte?: string; reason?: string; request?: string }>;
  excluded: Array<{ analyte?: string; documentId?: string; reason?: string }>;
};
