import { createHash } from "node:crypto";
import type { BoundingPolygon } from "@/lib/canonical-facts/types";
import type { ClinicalTokenProvenance } from "@/lib/clinical-evidence/types";
import type { CheckResult, CrossCheckResult, EvidenceClass, TrustDecision, TrustReasonCode, TrustState } from "./types";
import { TRUST_POLICY_VERSION } from "./policies";

export type EvidencePackageCheckName =
  | "SOURCE_VALUE_MATCH" | "DECIMAL_SEMANTICS" | "UNIT_SEMANTICS"
  | "REFERENCE_ASSOCIATION" | "DATE_ASSOCIATION" | "ROW_COLUMN_ASSOCIATION"
  | "DOCUMENT_VERSION_CURRENT" | "IDENTITY_MATCH" | "SOURCE_CONSISTENCY" | "PAGE_PRESENT";

export type EvidencePackageCheck = { name: EvidencePackageCheckName; passed: boolean; status: "PASSED" | "FAILED" | "NOT_EVALUATED"; detail?: string };
export type EvidenceIntegrityInput = {
  sourceValue: string | null; candidateValue: string | null;
  sourceUnit: string | null; candidateUnit: string | null;
  sourceReference: string | null; candidateReference: string | null;
  sourceDate: string | null; candidateDate: string | null;
  sourceRowKey: string | null; candidateRowKey: string | null;
  currentDocumentVersion: string; candidateDocumentVersion: string;
  caseIdentityHash: string | null; documentIdentityHash: string | null;
  officialSourceValues: string[];
  pagePresent: boolean;
};

const normalizedText = (value: string | null) => value?.trim().replace(/\s+/g, " ").toLowerCase() ?? null;
const numericSemantics = (value: string) => {
  const normalized = value.trim().replace(/(?<=\d),(?=\d)/g, ".");
  return /^[-+]?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
};

export function evaluateEvidenceIntegrity(input: EvidenceIntegrityInput): EvidencePackageCheck[] {
  const same = (left: string | null, right: string | null) => normalizedText(left) === normalizedText(right);
  const evaluated = (name: EvidencePackageCheckName, left: string | null, right: string | null): EvidencePackageCheck => {
    if (left === null || right === null) return { name, passed: false, status: "NOT_EVALUATED", detail: "SOURCE_OR_CANDIDATE_SIGNAL_MISSING" };
    const passed = same(left, right);
    return { name, passed, status: passed ? "PASSED" : "FAILED" };
  };
  const sourceNumeric = input.sourceValue === null ? null : numericSemantics(input.sourceValue);
  const candidateNumeric = input.candidateValue === null ? null : numericSemantics(input.candidateValue);
  const sourceValueCheck = evaluated("SOURCE_VALUE_MATCH", input.sourceValue, input.candidateValue);
  let decimalCheck: EvidencePackageCheck;
  if (input.sourceValue === null || input.candidateValue === null) decimalCheck = { name: "DECIMAL_SEMANTICS", passed: false, status: "NOT_EVALUATED", detail: "SOURCE_OR_CANDIDATE_SIGNAL_MISSING" };
  else {
    const passed = sourceNumeric !== null && candidateNumeric !== null ? sourceNumeric === candidateNumeric : same(input.sourceValue, input.candidateValue);
    decimalCheck = { name: "DECIMAL_SEMANTICS", passed, status: passed ? "PASSED" : "FAILED" };
  }
  return [
    sourceValueCheck,
    decimalCheck,
    evaluated("UNIT_SEMANTICS", input.sourceUnit, input.candidateUnit),
    evaluated("REFERENCE_ASSOCIATION", input.sourceReference, input.candidateReference),
    evaluated("DATE_ASSOCIATION", input.sourceDate, input.candidateDate),
    evaluated("ROW_COLUMN_ASSOCIATION", input.sourceRowKey, input.candidateRowKey),
    { name: "DOCUMENT_VERSION_CURRENT", passed: input.currentDocumentVersion === input.candidateDocumentVersion, status: input.currentDocumentVersion === input.candidateDocumentVersion ? "PASSED" : "FAILED" },
    { name: "IDENTITY_MATCH", passed: Boolean(input.caseIdentityHash && input.documentIdentityHash && input.caseIdentityHash === input.documentIdentityHash), status: input.caseIdentityHash && input.documentIdentityHash ? (input.caseIdentityHash === input.documentIdentityHash ? "PASSED" : "FAILED") : "NOT_EVALUATED" },
    { name: "SOURCE_CONSISTENCY", passed: input.officialSourceValues.length > 0 && new Set(input.officialSourceValues.map((value) => normalizedText(value))).size <= 1, status: input.officialSourceValues.length === 0 ? "NOT_EVALUATED" : new Set(input.officialSourceValues.map((value) => normalizedText(value))).size <= 1 ? "PASSED" : "FAILED" },
    { name: "PAGE_PRESENT", passed: input.pagePresent, status: input.pagePresent ? "PASSED" : "FAILED" },
  ];
}

export type AiCritique = { critiqueId: string; modelVersion: string; findings: string[]; recommendedRoute: Exclude<TrustState, "VERIFIED"> | null };
export type PromotionEvidence = {
  evidenceId: string;
  kind: "INDEPENDENT_SOURCE_REVIEW" | "INDEPENDENT_OCR" | "PREDEFINED_DETERMINISTIC_GATE" | "LLM_CONSENSUS" | "REPHRASE" | "AI_CRITIQUE";
  passed: boolean; independent: boolean; predefined: boolean; supportsPromotion: boolean; detail: string;
};
export type TrustTransitionAudit = {
  from: TrustState; requested: TrustState; effective: TrustState; allowed: boolean; promotion: boolean;
  qualifyingEvidenceIds: string[];
  blockedReasons: Array<"NO_NEW_QUALIFYING_EVIDENCE" | "FAILED_INTEGRITY_CHECK" | "AI_CANNOT_PROMOTE" | "SOURCE_CONTRADICTION">;
};

const trustRank: Record<TrustState, number> = { REJECTED: 0, SOURCE_ONLY: 1, NEEDS_REVIEW: 2, VERIFIED: 3 };
const qualifyingKinds = new Set<PromotionEvidence["kind"]>(["INDEPENDENT_SOURCE_REVIEW", "INDEPENDENT_OCR", "PREDEFINED_DETERMINISTIC_GATE"]);

export function auditTrustTransition(input: { from: TrustState; requested: TrustState; evidence: PromotionEvidence[]; integrityChecks: EvidencePackageCheck[]; contradictions: string[] }): TrustTransitionAudit {
  const promotion = trustRank[input.requested] > trustRank[input.from];
  if (!promotion) return { from: input.from, requested: input.requested, effective: input.requested, allowed: true, promotion: false, qualifyingEvidenceIds: [], blockedReasons: [] };
  const qualifying = input.evidence.filter((item) => item.passed && item.supportsPromotion && qualifyingKinds.has(item.kind) && (item.kind === "PREDEFINED_DETERMINISTIC_GATE" ? item.predefined : item.independent));
  const blocked = new Set<TrustTransitionAudit["blockedReasons"][number]>();
  if (!qualifying.length) blocked.add("NO_NEW_QUALIFYING_EVIDENCE");
  if (input.integrityChecks.some((check) => !check.passed)) blocked.add("FAILED_INTEGRITY_CHECK");
  if (input.contradictions.length) blocked.add("SOURCE_CONTRADICTION");
  if (input.evidence.some((item) => item.supportsPromotion && ["LLM_CONSENSUS", "REPHRASE", "AI_CRITIQUE"].includes(item.kind))) blocked.add("AI_CANNOT_PROMOTE");
  const allowed = blocked.size === 0;
  return { from: input.from, requested: input.requested, effective: allowed ? input.requested : input.from, allowed, promotion, qualifyingEvidenceIds: qualifying.map((item) => item.evidenceId), blockedReasons: [...blocked] };
}

export type EvidencePackage = {
  packageId: string;
  fact: { kind: "CANONICAL_LAB_FACT" | "CLINICAL_EVIDENCE"; factId: string; caseId: string; evidenceClass: EvidenceClass };
  immutableSource: { sourceDocumentId: string; page: number; region: BoundingPolygon | null; tokenProvenance: ClinicalTokenProvenance | null; sourceFingerprint: string | null };
  representations: { extractedOriginal: Readonly<Record<string, string | number | boolean | null>>; normalized: Readonly<Record<string, string | number | boolean | null>> | null };
  checks: { deterministic: CheckResult[]; integrity: EvidencePackageCheck[]; crossChecks: CrossCheckResult[]; aiCritiques: AiCritique[] };
  contradictions: string[]; missingContext: string[]; trustDecision: TrustDecision; trustTransition: TrustTransitionAudit; reasonCodes: TrustReasonCode[];
  versions: { provider: string; parser: string; policy: string };
};
export type EvidencePackageInput = Omit<EvidencePackage, "packageId" | "trustTransition" | "reasonCodes"> & { promotionEvidence: PromotionEvidence[] };

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${key}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
};

export function createEvidencePackage(input: EvidencePackageInput): EvidencePackage {
  if (input.versions.policy !== TRUST_POLICY_VERSION || input.trustDecision.policyVersion !== TRUST_POLICY_VERSION) throw new Error("Evidence package policy version mismatch");
  if (input.fact.factId !== input.trustDecision.factId) throw new Error("Evidence package fact/trust identity mismatch");
  if (input.immutableSource.page < 1) throw new Error("Evidence package source page is required");
  const trustTransition = auditTrustTransition({ from: input.trustDecision.inputVerificationState, requested: input.trustDecision.finalVerificationState, evidence: input.promotionEvidence, integrityChecks: input.checks.integrity, contradictions: input.contradictions });
  const packageId = `ep_${createHash("sha256").update(stable({ fact: input.fact, source: input.immutableSource, versions: input.versions, decisionId: input.trustDecision.decisionId, trustTransition })).digest("hex").slice(0, 24)}`;
  return { packageId, fact: structuredClone(input.fact), immutableSource: structuredClone(input.immutableSource), representations: structuredClone(input.representations), checks: structuredClone(input.checks), contradictions: [...input.contradictions], missingContext: [...input.missingContext], trustDecision: structuredClone(input.trustDecision), trustTransition, reasonCodes: [...input.trustDecision.decisionReasonCodes], versions: { ...input.versions } };
}

export function evidenceForKaren(pack: EvidencePackage) {
  const confirmed = pack.trustTransition.effective === "VERIFIED" && pack.trustTransition.allowed && !pack.contradictions.length && pack.checks.integrity.every((check) => check.passed);
  return { packageId: pack.packageId, factId: pack.fact.factId, trustState: pack.trustTransition.effective, confirmed, reviewRequired: !confirmed, contradictions: [...pack.contradictions], missingContext: [...pack.missingContext], source: structuredClone(pack.immutableSource) };
}

export function routeAiCritique(current: TrustState, critique: AiCritique): TrustState {
  if (!critique.recommendedRoute) return current;
  return trustRank[critique.recommendedRoute] < trustRank[current] ? critique.recommendedRoute : current;
}

const criticalClasses = new Set<EvidenceClass>(["LAB_NUMERIC", "LAB_REFERENCE_RANGE", "BIOMARKER_STRUCTURED", "RADIOLOGY_MEASUREMENT", "RADIOLOGY_CODED_CATEGORY", "PATHOLOGY_STRUCTURED_SCORE", "DATE_EVENT", "LATERALITY_SITE"]);
export function planSelectiveOcrVerification(pack: EvidencePackage) {
  const suspicious = pack.checks.integrity.some((check) => !check.passed) || pack.contradictions.length > 0 || pack.trustDecision.decisionReasonCodes.some((reason) => ["LOW_OCR_CONFIDENCE", "LOW_LAYOUT_CONFIDENCE", "UNIT_ASSOCIATION_UNCERTAIN", "VALUE_REFERENCE_CONFLICT", "DATE_EVENT_UNCERTAIN"].includes(reason));
  if (!criticalClasses.has(pack.fact.evidenceClass) || !suspicious) return null;
  return { packageId: pack.packageId, sourceDocumentId: pack.immutableSource.sourceDocumentId, page: pack.immutableSource.page, reasonCodes: [...pack.trustDecision.decisionReasonCodes], failedIntegrityChecks: pack.checks.integrity.filter((check) => !check.passed).map((check) => check.name), externalTransmissionAuthorized: false as const };
}
