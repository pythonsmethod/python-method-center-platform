import { getStaffCaseDetail } from "@/lib/cases/staff-queries";
import { getCaseReview } from "@/lib/cases/review-queries";
import { assistantSource, renderSourceContext, type AssistantSource } from "@/lib/assistant/source-context";

/** Snapshot projection only: no new store, source reading or trust promotion. */
export async function buildCaseSources(caseId: string): Promise<AssistantSource[]> {
  const retrievedAt = new Date().toISOString();
  const result = await getStaffCaseDetail(caseId);
  if (result.status !== "ready" || !result.case || result.case.id !== caseId) {
    return [assistantSource({ id: "case", kind: "system_record", origin: "client_cases", availability: result.status === "ready" && !result.case ? "absent" : "unavailable", retrievedAt, scope: "selected Case only", data: null })];
  }
  const detail = result.case;
  const sources: AssistantSource[] = [];
  const add = (source: Omit<Parameters<typeof assistantSource>[0], "retrievedAt">) => sources.push(assistantSource({ ...source, retrievedAt }));
  add({ id: "case", kind: "system_record", origin: "client_cases", availability: "available", recordedAt: detail.updated_at, freshness: "current_snapshot", scope: "selected Case metadata; not clinical verification", data: { id: detail.id, created_at: detail.created_at, direction: detail.direction } });
  add({ id: "profile", kind: "user_report", origin: "profiles", availability: detail.profiles ? "available" : "absent", scope: "profile contact fields, not independent identity verification", data: detail.profiles ? { full_name: detail.profiles.full_name, email: detail.profiles.email, phone: detail.profiles.phone } : null });
  add({ id: "case_summary", kind: "ai_draft", origin: "client_cases.summary", availability: detail.summary ? "available" : "absent", scope: "authorship/review unknown; treated conservatively as unverified summary", data: detail.summary });
  const submission = detail.onboarding_submissions?.[0];
  add({ id: "questionnaire", kind: "user_report", origin: "onboarding_submissions", availability: submission ? "available" : "absent", recordedAt: submission?.submitted_at ?? null, scope: "client's own report; payload excerpt up to 4000 characters", data: submission ? { status: submission.status, payload_excerpt: JSON.stringify(submission.payload).slice(0, 4000) } : null });
  const documents = detail.uploaded_documents ?? [];
  add({ id: "documents", kind: "system_record", origin: "uploaded_documents", availability: documents.length ? "available" : "absent", freshness: "current_snapshot", scope: "selected Case inventory; up to 30 metadata rows shown; metadata_only, file contents not read", data: { inventory_count: documents.length, rows: documents.slice(0, 30).map((doc) => ({ id: doc.id, name: doc.original_filename, document_status: doc.document_status, created_at: doc.created_at })) } });
  const review = await getCaseReview(detail.id, documents);
  add({ id: "ai_review", kind: "ai_draft", origin: "case_ai_reviews.summary", availability: review ? "available" : "unavailable", recordedAt: review?.createdAt ?? null, humanReviewed: false, freshness: review?.isCurrent ? "unknown" : "historical", scope: "AI summary only; never source facts or a Karen decision, even if another field has approval", data: review ? { text: review.summary, documents_count: review.documentsCount, matches_current_inventory: review.isCurrent } : null });
  // Approval belongs only to approvedText, never to the separate AI summary.
  if (review?.approvedText && review.approvedAt) {
    add({ id: "karen_decision", kind: "human_decision", origin: "case_review_learning_events.approved_text", availability: "available", recordedAt: review.approvedAt, humanReviewed: true, freshness: review.isCurrent ? "current_snapshot" : "historical", scope: "human-approved wording for this document version only; not a VERIFIED clinical fact", data: { text: review.approvedText, matches_current_inventory: review.isCurrent } });
  }
  const payments = detail.payments ?? [];
  add({ id: "payments", kind: "system_record", origin: "payments", availability: payments.length ? "available" : "absent", freshness: "current_snapshot", scope: "selected Case; up to 15 payment records; no action performed by this chat", data: payments.slice(0, 15).map((payment) => ({ id: payment.id, product: payment.product, status: payment.status, amount_cents: payment.amount_cents, currency: payment.currency, paid_at: payment.paid_at, created_at: payment.created_at })) });
  const events = detail.case_lifecycle_events ?? [];
  add({ id: "events", kind: "system_record", origin: "case_lifecycle_events", availability: events.length ? "available" : "absent", freshness: "current_snapshot", scope: "up to 25 historical events; not receipts for actions in this request", data: events.slice(0, 25).map((event) => ({ id: event.id, event_type: event.event_type, created_at: event.created_at })) });
  add({ id: "event_notes", kind: "user_report", origin: "case_lifecycle_events.notes", availability: events.some((event) => event.notes) ? "available" : "absent", scope: "staff-entered notes; author/review not independently verified", data: events.slice(0, 25).filter((event) => event.notes).map((event) => ({ id: event.id, notes: event.notes, created_at: event.created_at })) });
  return sources;
}

export async function buildCaseContext(caseId: string): Promise<string | null> {
  return renderSourceContext(await buildCaseSources(caseId));
}
