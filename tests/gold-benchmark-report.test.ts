import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, it } from "vitest";
import { renderBenchmarkSummary, runGoldBenchmark, serializeBenchmarkReport } from "@/lib/canonical-facts";
import { syntheticGoldDataset } from "@/tests/fixtures/gold-dataset/synthetic-development";

it("writes the reproducible machine-readable Ankh benchmark report", () => {
  const outputPath = resolve(process.env.ANKH_BENCHMARK_OUTPUT ?? "output/ankh-benchmark/synthetic-baseline.json");
  const report = runGoldBenchmark(syntheticGoldDataset, {
    parserVersion: process.env.ANKH_PARSER_VERSION ?? "canonical-parser-v1",
    providerVersion: process.env.ANKH_PROVIDER_VERSION ?? "pretrained-ocr-v2.1-2024-08-07"
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serializeBenchmarkReport(report), "utf8");
  process.stdout.write(`${renderBenchmarkSummary(report)}\nReport: ${outputPath}\n`);
  expect(report.securityIssues).toEqual([]);
  expect(report.falseVerifiedCriticalErrors).toBe(0);
});
