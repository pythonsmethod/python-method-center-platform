import { createHash } from "node:crypto";
import { TRUST_POLICIES, TRUST_POLICY_VERSION, failureReasonForCheck } from "./policies";
import type { ConfidenceDimensions, ProvenanceLevel, TrustCandidate, TrustDecision, TrustReasonCode } from "./types";

const provenanceRank: Record<ProvenanceLevel, number> = { P0:0,P1:1,P2:2,P3:3,P4:4 };
const dimension = (c: ConfidenceDimensions, key: keyof ConfidenceDimensions) => c[key];

export function evaluateTrustCandidate(candidate: TrustCandidate, evaluatedAt = new Date().toISOString()): TrustDecision {
  const policy=TRUST_POLICIES[candidate.evidenceClass], failed:string[]=[], reasons=new Set<TrustReasonCode>();
  const thresholds: Array<[keyof ConfidenceDimensions,number,TrustReasonCode]> = [
    ["ocrText",policy.minimum.ocrText,"LOW_OCR_CONFIDENCE"], ["fieldParse",policy.minimum.fieldParse,"POLICY_REQUIREMENT_NOT_MET"],
    ["sourceProvenance",policy.minimum.sourceProvenance,"POLICY_REQUIREMENT_NOT_MET"], ["documentQuality",policy.minimum.documentQuality,"DOCUMENT_QUALITY_LOW"]
  ];
  if(policy.minimum.layout!==undefined) thresholds.push(["layout",policy.minimum.layout,"LOW_LAYOUT_CONFIDENCE"]);
  if(policy.minimum.normalization!==undefined) thresholds.push(["normalization",policy.minimum.normalization,"NORMALIZATION_UNRESOLVED"]);
  if(policy.minimum.contextAssociation!==undefined) thresholds.push(["contextAssociation",policy.minimum.contextAssociation,"POLICY_REQUIREMENT_NOT_MET"]);
  for(const [key,min,reason] of thresholds){const value=dimension(candidate.confidences,key);if(value===null||value<min){failed.push(`confidence.${key}>=${min}`);reasons.add(reason);}}
  if(provenanceRank[candidate.provenanceLevel]<provenanceRank[policy.requiredProvenance]){
    failed.push(`provenance>=${policy.requiredProvenance}`);
    reasons.add(
      provenanceRank[candidate.provenanceLevel] < 2
        ? "MISSING_REGION_PROVENANCE"
        : provenanceRank[candidate.provenanceLevel] < 3
          ? "MISSING_TOKEN_PROVENANCE"
          : "INSUFFICIENT_PROVENANCE_LEVEL",
    );
  }
  for(const required of policy.requiredChecks){const result=candidate.deterministicChecks.find(c=>c.name===required);if(!result?.passed){failed.push(`check.${required}`);reasons.add(failureReasonForCheck[required]??"POLICY_REQUIREMENT_NOT_MET");}}
  const independentCrossChecks=candidate.crossChecks.filter(c=>c.independentSignal);
  if(candidate.crossChecks.some(c=>!c.passed)){failed.push("crossCheck.disagreement");reasons.add("SECOND_PASS_DISAGREEMENT");}
  if(policy.crossCheck==="REQUIRED"&&!independentCrossChecks.some(c=>c.passed)){failed.push("crossCheck.independentRequired");reasons.add("POLICY_REQUIREMENT_NOT_MET");}
  if(candidate.normalizationRequired&&candidate.confidences.normalization===null){failed.push("normalization.required");reasons.add("NORMALIZATION_UNRESOLVED");}
  if(candidate.competingCandidateCount>1){failed.push("candidate.unique");reasons.add("AMBIGUOUS_ROW_ASSOCIATION");}
  if(candidate.sourceAmbiguous) reasons.add("SOURCE_AMBIGUOUS");
  const wouldAutoVerify=failed.length===0&&!candidate.sourceAmbiguous&&candidate.inputVerificationState!=="REJECTED";
  const finalVerificationState=candidate.inputVerificationState==="REJECTED"?"REJECTED":candidate.sourceAmbiguous?policy.sourceAmbiguousRoute:wouldAutoVerify?"VERIFIED":policy.missingSignalRoute;
  const reasonCodes=[...reasons];
  const decisionId=`trust_${createHash("sha256").update(JSON.stringify([candidate.factId,TRUST_POLICY_VERSION,evaluatedAt])).digest("hex").slice(0,24)}`;
  return {decisionId,factId:candidate.factId,evidenceClass:candidate.evidenceClass,inputVerificationState:candidate.inputVerificationState,confidenceDimensions:{...candidate.confidences},provenanceLevel:candidate.provenanceLevel,deterministicChecks:candidate.deterministicChecks.map(c=>({...c})),crossCheckResults:candidate.crossChecks.map(c=>({...c})),failedGates:failed,finalVerificationState,decisionReasonCodes:reasonCodes,policyVersion:TRUST_POLICY_VERSION,shadowDecision:true,wouldAutoVerify,shadowReasonCodes:reasonCodes,evaluatedAt};
}

export function evaluateShadow(candidate: TrustCandidate, evaluatedAt?: string){
  const originalState=candidate.inputVerificationState;
  const decision=evaluateTrustCandidate(candidate,evaluatedAt);
  return {storedVerificationState:originalState,decision};
}
