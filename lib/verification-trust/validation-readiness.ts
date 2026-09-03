export type ValidationCoverage = {
  realCaseCount: number;
  independentlyReviewedRealCaseCount: number;
  realDocumentCount: number;
  layoutFamilies: string[];
  languages: string[];
  sourceTypes: string[];
  documentTypes: string[];
  qualityBands: string[];
  correctedOrAddendumCount: number;
  targetsWithExactProvenance: number;
  totalRealTargets: number;
  falseAutoVerifiedCount: number;
};

export type ValidationReadinessGate = {
  gate: string;
  passed: boolean;
  observed: number | string[];
  required: number | string[];
};

export type ValidationRequirements = {
  minimumRealCases: number;
  minimumIndependentlyReviewedRealCases: number;
  minimumRealDocuments: number;
  minimumLayoutFamilies: number;
  requiredLanguages: string[];
  minimumSourceTypes: number;
  minimumDocumentTypes: number;
  requiredQualityBands: string[];
  minimumCorrectedOrAddendum: number;
  requireExactProvenanceForEveryTarget: boolean;
  maximumFalseAutoVerified: number;
};

/** Conservative entry gates for drawing broader real-world conclusions. */
export function evaluateValidationReadiness(input: ValidationCoverage, requirements: ValidationRequirements) {
  const gates: ValidationReadinessGate[] = [
    { gate: "real_cases", passed: input.realCaseCount >= requirements.minimumRealCases, observed: input.realCaseCount, required: requirements.minimumRealCases },
    { gate: "independent_review", passed: input.independentlyReviewedRealCaseCount >= requirements.minimumIndependentlyReviewedRealCases, observed: input.independentlyReviewedRealCaseCount, required: requirements.minimumIndependentlyReviewedRealCases },
    { gate: "real_documents", passed: input.realDocumentCount >= requirements.minimumRealDocuments, observed: input.realDocumentCount, required: requirements.minimumRealDocuments },
    { gate: "layout_families", passed: input.layoutFamilies.length >= requirements.minimumLayoutFamilies, observed: input.layoutFamilies, required: requirements.minimumLayoutFamilies },
    { gate: "languages", passed: requirements.requiredLanguages.every(language=>input.languages.includes(language)), observed: input.languages, required: requirements.requiredLanguages },
    { gate: "source_types", passed: input.sourceTypes.length >= requirements.minimumSourceTypes, observed: input.sourceTypes, required: requirements.minimumSourceTypes },
    { gate: "document_types", passed: input.documentTypes.length >= requirements.minimumDocumentTypes, observed: input.documentTypes, required: requirements.minimumDocumentTypes },
    { gate: "quality_bands", passed: requirements.requiredQualityBands.every(band=>input.qualityBands.includes(band)), observed: input.qualityBands, required: requirements.requiredQualityBands },
    { gate: "corrected_or_addendum", passed: input.correctedOrAddendumCount >= requirements.minimumCorrectedOrAddendum, observed: input.correctedOrAddendumCount, required: requirements.minimumCorrectedOrAddendum },
    { gate: "exact_provenance", passed: !requirements.requireExactProvenanceForEveryTarget||(input.targetsWithExactProvenance === input.totalRealTargets && input.totalRealTargets > 0), observed: input.targetsWithExactProvenance, required: requirements.requireExactProvenanceForEveryTarget?input.totalRealTargets:0 },
    { gate: "false_auto_verified", passed: input.falseAutoVerifiedCount <= requirements.maximumFalseAutoVerified, observed: input.falseAutoVerifiedCount, required: requirements.maximumFalseAutoVerified },
  ];
  return {
    status: gates.every((gate) => gate.passed) ? "READY_FOR_RELEASE_DECISION" : "INSUFFICIENT_REAL_WORLD_COVERAGE",
    gates,
    passedGateCount: gates.filter((gate) => gate.passed).length,
    totalGateCount: gates.length,
  } as const;
}
