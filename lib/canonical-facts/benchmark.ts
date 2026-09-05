import type { CanonicalLabFact } from "@/lib/canonical-facts/types";
import type { GoldDataset, GoldDocument, GoldObservation } from "@/lib/canonical-facts/gold-dataset";
import { validateGoldDatasetSecurity } from "@/lib/canonical-facts/gold-dataset";

export type ExtractionErrorCategory = "OCR_VALUE" | "OCR_UNIT" | "ROW_ASSOCIATION" | "REFERENCE_PARSE" | "DATE_PARSE" | "PROVENANCE" | "NORMALIZATION" | "DUPLICATE" | "FALSE_VERIFIED" | "MISSED_FACT" | "TABLE_STRUCTURE_MISSING" | "LAYOUT_RECONSTRUCTION";
export type BenchmarkError = { documentId: string; observationId: string | null; category: ExtractionErrorCategory; critical: boolean; falseVerified: boolean };
export type AccuracyMetric = { correct: number; total: number; rate: number | null };

export type BenchmarkReport = {
  schemaVersion: "1.0";
  datasetId: string;
  datasetVersion: string;
  datasetKind: GoldDataset["datasetKind"];
  parserVersion: string;
  providerVersion: string;
  generatedAt: string;
  documentCount: number;
  pageCount: number;
  metrics: {
    criticalNumericExactMatch: AccuracyMetric;
    analyteNameAccuracy: AccuracyMetric;
    unitAccuracy: AccuracyMetric;
    referenceIntervalAccuracy: AccuracyMetric;
    laboratoryFlagAccuracy: AccuracyMetric;
    collectionDateAccuracy: AccuracyMetric;
    rowAssociationAccuracy: AccuracyMetric;
    provenanceAvailability: AccuracyMetric;
    verifiedPrecision: AccuracyMetric;
    needsReviewRecall: AccuracyMetric;
    missedObservationRate: number;
    falseObservationRate: number;
    duplicateErrorRate: number;
    documentFullPassRate: number;
    latencyMsPerDocument: number;
    latencyMsPerPage: number;
    estimatedProviderCostUsdPerDocument: number;
    estimatedProviderCostUsdPerPage: number;
  };
  criticalExtractionErrors: number;
  falseVerifiedCriticalErrors: number;
  errors: BenchmarkError[];
  securityIssues: string[];
};

const metric = (correct: number, total: number): AccuracyMetric => ({ correct, total, rate: total ? correct / total : null });
const same = (a: unknown, b: unknown) => a === b;
const nameKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function findFact(truth: GoldObservation, facts: CanonicalLabFact[], used: Set<string>) {
  return facts.find((fact) => !used.has(fact.factFingerprint) && fact.sourcePage === truth.page && nameKey(fact.originalTestName) === nameKey(truth.originalTestName));
}

function addError(errors: BenchmarkError[], document: GoldDocument, truth: GoldObservation | null, category: ExtractionErrorCategory, critical: boolean, fact?: CanonicalLabFact) {
  errors.push({ documentId: document.documentId, observationId: truth?.observationId ?? null, category, critical, falseVerified: Boolean(critical && fact?.verificationStatus === "VERIFIED") });
  if (critical && fact?.verificationStatus === "VERIFIED" && category !== "FALSE_VERIFIED") {
    errors.push({ documentId: document.documentId, observationId: truth?.observationId ?? null, category: "FALSE_VERIFIED", critical: true, falseVerified: true });
  }
}

export function runGoldBenchmark(dataset: GoldDataset, versions: { parserVersion: string; providerVersion: string; generatedAt?: string }): BenchmarkReport {
  let numericCorrect = 0, numericTotal = 0, nameCorrect = 0, nameTotal = 0, unitCorrect = 0, unitTotal = 0;
  let referenceCorrect = 0, referenceTotal = 0, flagCorrect = 0, flagTotal = 0, dateCorrect = 0, dateTotal = 0;
  let rowCorrect = 0, rowTotal = 0, provenanceCorrect = 0, provenanceTotal = 0, verifiedCorrect = 0, verifiedTotal = 0;
  let reviewCorrect = 0, reviewTotal = 0, missed = 0, falseFacts = 0, duplicates = 0, fullPass = 0;
  const errors: BenchmarkError[] = [];
  for (const document of dataset.documents) {
    const used = new Set<string>();
    const documentErrorStart = errors.length;
    const fingerprintCounts = new Map<string, number>();
    for (const fact of document.outputFacts) fingerprintCounts.set(fact.factFingerprint, (fingerprintCounts.get(fact.factFingerprint) ?? 0) + 1);
    for (const count of fingerprintCounts.values()) if (count > 1) duplicates += count - 1;
    for (const truth of document.truth) {
      const fact = findFact(truth, document.outputFacts, used);
      nameTotal++;
      rowTotal++;
      provenanceTotal++;
      if (!fact) {
        missed++;
        addError(errors, document, truth, "MISSED_FACT", truth.expectedParseability === "PARSEABLE");
        continue;
      }
      used.add(fact.factFingerprint);
      nameCorrect++;
      rowCorrect++;
      if (fact.sourceCoordinates) provenanceCorrect++; else addError(errors, document, truth, "PROVENANCE", true, fact);
      if (truth.expectedNumericValue !== null) {
        numericTotal++;
        if (same(fact.valueNumeric, truth.expectedNumericValue) && same(fact.valueComparator, truth.expectedComparator)) numericCorrect++;
        else addError(errors, document, truth, "OCR_VALUE", true, fact);
      }
      unitTotal++;
      if (same(fact.unitOriginal, truth.expectedUnit)) unitCorrect++; else addError(errors, document, truth, "OCR_UNIT", true, fact);
      referenceTotal++;
      if (same(fact.referenceLow, truth.expectedReferenceLow) && same(fact.referenceHigh, truth.expectedReferenceHigh)) referenceCorrect++;
      else addError(errors, document, truth, "REFERENCE_PARSE", true, fact);
      flagTotal++;
      if (same(fact.labFlagOriginal, truth.expectedLabFlag)) flagCorrect++; else addError(errors, document, truth, "ROW_ASSOCIATION", true, fact);
      if (truth.expectedCollectionDate !== null) {
        dateTotal++;
        if (same(fact.collectionDate, truth.expectedCollectionDate)) dateCorrect++; else addError(errors, document, truth, "DATE_PARSE", true, fact);
      }
      if (fact.verificationStatus === "VERIFIED") {
        verifiedTotal++;
        const correct = same(fact.valueNumeric, truth.expectedNumericValue) && same(fact.valueComparator, truth.expectedComparator) && same(fact.unitOriginal, truth.expectedUnit) && same(fact.referenceLow, truth.expectedReferenceLow) && same(fact.referenceHigh, truth.expectedReferenceHigh);
        if (correct) verifiedCorrect++;
      }
      if (truth.expectedParseability !== "PARSEABLE") {
        reviewTotal++;
        if (fact.verificationStatus !== "VERIFIED") reviewCorrect++;
      }
    }
    falseFacts += document.outputFacts.filter((fact) => !used.has(fact.factFingerprint)).length;
    if (errors.length === documentErrorStart && document.outputFacts.length === document.truth.length) fullPass++;
  }
  const documentCount = dataset.documents.length;
  const pageCount = dataset.documents.reduce((sum, document) => sum + document.pageCount, 0);
  const latency = dataset.documents.reduce((sum, document) => sum + document.latencyMs, 0);
  const cost = dataset.documents.reduce((sum, document) => sum + document.pageCount * document.estimatedProviderCostUsdPerPage, 0);
  const expected = dataset.documents.reduce((sum, document) => sum + document.truth.length, 0);
  const produced = dataset.documents.reduce((sum, document) => sum + document.outputFacts.length, 0);
  return {
    schemaVersion: "1.0", datasetId: dataset.datasetId, datasetVersion: dataset.version,
    datasetKind: dataset.datasetKind, parserVersion: versions.parserVersion, providerVersion: versions.providerVersion,
    generatedAt: versions.generatedAt ?? new Date().toISOString(), documentCount, pageCount,
    metrics: {
      criticalNumericExactMatch: metric(numericCorrect, numericTotal), analyteNameAccuracy: metric(nameCorrect, nameTotal),
      unitAccuracy: metric(unitCorrect, unitTotal), referenceIntervalAccuracy: metric(referenceCorrect, referenceTotal),
      laboratoryFlagAccuracy: metric(flagCorrect, flagTotal), collectionDateAccuracy: metric(dateCorrect, dateTotal),
      rowAssociationAccuracy: metric(rowCorrect, rowTotal), provenanceAvailability: metric(provenanceCorrect, provenanceTotal),
      verifiedPrecision: metric(verifiedCorrect, verifiedTotal), needsReviewRecall: metric(reviewCorrect, reviewTotal),
      missedObservationRate: expected ? missed / expected : 0, falseObservationRate: produced ? falseFacts / produced : 0,
      duplicateErrorRate: produced ? duplicates / produced : 0, documentFullPassRate: documentCount ? fullPass / documentCount : 0,
      latencyMsPerDocument: documentCount ? latency / documentCount : 0, latencyMsPerPage: pageCount ? latency / pageCount : 0,
      estimatedProviderCostUsdPerDocument: documentCount ? cost / documentCount : 0, estimatedProviderCostUsdPerPage: pageCount ? cost / pageCount : 0
    },
    criticalExtractionErrors: errors.filter((error) => error.critical && error.category !== "FALSE_VERIFIED").length,
    falseVerifiedCriticalErrors: errors.filter((error) => error.category === "FALSE_VERIFIED").length,
    errors, securityIssues: validateGoldDatasetSecurity(dataset)
  };
}

export function compareBenchmarkReports(previous: BenchmarkReport, current: BenchmarkReport) {
  const keys = ["criticalNumericExactMatch", "analyteNameAccuracy", "unitAccuracy", "referenceIntervalAccuracy", "laboratoryFlagAccuracy", "collectionDateAccuracy", "rowAssociationAccuracy", "provenanceAvailability", "verifiedPrecision", "needsReviewRecall"] as const;
  return {
    previousParserVersion: previous.parserVersion,
    currentParserVersion: current.parserVersion,
    regressions: keys.flatMap((key) => {
      const before = previous.metrics[key].rate;
      const after = current.metrics[key].rate;
      return before !== null && after !== null && after < before ? [{ metric: key, before, after, delta: after - before }] : [];
    }),
    criticalErrorDelta: current.criticalExtractionErrors - previous.criticalExtractionErrors,
    falseVerifiedDelta: current.falseVerifiedCriticalErrors - previous.falseVerifiedCriticalErrors
  };
}

export function serializeBenchmarkReport(report: BenchmarkReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function percent(value: number | null) {
  return value === null ? "n/a" : `${(value * 100).toFixed(2)}%`;
}

export function renderBenchmarkSummary(report: BenchmarkReport): string {
  return [
    `Dataset: ${report.datasetId}@${report.datasetVersion} (${report.datasetKind})`,
    `Parser/provider: ${report.parserVersion} / ${report.providerVersion}`,
    `Documents/pages: ${report.documentCount} / ${report.pageCount}`,
    `Critical numeric exact match: ${percent(report.metrics.criticalNumericExactMatch.rate)}`,
    `Verified precision: ${percent(report.metrics.verifiedPrecision.rate)}`,
    `Needs-review recall: ${percent(report.metrics.needsReviewRecall.rate)}`,
    `Provenance availability: ${percent(report.metrics.provenanceAvailability.rate)}`,
    `Critical extraction errors: ${report.criticalExtractionErrors}`,
    `False VERIFIED critical errors: ${report.falseVerifiedCriticalErrors}`,
    `Security issues: ${report.securityIssues.length}`
  ].join("\n");
}
