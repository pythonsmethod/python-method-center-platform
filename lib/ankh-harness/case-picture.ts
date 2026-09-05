import { evidenceForKaren, type EvidencePackage, type TrustState } from "@/lib/verification-trust";

export type CaseEvidenceObservation = {
  package: EvidencePackage;
  observedAt: string | null;
  comparisonKey: string | null;
  processTags: string[];
};

export type CaseEvidenceReference = {
  packageId: string;
  factId: string;
  sourceDocumentId: string;
  page: number;
  trustState: TrustState;
  reviewRequired: boolean;
};

export type ConnectedCasePicture = {
  caseId: string;
  generatedFromPackageIds: string[];
  timeline: Array<{
    observationId: string;
    observedAt: string | null;
    comparisonKey: string | null;
    processTags: string[];
    original: Readonly<Record<string, string | number | boolean | null>>;
    normalized: Readonly<Record<string, string | number | boolean | null>> | null;
    evidence: CaseEvidenceReference;
  }>;
  changes: Array<{
    comparisonKey: string;
    kind: "CHANGE" | "STABLE" | "POTENTIAL_CHANGE";
    earlier: CaseEvidenceReference;
    later: CaseEvidenceReference;
    earlierAt: string;
    laterAt: string;
    reviewRequired: boolean;
  }>;
  relationships: Array<{
    processTag: string;
    kind: "CROSS_DOCUMENT_COOCCURRENCE";
    evidence: CaseEvidenceReference[];
    causalityEstablished: false;
    reviewRequired: boolean;
  }>;
  contradictions: Array<{ detail: string; evidence: CaseEvidenceReference }>;
  missingContext: string[];
  reviewQueue: CaseEvidenceReference[];
  limitations: string[];
};

const trustRank: Record<TrustState, number> = { REJECTED: 0, SOURCE_ONLY: 1, NEEDS_REVIEW: 2, VERIFIED: 3 };
const reference = (pack: EvidencePackage): CaseEvidenceReference => {
  const safe = evidenceForKaren(pack);
  return {
    packageId: pack.packageId,
    factId: pack.fact.factId,
    sourceDocumentId: pack.immutableSource.sourceDocumentId,
    page: pack.immutableSource.page,
    trustState: safe.trustState,
    reviewRequired: safe.reviewRequired,
  };
};
const comparableValue = (pack: EvidencePackage) => JSON.stringify(
  Object.entries(pack.representations.normalized ?? pack.representations.extractedOriginal)
    .sort(([left], [right]) => left.localeCompare(right)),
);

export function buildConnectedCasePicture(input: {
  caseId: string;
  observations: CaseEvidenceObservation[];
  expectedContext: string[];
}): ConnectedCasePicture {
  if (input.observations.some((item) => item.package.fact.caseId !== input.caseId)) {
    throw new Error("Case picture cannot combine evidence from different Cases");
  }
  const timeline = input.observations.map((item) => ({
    observationId: `${item.package.packageId}:${item.observedAt ?? "undated"}`,
    observedAt: item.observedAt,
    comparisonKey: item.comparisonKey,
    processTags: [...new Set(item.processTags)].sort(),
    original: structuredClone(item.package.representations.extractedOriginal),
    normalized: item.package.representations.normalized
      ? structuredClone(item.package.representations.normalized)
      : null,
    evidence: reference(item.package),
  })).sort((left, right) => (left.observedAt ?? "9999").localeCompare(right.observedAt ?? "9999"));

  const changes: ConnectedCasePicture["changes"] = [];
  const groups = new Map<string, CaseEvidenceObservation[]>();
  for (const item of input.observations) {
    if (item.comparisonKey && item.observedAt) {
      groups.set(item.comparisonKey, [...(groups.get(item.comparisonKey) ?? []), item]);
    }
  }
  for (const [comparisonKey, items] of groups) {
    const ordered = [...items].sort((left, right) => left.observedAt!.localeCompare(right.observedAt!));
    for (let index = 1; index < ordered.length; index += 1) {
      const earlier = ordered[index - 1];
      const later = ordered[index];
      const earlierRef = reference(earlier.package);
      const laterRef = reference(later.package);
      const reviewRequired = earlierRef.reviewRequired || laterRef.reviewRequired;
      changes.push({
        comparisonKey,
        kind: reviewRequired
          ? "POTENTIAL_CHANGE"
          : comparableValue(earlier.package) === comparableValue(later.package) ? "STABLE" : "CHANGE",
        earlier: earlierRef,
        later: laterRef,
        earlierAt: earlier.observedAt!,
        laterAt: later.observedAt!,
        reviewRequired,
      });
    }
  }

  const tagGroups = new Map<string, CaseEvidenceReference[]>();
  for (const item of input.observations) {
    for (const tag of new Set(item.processTags)) {
      tagGroups.set(tag, [...(tagGroups.get(tag) ?? []), reference(item.package)]);
    }
  }
  const relationships = [...tagGroups.entries()].flatMap(([processTag, refs]) =>
    new Set(refs.map((item) => item.sourceDocumentId)).size < 2 ? [] : [{
      processTag,
      kind: "CROSS_DOCUMENT_COOCCURRENCE" as const,
      evidence: refs,
      causalityEstablished: false as const,
      reviewRequired: refs.some((item) => item.reviewRequired),
    }],
  );
  const contradictions = input.observations.flatMap((item) =>
    item.package.contradictions.map((detail) => ({ detail, evidence: reference(item.package) })),
  );
  const observedContext = new Set(input.observations.flatMap((item) => item.processTags));
  const missingContext = [...new Set([
    ...input.expectedContext.filter((item) => !observedContext.has(item)),
    ...input.observations.flatMap((item) => item.package.missingContext),
  ])].sort();
  const reviewQueue = timeline.map((item) => item.evidence)
    .filter((item) => item.reviewRequired)
    .sort((left, right) => trustRank[left.trustState] - trustRank[right.trustState]);
  const limitations = [
    "This is an evidence-backed Case overview, not a diagnostic scan or a replacement for Karen's decision.",
    "Cross-document co-occurrence and temporal sequence do not establish causality.",
  ];
  if (timeline.some((item) => item.observedAt === null)) limitations.push("Some evidence has no usable event date.");
  if (missingContext.length) limitations.push("Expected context is missing and no conclusion should be inferred from its absence.");
  return {
    caseId: input.caseId,
    generatedFromPackageIds: [...new Set(input.observations.map((item) => item.package.packageId))].sort(),
    timeline,
    changes,
    relationships,
    contradictions,
    missingContext,
    reviewQueue,
    limitations,
  };
}
