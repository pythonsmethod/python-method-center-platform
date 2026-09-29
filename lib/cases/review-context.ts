import type { CaseAnalyticalPicture } from "@/lib/analytical-picture/case-picture";

// The UI picture carries duplicate primary/review lists and action-only
// snapshots/tokens. The model receives every fact and extracted row once,
// with its stable ID and page/hash; the full literal readings are supplied
// separately by formatAgreed/formatDisputed. Never silently truncate rows.
export function compactCaseReviewContext(picture: CaseAnalyticalPicture): string {
  const source = (anchor: { level: string; page: number | null; sourceHash?: string | null; related?: { page: number | null; sourceHash?: string | null } }) => ({
    level: anchor.level, page: anchor.page, sourceHash: anchor.sourceHash ?? null,
    ...(anchor.related ? { related: { page: anchor.related.page, sourceHash: anchor.related.sourceHash ?? null } } : {}),
  });
  return JSON.stringify({
    caseId: picture.caseId,
    documents: picture.documents,
    timeline: picture.timeline.map(({ provenance, ...fact }) => ({ ...fact, provenance: source(provenance) })),
    extractedEvidence: picture.extractedEvidence.map(({ reviewSnapshot: _snapshot, reviewToken: _token, provenance, ...row }) => ({
      ...row, provenance: source(provenance),
    })),
    comparisons: picture.comparisons,
    contradictions: picture.contradictions,
    missingContext: picture.missingContext,
    reviewSummary: picture.reviewSummary,
    notes: picture.notes,
    limitations: picture.limitations,
  });
}
