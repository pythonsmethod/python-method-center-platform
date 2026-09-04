import type { TrendAssessment } from "@/lib/analysis/trend-gate";

export type PictureDocument = {
  id: string;
  name: string | null;
  status: string;
  createdAt: string;
  identityStatus: string;
};

export type PictureFact = {
  id: string;
  documentId: string | null;
  observedAt: string | null;
  label: string;
  originalValue: string;
  originalUnit: string | null;
  canonicalValue: number | null;
  canonicalUnit: string | null;
  reference: string | null;
  comparisonKey: string | null;
  trustState: "NEEDS_REVIEW" | "SOURCE_ONLY";
  provenance: { level: "DOCUMENT"; page: null };
  analysisRunId: string | null;
};

export type PictureReviewNote = {
  id: string;
  body: string;
  state: "draft" | "confirmed";
  authorId: string | null;
  createdAt: string;
};

export type CaseAnalyticalPicture = {
  caseId: string;
  documents: PictureDocument[];
  timeline: PictureFact[];
  comparisons: Array<{
    comparisonKey: string;
    verdict: "POTENTIAL_CHANGE" | "NO_CONFIRMED_CHANGE" | "NOT_COMPARABLE" | "INSUFFICIENT_DATA";
    reasonCode: "SIGNIFICANT_THRESHOLD" | "BELOW_THRESHOLD" | "UNIT_MISMATCH" | "MISSING_DATES" | "STALE_ANALYSIS" | "INSUFFICIENT_EVIDENCE";
    evidenceFactIds: string[];
    reviewRequired: true;
  }>;
  contradictions: Array<{ code: "BLOCKED_EVIDENCE" | "IDENTITY_MISMATCH"; subject: string | null }>;
  missingContext: Array<{ code: "NO_DOCUMENTS" | "NO_STRUCTURED_FACTS" | "MISSING_DATES" | "ANALYSIS_REQUESTS" | "EXCLUDED_EVIDENCE" | "PAGE_TOKEN_PROVENANCE" | "STALE_ANALYSIS"; count?: number }>;
  reviewQueue: PictureFact[];
  notes: PictureReviewNote[];
  limitations: Array<"NOT_DIAGNOSIS" | "NO_CAUSALITY" | "NO_LIVE_TRUST_PERSISTENCE">;
};

export type PictureInput = {
  caseId: string;
  documents: PictureDocument[];
  facts: PictureFact[];
  trends: Record<string, TrendAssessment>;
  blocked: Array<{ analyte?: string; reason?: string; request?: string }>;
  requests: string[];
  excluded: Array<{ analyte?: string; documentId?: string; reason?: string }>;
  notes: PictureReviewNote[];
  analysisRunId: string | null;
  analysisCurrent: boolean;
};

/** A read-only projection. It never changes trust, facts, or Case state. */
export function buildCaseAnalyticalPicture(input: PictureInput): CaseAnalyticalPicture {
  const documentIds = new Set(input.documents.map((document) => document.id));
  if (input.facts.some((fact) => fact.documentId && !documentIds.has(fact.documentId))) {
    throw new Error("Case picture cannot include a fact from another Case");
  }

  const timeline = [...input.facts].sort((left, right) =>
    (left.observedAt ?? "9999").localeCompare(right.observedAt ?? "9999"),
  );
  const factsByKey = new Map<string, PictureFact[]>();
  for (const fact of timeline) {
    if (!fact.comparisonKey) continue;
    factsByKey.set(fact.comparisonKey, [...(factsByKey.get(fact.comparisonKey) ?? []), fact]);
  }

  const comparisons = Object.entries(input.trends).map(([comparisonKey, trend]) => {
    const evidence = (factsByKey.get(comparisonKey) ?? []).filter((fact) => fact.analysisRunId === input.analysisRunId);
    const evidenceFactIds = evidence.map((fact) => fact.id);
    if (!input.analysisCurrent) return { comparisonKey, verdict: "INSUFFICIENT_DATA" as const, reasonCode: "STALE_ANALYSIS" as const, evidenceFactIds, reviewRequired: true as const };
    if (evidence.length < 2) return { comparisonKey, verdict: "INSUFFICIENT_DATA" as const, reasonCode: "INSUFFICIENT_EVIDENCE" as const, evidenceFactIds, reviewRequired: true as const };
    if (evidence.some((fact) => !fact.observedAt)) return { comparisonKey, verdict: "NOT_COMPARABLE" as const, reasonCode: "MISSING_DATES" as const, evidenceFactIds, reviewRequired: true as const };
    if (new Set(evidence.map((fact) => fact.canonicalUnit)).size !== 1 || evidence.some((fact) => !fact.canonicalUnit)) return { comparisonKey, verdict: "NOT_COMPARABLE" as const, reasonCode: "UNIT_MISMATCH" as const, evidenceFactIds, reviewRequired: true as const };
    if (trend.verdict === "significant") {
      return { comparisonKey, verdict: "POTENTIAL_CHANGE" as const, reasonCode: "SIGNIFICANT_THRESHOLD" as const, evidenceFactIds, reviewRequired: true as const };
    }
    if (trend.verdict === "noise") {
      return { comparisonKey, verdict: "NO_CONFIRMED_CHANGE" as const, reasonCode: "BELOW_THRESHOLD" as const, evidenceFactIds, reviewRequired: true as const };
    }
    if (trend.verdict === "not_comparable") {
      return { comparisonKey, verdict: "NOT_COMPARABLE" as const, reasonCode: "UNIT_MISMATCH" as const, evidenceFactIds, reviewRequired: true as const };
    }
    return { comparisonKey, verdict: "INSUFFICIENT_DATA" as const, reasonCode: "INSUFFICIENT_EVIDENCE" as const, evidenceFactIds, reviewRequired: true as const };
  });

  const contradictions: CaseAnalyticalPicture["contradictions"] = [
    ...input.blocked.map((item) => ({ code: "BLOCKED_EVIDENCE" as const, subject: item.analyte ?? null })),
    ...input.documents.filter((document) => document.identityStatus === "mismatch").map((document) => ({ code: "IDENTITY_MISMATCH" as const, subject: document.name ?? document.id })),
  ];
  const missingContext: CaseAnalyticalPicture["missingContext"] = [
    ...(input.documents.length === 0 ? [{ code: "NO_DOCUMENTS" as const }] : []),
    ...(input.facts.length === 0 ? [{ code: "NO_STRUCTURED_FACTS" as const }] : []),
    ...(input.facts.some((fact) => !fact.observedAt) ? [{ code: "MISSING_DATES" as const }] : []),
    ...(input.requests.length ? [{ code: "ANALYSIS_REQUESTS" as const, count: input.requests.length }] : []),
    ...(input.excluded.length ? [{ code: "EXCLUDED_EVIDENCE" as const, count: input.excluded.length }] : []),
    ...(!input.analysisCurrent && input.analysisRunId ? [{ code: "STALE_ANALYSIS" as const }] : []),
    { code: "PAGE_TOKEN_PROVENANCE" as const },
  ];

  return {
    caseId: input.caseId,
    documents: [...input.documents],
    timeline,
    comparisons,
    contradictions,
    missingContext,
    reviewQueue: timeline.filter((fact) => fact.trustState !== "NEEDS_REVIEW" || fact.provenance.page === null),
    notes: [...input.notes].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    limitations: ["NOT_DIAGNOSIS", "NO_CAUSALITY", "NO_LIVE_TRUST_PERSISTENCE"],
  };
}
