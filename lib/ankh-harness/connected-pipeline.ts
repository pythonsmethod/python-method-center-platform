import { createHash } from "node:crypto";
import { buildCaseAnalyticalPicture, type CaseEvidenceObservation } from "@/lib/analytical-picture";
import {
  classifyClinicalDocument,
  extractClinicalClosureDocumentEvidence,
  spatialTokensFromNormalizedPage,
  type ClinicalEvidenceItem,
} from "@/lib/clinical-evidence";
import type { NormalizedDocumentExtraction } from "@/lib/document-extraction/types";
import {
  buildClinicalTrustCandidate,
  createEvidencePackage,
  evaluateEvidenceIntegrity,
  evaluateTrustCandidate,
  TRUST_POLICY_VERSION,
  type CheckResult,
  type EvidenceClass,
  type EvidencePackage,
  type TrustState,
} from "@/lib/verification-trust";

export const CONNECTED_HARNESS_ENVIRONMENT = "IN_MEMORY_TEST" as const;

export type ConnectedHarnessDocument = {
  caseAlias: string;
  sourceDocumentId: string;
  currentVersion: string;
  candidateVersion: string;
  caseIdentityHash: string | null;
  documentIdentityHash: string | null;
  providerVersion: string;
  parserVersion: string;
  normalized: NormalizedDocumentExtraction;
};

export type ConnectedHarnessInput = {
  environment: typeof CONNECTED_HARNESS_ENVIRONMENT;
  externalCallsAllowed: false;
  persistenceAllowed: false;
  caseAlias: string;
  documents: ConnectedHarnessDocument[];
  expectedContext: string[];
  candidateOverrides?: Record<string, ConnectedHarnessCandidateOverride>;
};

export type ConnectedHarnessCandidateOverride = {
  candidateValue?: string;
  numericValue?: number | null;
  codedValue?: string | null;
  eventDate?: string | null;
  candidateUnit?: string | null;
  candidateReference?: string | null;
  candidateRowKey?: string | null;
  fieldParseConfidence?: number | null;
  contextAssociationConfidence?: number | null;
  requestedTrustState?: TrustState;
};

export type ConnectedHarnessRun = {
  environment: typeof CONNECTED_HARNESS_ENVIRONMENT;
  externalCallsPerformed: 0;
  persistenceWritesPerformed: 0;
  caseAlias: string;
  documents: Array<{ sourceDocumentId: string; documentType: string; ambiguousType: boolean; pageCount: number; providerVersion: string; parserVersion: string }>;
  packages: EvidencePackage[];
  picture: ReturnType<typeof buildCaseAnalyticalPicture>;
  counters: { extractedFacts: number; sourceOnly: number; needsReview: number; verified: number; contradictions: number; missingContext: number; duplicateDocumentsRejected: number };
};

const evidenceClassFor = (fact: ClinicalEvidenceItem): EvidenceClass => {
  if (fact.evidenceType === "BIOMARKER") return "BIOMARKER_STRUCTURED";
  if (fact.evidenceType === "MEASUREMENT") return "RADIOLOGY_MEASUREMENT";
  if (fact.evidenceType === "BI_RADS") return "RADIOLOGY_CODED_CATEGORY";
  if (fact.evidenceType === "GRADE_SCORE") return "PATHOLOGY_STRUCTURED_SCORE";
  if (fact.evidenceType === "FINAL_DIAGNOSIS") return "PATHOLOGY_NARRATIVE";
  if (fact.evidenceType === "PROCEDURE_NAME") return "PROCEDURE_STRUCTURED_FACT";
  if (fact.evidenceType === "EVENT_DATE") return "DATE_EVENT";
  return "NARRATIVE_SOURCE_FACT";
};

const unitFrom = (value: string) => value.match(/\b(mm|cm|mg\/l|g\/l|ng\/ml|%)\b/i)?.[1] ?? null;
type ImmutableSourceAnchor = { status: "EXACT" | "MISSING" | "AMBIGUOUS"; text: string | null; rowKey: string | null };

const allChecks = (fact: ClinicalEvidenceItem, ambiguousType: boolean, sourceAnchor: ImmutableSourceAnchor): CheckResult[] => [
  { name: "NUMERIC_PARSE", passed: fact.numericValue !== null || /\d/.test(fact.originalText) },
  { name: "UNIT_VALUE_SEPARATION", passed: fact.evidenceType !== "MEASUREMENT" || unitFrom(fact.originalText) !== null },
  { name: "REFERENCE_VALUE_SEPARATION", passed: false, status: "NOT_EVALUATED", detail: "NOT_EVALUATED:NO_SOURCE_REFERENCE" },
  { name: "LABEL_VALUE_ASSOCIATION", passed: fact.originalText.trim().length > 0 },
  { name: "DATE_EVENT_ASSOCIATION", passed: fact.evidenceType !== "EVENT_DATE" || fact.eventDate !== null },
  { name: "LATERALITY_SITE_ASSOCIATION", passed: !["MEASUREMENT", "BI_RADS"].includes(fact.evidenceType) || Boolean(fact.laterality || fact.anatomicalSite) },
  { name: "IDEMPOTENCY", passed: true },
  { name: "SOURCE_EXISTS", passed: fact.sourcePage > 0 && fact.sourceCoordinates !== null && sourceAnchor.status === "EXACT", detail: sourceAnchor.status === "EXACT" ? "EXACT_TOKEN_SOURCE_ANCHOR" : `SOURCE_ANCHOR_${sourceAnchor.status}` },
  { name: "SCHEMA_CONSTRAINTS", passed: fact.caseId.length > 0 && fact.sourceDocumentId.length > 0 },
  { name: "LAYOUT_CONTRADICTION", passed: !ambiguousType },
];

const sourceValue = (fact: ClinicalEvidenceItem) => fact.codedValue ?? (fact.numericValue === null ? fact.originalText : String(fact.numericValue));
const sourceFingerprint = (document: ConnectedHarnessDocument) => createHash("sha256").update(`${document.sourceDocumentId}|${document.candidateVersion}|${document.normalized.text}`).digest("hex");

function conflictDetails(facts: ClinicalEvidenceItem[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>();
  const keys = new Map<string, Set<string>>();
  for (const fact of facts) {
    const key = fact.evidenceType === "BI_RADS"
      ? `${fact.sourceDocumentId}|BI_RADS|${fact.laterality ?? "UNSPECIFIED"}`
      : fact.codedValue === "MITOTIC_SCORE"
        ? `${fact.sourceDocumentId}|MITOTIC_SCORE`
        : null;
    if (!key) continue;
    keys.set(key, new Set([...(keys.get(key) ?? []), sourceValue(fact)]));
  }
  for (const fact of facts) {
    const key = fact.evidenceType === "BI_RADS"
      ? `${fact.sourceDocumentId}|BI_RADS|${fact.laterality ?? "UNSPECIFIED"}`
      : fact.codedValue === "MITOTIC_SCORE"
        ? `${fact.sourceDocumentId}|MITOTIC_SCORE`
        : null;
    if (key && (keys.get(key)?.size ?? 0) > 1) conflicts.set(fact.evidenceId, ["CONFLICTING_SOURCE_VALUES"]);
  }
  return conflicts;
}

const normalizedComparable = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");

function immutableSourceAnchor(fact: ClinicalEvidenceItem, document: ConnectedHarnessDocument): ImmutableSourceAnchor {
  const provenance = fact.tokenProvenance;
  if (provenance) {
    const pageTokens = document.normalized.pages.find((page) => page.pageNumber === fact.sourcePage)?.tokens ?? [];
    const selected = provenance.tokenIds.map((id) => pageTokens.find((token) => token.id === id));
    if (selected.every((token) => token !== undefined)) {
      const text = selected.map((token) => token!.text).join(" ");
      if (normalizedComparable(text) === normalizedComparable(provenance.exactSourceText)) return { status: "EXACT", text, rowKey: provenance.tokenIds.join("|") };
    }
  }
  const issues = fact.verificationIssues ?? [];
  return { status: issues.some((issue) => issue.includes("AMBIGUOUS_TOKEN_MATCH")) ? "AMBIGUOUS" : "MISSING", text: null, rowKey: null };
}

function sourceSemantics(fact: ClinicalEvidenceItem, anchor: ImmutableSourceAnchor) {
  const text = anchor.text;
  if (!text) return { value: null, unit: null, reference: null, date: null };
  let value: string | null = text;
  if (fact.evidenceType === "BI_RADS") value = text.match(/(?:BI-?RADS[^0-6]*)?([0-6])\b/i)?.[1] ?? null;
  else if (fact.numericValue !== null) value = text.match(/[-+]?\d+(?:[.,]\d+)?/)?.[0] ?? null;
  const rawDate = text.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/)?.[0] ?? null;
  const date = rawDate && /^\d{4}-/.test(rawDate) ? rawDate : null;
  return { value, unit: unitFrom(text), reference: null, date };
}

export function runConnectedAnkhHarness(input: ConnectedHarnessInput): ConnectedHarnessRun {
  if (input.environment !== CONNECTED_HARNESS_ENVIRONMENT || input.externalCallsAllowed !== false || input.persistenceAllowed !== false) throw new Error("Connected Ankh harness is restricted to isolated in-memory execution");
  if (!input.caseAlias.trim()) throw new Error("Non-PHI Case alias is required");
  const seenVersions = new Set<string>();
  for (const document of input.documents) {
    if (document.caseAlias !== input.caseAlias) throw new Error("Connected Ankh harness cannot combine different Cases");
    const key = `${document.sourceDocumentId}|${document.candidateVersion}`;
    if (seenVersions.has(key)) throw new Error("Duplicate document version in connected Ankh harness");
    seenVersions.add(key);
  }

  const extracted = input.documents.map((document) => {
    const tokens = document.normalized.pages.flatMap(spatialTokensFromNormalizedPage);
    const blocks = document.normalized.pages.flatMap((page) => page.blocks.map((block) => ({ text: block.text, page: page.pageNumber, coordinates: block.boundingPoly as ClinicalEvidenceItem["sourceCoordinates"], confidence: block.confidence ?? null })));
    const result = extractClinicalClosureDocumentEvidence({ blocks, tokens, layout: { structuredTablesSufficient: document.normalized.pages.some((page) => page.tables.length > 0) } }, { caseId: input.caseAlias, sourceDocumentId: document.sourceDocumentId, providerVersion: document.providerVersion, parserVersion: document.parserVersion });
    const documentTypes = new Set(result.facts.map((fact) => fact.documentType).filter((type) => type !== "UNKNOWN"));
    const wholeType = classifyClinicalDocument(document.normalized.text).documentType;
    const documentWarnings: string[] = [];
    const hasDimensionLikeValue = /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s+\S+/i.test(document.normalized.text);
    const hasSupportedDimension = /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*(?:mm|cm)\b/i.test(document.normalized.text);
    if (hasDimensionLikeValue && !hasSupportedDimension) documentWarnings.push("MEASUREMENT_UNIT_UNRESOLVED");
    if (/\b(?:exam|procedure|collected|received|final|addendum|comparison|printed)\s+date\s*:/i.test(document.normalized.text) && !result.facts.some((fact) => fact.evidenceType === "EVENT_DATE")) documentWarnings.push("EVENT_DATE_UNRESOLVED");
    return { document, result, ambiguousType: documentTypes.size > 1, documentType: wholeType, documentWarnings };
  });

  const allFacts = extracted.flatMap((item) => item.result.facts);
  const conflicts = conflictDetails(allFacts);
  const rawPackages = extracted.flatMap(({ document, result, ambiguousType, documentWarnings }) => result.facts.map((fact) => {
    const override = input.candidateOverrides?.[fact.evidenceId] ?? {};
    const candidateFact: ClinicalEvidenceItem = { ...fact, numericValue: override.numericValue ?? fact.numericValue, codedValue: override.codedValue ?? fact.codedValue, eventDate: override.eventDate ?? fact.eventDate };
    const sourceAnchor = immutableSourceAnchor(fact, document);
    const source = sourceSemantics(fact, sourceAnchor);
    const evidenceClass = evidenceClassFor(fact);
    const deterministicChecks = allChecks(candidateFact, ambiguousType, sourceAnchor);
    const documentQuality = document.normalized.pages.map((page) => page.qualityScore).filter((score): score is number => typeof score === "number");
    const sourceAmbiguous = ambiguousType || (conflicts.get(fact.evidenceId)?.length ?? 0) > 0;
    const candidate = buildClinicalTrustCandidate(candidateFact, { evidenceClass, fieldParseConfidence: override.fieldParseConfidence ?? null, normalizationConfidence: null, documentQualityConfidence: documentQuality.length ? Math.min(...documentQuality) : null, contextAssociationConfidence: override.contextAssociationConfidence ?? null, deterministicChecks, crossChecks: [], normalizationRequired: false, competingCandidateCount: 1, sourceAmbiguous });
    const evaluatedDecision = evaluateTrustCandidate(candidate, "2026-09-05T00:00:00.000Z");
    const decision = override.requestedTrustState ? { ...evaluatedDecision, finalVerificationState: override.requestedTrustState } : evaluatedDecision;
    const candidateValue = override.candidateValue ?? sourceValue(candidateFact);
    const candidateUnit = override.candidateUnit ?? unitFrom(candidateFact.originalText);
    const integrity = evaluateEvidenceIntegrity({ sourceValue: source.value, candidateValue, sourceUnit: source.unit, candidateUnit, sourceReference: source.reference, candidateReference: override.candidateReference ?? null, sourceDate: source.date, candidateDate: candidateFact.eventDate, sourceRowKey: sourceAnchor.rowKey, candidateRowKey: override.candidateRowKey ?? fact.tokenProvenance?.tokenIds.join("|") ?? null, currentDocumentVersion: document.currentVersion, candidateDocumentVersion: document.candidateVersion, caseIdentityHash: document.caseIdentityHash, documentIdentityHash: document.documentIdentityHash, officialSourceValues: source.value === null ? [] : conflicts.has(fact.evidenceId) ? [source.value, "CONFLICT"] : [source.value], pagePresent: fact.sourcePage > 0 && sourceAnchor.status === "EXACT" });
    const contradictions = [...(conflicts.get(fact.evidenceId) ?? [])];
    if (document.caseIdentityHash !== document.documentIdentityHash) contradictions.push("CASE_DOCUMENT_IDENTITY_MISMATCH");
    if (document.currentVersion !== document.candidateVersion) contradictions.push("SUPERSEDED_DOCUMENT_VERSION");
    if (ambiguousType) contradictions.push("AMBIGUOUS_DOCUMENT_TYPE");
    const missingContext = [] as string[];
    if (!fact.tokenProvenance) missingContext.push("EXACT_TOKEN_PROVENANCE_MISSING");
    if (sourceAnchor.status === "MISSING") missingContext.push("IMMUTABLE_SOURCE_ANCHOR_MISSING");
    if (sourceAnchor.status === "AMBIGUOUS") missingContext.push("IMMUTABLE_SOURCE_ANCHOR_AMBIGUOUS");
    if (!document.caseIdentityHash || !document.documentIdentityHash) missingContext.push("IDENTITY_NOT_CONFIRMED");
    if (!fact.eventDate) missingContext.push("EVENT_DATE_MISSING");
    missingContext.push(...documentWarnings);
    return createEvidencePackage({ fact: { kind: "CLINICAL_EVIDENCE", factId: fact.evidenceId, caseId: fact.caseId, evidenceClass }, immutableSource: { sourceDocumentId: fact.sourceDocumentId, page: fact.sourcePage, region: fact.sourceCoordinates, tokenProvenance: fact.tokenProvenance ?? null, sourceFingerprint: sourceFingerprint(document) }, representations: { extractedOriginal: { text: candidateFact.originalText, numericValue: candidateFact.numericValue, codedValue: candidateFact.codedValue, laterality: candidateFact.laterality, anatomicalSite: candidateFact.anatomicalSite, eventDate: candidateFact.eventDate }, normalized: candidateFact.normalizedText ? { text: candidateFact.normalizedText } : null }, checks: { deterministic: deterministicChecks, integrity, crossChecks: [], aiCritiques: [] }, contradictions, missingContext, trustDecision: decision, promotionEvidence: [], versions: { provider: fact.providerVersion, parser: fact.parserVersion, policy: TRUST_POLICY_VERSION } });
  }));
  const packagePriority = (pack: EvidencePackage) => ["NARRATIVE_SOURCE_FACT", "PATHOLOGY_NARRATIVE"].includes(pack.fact.evidenceClass) ? 0 : 1;
  const packagesBySource = new Map<string, EvidencePackage>();
  for (const pack of rawPackages) {
    const key = `${pack.immutableSource.sourceDocumentId}|${pack.immutableSource.page}|${String(pack.representations.extractedOriginal.text).toLowerCase().replace(/\s+/g, " ").trim()}`;
    const current = packagesBySource.get(key);
    if (!current || packagePriority(pack) > packagePriority(current)) packagesBySource.set(key, pack);
  }
  const packages = [...packagesBySource.values()];

  const observations: CaseEvidenceObservation[] = packages.map((pack) => ({ package: pack, observedAt: typeof pack.representations.extractedOriginal.eventDate === "string" ? pack.representations.extractedOriginal.eventDate : null, comparisonKey: null, processTags: [] }));
  const picture = buildCaseAnalyticalPicture({ caseId: input.caseAlias, observations, expectedContext: input.expectedContext });
  const states = packages.map((pack) => pack.trustTransition.effective);
  return { environment: CONNECTED_HARNESS_ENVIRONMENT, externalCallsPerformed: 0, persistenceWritesPerformed: 0, caseAlias: input.caseAlias, documents: extracted.map(({ document, ambiguousType, documentType }) => ({ sourceDocumentId: document.sourceDocumentId, documentType, ambiguousType, pageCount: document.normalized.pages.length, providerVersion: document.providerVersion, parserVersion: document.parserVersion })), packages, picture, counters: { extractedFacts: packages.length, sourceOnly: states.filter((state) => state === "SOURCE_ONLY").length, needsReview: states.filter((state) => state === "NEEDS_REVIEW").length, verified: states.filter((state) => state === "VERIFIED").length, contradictions: packages.reduce((count, pack) => count + pack.contradictions.length, 0), missingContext: picture.missingContext.length, duplicateDocumentsRejected: 0 } };
}
