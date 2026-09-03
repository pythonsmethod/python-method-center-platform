import { describe, expect, it } from "vitest";
import { buildCanonicalFacts, compareBenchmarkReports, InMemoryCanonicalFactStaging, renderBenchmarkSummary, runGoldBenchmark, serializeBenchmarkReport, validateGoldDatasetSecurity } from "@/lib/canonical-facts";
import { fixtureF } from "@/tests/fixtures/canonical-lab-facts";
import { syntheticGoldDataset, syntheticLayoutRegistry } from "@/tests/fixtures/gold-dataset/synthetic-development";

const versions = { parserVersion: "canonical-parser-v1", providerVersion: "pretrained-ocr-v2.1-2024-08-07", generatedAt: "2026-09-01T00:00:00.000Z" };

describe("Gold Dataset benchmark runner", () => {
  it("produces a machine-readable synthetic baseline and human summary", () => {
    const report = runGoldBenchmark(syntheticGoldDataset, versions);
    expect(JSON.parse(serializeBenchmarkReport(report))).toEqual(report);
    expect(renderBenchmarkSummary(report)).toContain("Critical numeric exact match: 100.00%");
    expect(report).toMatchObject({ datasetKind: "synthetic_development", documentCount: 3, pageCount: 4, criticalExtractionErrors: 0, falseVerifiedCriticalErrors: 0 });
    expect(report.metrics).toMatchObject({
      criticalNumericExactMatch: { correct: 7, total: 7, rate: 1 },
      verifiedPrecision: { correct: 6, total: 6, rate: 1 },
      needsReviewRecall: { correct: 1, total: 1, rate: 1 },
      provenanceAvailability: { correct: 7, total: 7, rate: 1 },
      missedObservationRate: 0, falseObservationRate: 0, duplicateErrorRate: 0, documentFullPassRate: 1,
      latencyMsPerDocument: 1520 / 3, latencyMsPerPage: 380,
      estimatedProviderCostUsdPerDocument: 0.002, estimatedProviderCostUsdPerPage: 0.0015
    });
  });

  it("detects a critical numeric error and a dangerous false VERIFIED", () => {
    const broken = structuredClone(syntheticGoldDataset);
    broken.documents[0].outputFacts[0].valueNumeric = 96;
    const report = runGoldBenchmark(broken, versions);
    expect(report.criticalExtractionErrors).toBe(1);
    expect(report.falseVerifiedCriticalErrors).toBe(1);
    expect(report.errors.map((error) => error.category)).toEqual(expect.arrayContaining(["OCR_VALUE", "FALSE_VERIFIED"]));
  });

  it("makes parser-version regressions visible", () => {
    const baseline = runGoldBenchmark(syntheticGoldDataset, versions);
    const broken = structuredClone(syntheticGoldDataset);
    broken.documents[0].outputFacts[0].unitOriginal = "mg/dL";
    const current = runGoldBenchmark(broken, { ...versions, parserVersion: "canonical-parser-v2" });
    const comparison = compareBenchmarkReports(baseline, current);
    expect(comparison.regressions.map((item) => item.metric)).toContain("unitAccuracy");
    expect(comparison.falseVerifiedDelta).toBe(1);
  });

  it("rejects dataset metadata that has not completed deidentification review", () => {
    const unsafe = structuredClone(syntheticGoldDataset);
    unsafe.documents[0].metadataSanitization.filenameReviewed = false as true;
    expect(validateGoldDatasetSecurity(unsafe)).toContain("synthetic-simple-table-v1:incomplete_metadata_review");
  });

  it("keeps the layout registry statistical rather than changing parser behavior", () => {
    expect(syntheticLayoutRegistry).toHaveLength(3);
    expect(syntheticLayoutRegistry.every((entry) => entry.sampleCount === 1 && entry.lastValidatedParserVersion)).toBe(true);
  });
});

describe("isolated non-PHI staging persistence path", () => {
  it("preserves provenance/statuses and is idempotent on read-back", () => {
    const context = { caseId: "case-local", sourceDocumentId: "document-local", extractionProvider: "google-document-ai", extractionVersion: "pretrained-ocr-v2.1-2024-08-07" };
    const result = buildCanonicalFacts([fixtureF], context);
    const staging = new InMemoryCanonicalFactStaging();
    const input = { profileId: "profile-local", caseId: context.caseId, sourceDocumentId: context.sourceDocumentId, sourceFingerprint: "sha256-synthetic", extractionProvider: context.extractionProvider, extractionVersion: context.extractionVersion, parserVersion: "canonical-parser-v1", counters: result.counters, facts: result.facts };
    const first = staging.persist(input);
    const second = staging.persist(input);
    expect(second.extractionId).toBe(first.extractionId);
    expect(staging.counts()).toEqual({ runs: 1, facts: 1 });
    expect(staging.readBack(first.extractionId)[0]).toMatchObject({ sourcePage: 1, sourceCoordinates: fixtureF.sourceCoordinates, verificationStatus: "NEEDS_REVIEW", normalizationStatus: "NORMALIZED", comparabilityStatus: "HIGH" });
  });
});
