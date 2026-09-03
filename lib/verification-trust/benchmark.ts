import { evaluateShadow } from "./evaluate";
import type { EvidenceClass, TrustCandidate } from "./types";

export type ShadowBenchmarkTarget = {
  targetId: string;
  evidenceClass: EvidenceClass;
  humanSourceOutcome: "CONFIRMED" | "CORRECTED" | "REJECTED" | "UNRESOLVED";
  candidate: TrustCandidate;
};

export function evaluateShadowBenchmark(targets: ShadowBenchmarkTarget[], evaluatedAt = "benchmark-fixed-time") {
  if(new Set(targets.map(t=>t.targetId)).size!==targets.length) throw new Error("Duplicate shadow benchmark target IDs");
  const rows=targets.map(target=>{
    const {storedVerificationState,decision}=evaluateShadow(target.candidate,evaluatedAt);
    const falseAutoVerified=decision.wouldAutoVerify&&target.humanSourceOutcome!=="CONFIRMED";
    return {targetId:target.targetId,evidenceClass:target.evidenceClass,humanSourceOutcome:target.humanSourceOutcome,storedVerificationState,wouldAutoVerify:decision.wouldAutoVerify,falseAutoVerified,finalShadowState:decision.finalVerificationState,provenanceLevel:decision.provenanceLevel,blockedGates:decision.failedGates,reasonCodes:decision.decisionReasonCodes,policyVersion:decision.policyVersion};
  });
  const auto=rows.filter(r=>r.wouldAutoVerify), confirmedAuto=auto.filter(r=>r.humanSourceOutcome==="CONFIRMED");
  const distribution=(values:string[])=>Object.fromEntries([...new Set(values)].sort().map(value=>[value,values.filter(v=>v===value).length]));
  const byClass=Object.fromEntries([...new Set(rows.map(r=>r.evidenceClass))].sort().map(evidenceClass=>{const classRows=rows.filter(r=>r.evidenceClass===evidenceClass), classAuto=classRows.filter(r=>r.wouldAutoVerify);return [evidenceClass,{total:classRows.length,autoVerify:classAuto.length,coverage:classAuto.length/classRows.length,precision:classAuto.length?classAuto.filter(r=>r.humanSourceOutcome==="CONFIRMED").length/classAuto.length:null}];}));
  return {total:rows.length,rows,metrics:{shadowAutoVerifyPrecision:auto.length?confirmedAuto.length/auto.length:null,falseAutoVerifiedCount:rows.filter(r=>r.falseAutoVerified).length,autoVerifyCoverage:auto.length/rows.length,needsReviewRate:rows.filter(r=>r.finalShadowState==="NEEDS_REVIEW").length/rows.length,rejectedRate:rows.filter(r=>r.finalShadowState==="REJECTED").length/rows.length,sourceOnlyRate:rows.filter(r=>r.finalShadowState==="SOURCE_ONLY").length/rows.length,policyBlockReasonDistribution:distribution(rows.flatMap(r=>r.reasonCodes)),provenanceLevelDistribution:distribution(rows.map(r=>r.provenanceLevel)),crossCheckDisagreementRate:rows.filter(r=>r.reasonCodes.includes("SECOND_PASS_DISAGREEMENT")).length/rows.length,evidenceClassMetrics:byClass}};
}
