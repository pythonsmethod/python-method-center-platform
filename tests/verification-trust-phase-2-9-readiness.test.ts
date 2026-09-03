import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateValidationReadiness } from "@/lib/verification-trust";

describe("Phase 2.9 real-world validation readiness", () => {
  const proposedRequirements = {
    minimumRealCases: 5, minimumIndependentlyReviewedRealCases: 5, minimumRealDocuments: 15,
    minimumLayoutFamilies: 5, requiredLanguages: ["en", "ru"], minimumSourceTypes: 3,
    minimumDocumentTypes: 4, requiredQualityBands: ["high", "medium", "low"],
    minimumCorrectedOrAddendum: 1, requireExactProvenanceForEveryTarget: true,
    maximumFalseAutoVerified: 0,
  };
  it("records the current evidence without counting synthetic fixtures as real Cases", () => {
    const phase28 = JSON.parse(
      readFileSync("output/ankh-benchmark/phase-2-8-provenance-benchmark.json", "utf8"),
    ) as { total: number; availableExactTokenReplayTargets: string[]; metrics: { falseAutoVerifiedCount: number } };
    const coverage = {
      realCaseCount: 1,
      independentlyReviewedRealCaseCount: 0,
      realDocumentCount: 5,
      layoutFamilies: ["real-clinical-mixed-images"],
      languages: ["en"],
      sourceTypes: ["mobile_photo"],
      documentTypes: ["RADIOLOGY", "PATHOLOGY", "PROCEDURE"],
      qualityBands: ["high"],
      correctedOrAddendumCount: 0,
      targetsWithExactProvenance: phase28.availableExactTokenReplayTargets.length,
      totalRealTargets: phase28.total,
      falseAutoVerifiedCount: phase28.metrics.falseAutoVerifiedCount,
    };
    const readiness = evaluateValidationReadiness(coverage, proposedRequirements);
    const artifact = {
      schemaVersion: "1.0",
      kind: "phase_2_9_real_world_validation_readiness",
      evaluatedAt: "2026-09-03",
      policyVersion: "phase-2.7-shadow-v1",
      policyChanged: false,
      protocolStatus: "PROPOSED_NOT_APPROVED",
      proposedRequirements,
      syntheticFixturesCountedAsRealCases: false,
      productionMutation: false,
      coverage,
      readiness,
    };
    writeFileSync(
      "output/ankh-benchmark/phase-2-9-readiness-audit.json",
      `${JSON.stringify(artifact, null, 2)}\n`,
    );
    expect(readiness.status).toBe("INSUFFICIENT_REAL_WORLD_COVERAGE");
    expect(readiness.passedGateCount).toBe(1);
    expect(readiness.gates.find((gate) => gate.gate === "false_auto_verified")?.passed).toBe(true);
    expect(readiness.gates.find((gate) => gate.gate === "exact_provenance")?.passed).toBe(false);
  });

  it("requires every broader-validation gate before a release decision", () => {
    expect(evaluateValidationReadiness({
      realCaseCount: 5,
      independentlyReviewedRealCaseCount: 5,
      realDocumentCount: 15,
      layoutFamilies: ["a", "b", "c", "d", "e"],
      languages: ["en", "ru"],
      sourceTypes: ["pdf_text", "scan", "mobile_photo"],
      documentTypes: ["LAB", "RADIOLOGY", "PATHOLOGY", "PROCEDURE"],
      qualityBands: ["high", "medium", "low"],
      correctedOrAddendumCount: 1,
      targetsWithExactProvenance: 100,
      totalRealTargets: 100,
      falseAutoVerifiedCount: 0,
    }, proposedRequirements).status).toBe("READY_FOR_RELEASE_DECISION");
  });
});
