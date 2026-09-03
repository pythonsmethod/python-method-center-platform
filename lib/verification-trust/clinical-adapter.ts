import type { ClinicalEvidenceItem } from "@/lib/clinical-evidence";
import type { CheckResult, ConfidenceDimensions, CrossCheckResult, EvidenceClass, ProvenanceLevel, TrustCandidate } from "./types";

export type ClinicalTrustSignals = {
  evidenceClass: EvidenceClass;
  fieldParseConfidence: number | null;
  normalizationConfidence: number | null;
  documentQualityConfidence: number | null;
  contextAssociationConfidence: number | null;
  deterministicChecks: CheckResult[];
  crossChecks: CrossCheckResult[];
  normalizationRequired: boolean;
  competingCandidateCount: number;
  sourceAmbiguous: boolean;
};

export function clinicalEvidenceProvenanceLevel(fact:ClinicalEvidenceItem):ProvenanceLevel{
  if(fact.tokenProvenance?.level==="P4") return "P4";
  if(fact.tokenProvenance?.level==="P3") return "P3";
  if(fact.sourceCoordinates) return "P2";
  return fact.sourcePage>0?"P1":"P0";
}

/** Missing confidence dimensions stay null; this adapter never manufactures trust. */
export function buildClinicalTrustCandidate(fact:ClinicalEvidenceItem,signals:ClinicalTrustSignals):TrustCandidate{
  const provenanceLevel=clinicalEvidenceProvenanceLevel(fact);
  const tokenConfidence=fact.tokenProvenance?.minimumTokenConfidence??null;
  const confidences:ConfidenceDimensions={ocrText:tokenConfidence??fact.extractionConfidence,layout:fact.layoutConfidence,fieldParse:signals.fieldParseConfidence,sourceProvenance:null,normalization:signals.normalizationConfidence,crossCheck:signals.crossChecks.some(c=>c.independentSignal&&c.passed)?1:null,documentQuality:signals.documentQualityConfidence,contextAssociation:signals.contextAssociationConfidence};
  return {factId:fact.evidenceId,evidenceClass:signals.evidenceClass,inputVerificationState:fact.verificationStatus,confidences,provenanceLevel,deterministicChecks:signals.deterministicChecks,crossChecks:signals.crossChecks,normalizationRequired:signals.normalizationRequired,competingCandidateCount:signals.competingCandidateCount,sourceAmbiguous:signals.sourceAmbiguous};
}
