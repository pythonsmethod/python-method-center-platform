import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/clinical-real-minimized-v1.json";
import {
  extractClinicalClosureDocumentEvidence,
  findExactTokenProvenance,
} from "@/lib/clinical-evidence";
import {
  evaluateShadowBenchmark,
  type CheckResult,
  type EvidenceClass,
  type ShadowBenchmarkTarget,
} from "@/lib/verification-trust";

type ClosureArtifact = { rows: Array<{ target_id: string }> };

const artifact = JSON.parse(
  readFileSync("output/ankh-benchmark/phase-2-5c-closure-benchmark.json", "utf8"),
) as ClosureArtifact;

const evidenceClass = (id: string): EvidenceClass =>
  id.includes("date")
    ? "DATE_EVENT"
    : id.includes("birads")
      ? "RADIOLOGY_CODED_CATEGORY"
      : id.includes("mass") || id.includes("size") || id.includes("nipple")
        ? "RADIOLOGY_MEASUREMENT"
        : id.startsWith("h_") &&
            (id.includes("grade") || id.includes("tubule") || id.includes("nuclear") || id.includes("mitoses"))
          ? "PATHOLOGY_STRUCTURED_SCORE"
          : id.startsWith("h_") &&
              (id.includes("er") || id.includes("pr") || id.includes("her2") || id.includes("method"))
            ? "BIOMARKER_STRUCTURED"
            : id === "b_path_link"
              ? "DOCUMENT_RELATION"
              : id.includes("laterality") || id.includes("clock")
                ? "LATERALITY_SITE"
                : id.startsWith("b_") || id.startsWith("p_")
                  ? "PROCEDURE_STRUCTURED_FACT"
                  : "NARRATIVE_SOURCE_FACT";

const checks: CheckResult[] = [
  "NUMERIC_PARSE",
  "UNIT_VALUE_SEPARATION",
  "REFERENCE_VALUE_SEPARATION",
  "LABEL_VALUE_ASSOCIATION",
  "DATE_EVENT_ASSOCIATION",
  "LATERALITY_SITE_ASSOCIATION",
  "IDEMPOTENCY",
  "SOURCE_EXISTS",
  "SCHEMA_CONSTRAINTS",
  "LAYOUT_CONTRADICTION",
].map((name) => ({ name: name as CheckResult["name"], passed: true }));

function availableP3Targets() {
  const pathology = findExactTokenProvenance(
    fixture.pathology.text,
    fixture.pathology.tokens[0].page,
    fixture.pathology.tokens,
  );
  expect(pathology.status).toBe("P3");

  const biomarkerResult = extractClinicalClosureDocumentEvidence(
    {
      blocks: [],
      tokens: fixture.biomarkers.tokens,
      layout: { structuredTablesSufficient: false },
    },
    {
      caseId: "phase-2-8-benchmark",
      sourceDocumentId: "R2",
      providerVersion: fixture.providerVersion,
      parserVersion: "clinical-provenance-v1",
    },
  );
  expect(biomarkerResult.facts).toHaveLength(5);
  expect(biomarkerResult.facts.every((fact) => fact.tokenProvenance?.level === "P3")).toBe(true);

  const patterns: Record<string, RegExp> = {
    h_er: /^Estrogen Receptor.*Positive/i,
    h_er_pct: /^Percentage of Cells.*85/i,
    h_pr: /^Progesterone Receptor.*Negative/i,
    h_her2: /^HER2.*Negative.*Score 0/i,
    h_method: /^HER2 by Immunohistochemistry.*IHC/i,
  };
  for (const [targetId, pattern] of Object.entries(patterns)) {
    expect(biomarkerResult.facts.some((fact) => pattern.test(fact.originalText))).toBe(true);
    expect(targetId).toMatch(/^h_/);
  }
  return new Set(["h_mitoses", ...Object.keys(patterns)]);
}

describe("Phase 2.8 provenance benchmark", () => {
  it("reruns all 47 targets under the unchanged Phase 2.7 policy", () => {
    const p3Targets = availableP3Targets();
    const targets: ShadowBenchmarkTarget[] = artifact.rows.map((row) => {
      const targetClass = evidenceClass(row.target_id);
      return {
        targetId: row.target_id,
        evidenceClass: targetClass,
        humanSourceOutcome: "CONFIRMED",
        candidate: {
          factId: row.target_id,
          evidenceClass: targetClass,
          inputVerificationState: "NEEDS_REVIEW",
          confidences: {
            ocrText: 0.99,
            layout: 0.99,
            fieldParse: 0.99,
            sourceProvenance: 0.99,
            normalization: 0.99,
            crossCheck: 0.99,
            documentQuality: 0.99,
            contextAssociation: 0.99,
          },
          provenanceLevel: p3Targets.has(row.target_id) ? "P3" : "P2",
          deterministicChecks: checks,
          crossChecks: [{ method: "EXACT_SOURCE_SPAN", independentSignal: true, passed: true }],
          normalizationRequired: false,
          competingCandidateCount: 1,
          sourceAmbiguous: row.target_id === "b_path_link",
        },
      };
    });

    const report = evaluateShadowBenchmark(targets);
    const output = {
      schemaVersion: "1.0",
      kind: "phase_2_8_provenance_47_target_benchmark",
      sourceArtifact: "phase-2-5c-closure-benchmark.json",
      sourceFixture: "clinical-real-minimized-v1.json",
      policyVersion: "phase-2.7-shadow-v1",
      policyChanged: false,
      productionMutation: false,
      analysisScope: "PROVENANCE_ISOLATION_ONLY",
      candidateSignalSource: "PHASE_2_7_CONTROLLED_CONSTANTS_NOT_REAL_MEASUREMENTS",
      trustOutcomeLimitation: "Coverage and precision are not a new empirical trust estimate.",
      availableExactTokenReplayTargets: [...p3Targets].sort(),
      unavailableRawTokenReplayTargets: 47 - p3Targets.size,
      ...report,
    };
    writeFileSync(
      "output/ankh-benchmark/phase-2-8-provenance-benchmark.json",
      `${JSON.stringify(output, null, 2)}\n`,
    );

    expect(report.total).toBe(47);
    expect(report.metrics.provenanceLevelDistribution).toEqual({ P2: 41, P3: 6 });
    expect(report.metrics.policyBlockReasonDistribution).toMatchObject({
      INSUFFICIENT_PROVENANCE_LEVEL: 6,
      MISSING_TOKEN_PROVENANCE: 41,
    });
    expect(report.metrics.autoVerifyCoverage).toBe(0);
    expect(report.metrics.falseAutoVerifiedCount).toBe(0);
    expect(report.metrics.needsReviewRate).toBe(46 / 47);
    expect(report.metrics.sourceOnlyRate).toBe(1 / 47);
    expect(report.rows.every((row) => row.policyVersion === "phase-2.7-shadow-v1")).toBe(true);
    expect(report.rows.filter((row) => row.provenanceLevel === "P3").every((row) => !row.wouldAutoVerify)).toBe(true);
  });
});
