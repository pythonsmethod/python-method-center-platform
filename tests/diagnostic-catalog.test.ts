import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CATALOG_VERSION, LocalDiagnosticCatalog, getDiagnosticCatalog } from "@/lib/nexora/diagnostic-catalog/catalog";
import type { DiagnosticCatalog } from "@/lib/nexora/diagnostic-catalog/types";

let catalog: DiagnosticCatalog;
beforeAll(() => { catalog = getDiagnosticCatalog(); }, 20000);

describe("versioned public diagnostic catalog", () => {
  it("loads every declared source shard with count and checksum validation", () => {
    expect(catalog.version).toBe(CATALOG_VERSION);
    expect(getDiagnosticCatalog()).toBe(catalog);
    const manifest = JSON.parse(readFileSync("data/diagnostic-catalog/manifest.json", "utf8"));
    expect(Object.fromEntries(Object.entries(manifest.sources).map(([key, value]) => [key, (value as { count: number }).count])))
      .toEqual({ LOINC: 112405, GTR: 64009, PMC_FAMILY: 284 });
    expect(manifest.ucumCount).toBe(759);
  });
  it("recognizes a declared LOINC identifier without assigning it or verifying a patient fact", () => {
    const result = catalog.resolve({ name: "LOINC: 1988-5", unit: "mg/L" });
    expect(result).toMatchObject({ state: "declared_code_found", totalCandidates: 1, assignedStandardCode: null, clinicalFactVerified: false, requiresHumanReview: true, unit: { original: "mg/L", listedCaseSensitiveCode: true, conversionPerformed: false } });
    expect(result.candidates[0]).toMatchObject({ system: "LOINC", code: "1988-5", version: "2.83" });
    expect(result.candidates[0].display).toContain("C reactive protein");
  });
  it.each(["glucose", "CRP", "PCT", "free T4"])("keeps name search %s as unassigned candidates or unknown", name => {
    const result = catalog.resolve({ name });
    expect(["candidates", "unknown"]).toContain(result.state);
    expect(result.assignedStandardCode).toBeNull();
    expect(result.clinicalFactVerified).toBe(false);
    expect(result.candidates.length).toBeLessThanOrEqual(3);
    expect(result.truncated).toBe(result.totalCandidates > 3);
  });
  it("reports ambiguity and total count without labeling the first hit as the answer", () => {
    const result = catalog.resolve({ name: "glucose" });
    expect(result.state).toBe("candidates");
    expect(result.totalCandidates).toBeGreaterThan(3);
    expect(result.candidates).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });
  it("does not fall back from unknown or conflicting declared codes to a plausible name", () => {
    expect(catalog.resolve({ name: "Glucose LOINC: 99999999-9" }).state).toBe("declared_code_unknown");
    expect(catalog.resolve({ name: "LOINC 1988-5 / LOINC 2345-7" }).state).toBe("conflicting_codes");
  });
  it("preserves unknown names and unit case without conversion or validity claims", () => {
    const unknown = "SYNTHETIC-UNLISTED-ASSAY-ZZQ";
    const result = catalog.resolve({ name: unknown, unit: "MG/l" });
    expect(result).toMatchObject({ query: unknown, state: "unknown", unit: { original: "MG/l", listedCaseSensitiveCode: false, conversionPerformed: false } });
  });
  it("bounds input and does not retain caller mutations in the public cache", () => {
    expect(catalog.resolve({ name: "x".repeat(301) }).state).toBe("input_too_long");
    const result = catalog.resolve({ name: "LOINC: 1988-5" });
    result.candidates[0].display = "SYNTHETIC CORRUPTION";
    expect(catalog.resolve({ name: "LOINC: 1988-5" }).candidates[0].display).not.toBe("SYNTHETIC CORRUPTION");
  });
  it("retains GTR source identity and Clinical/Research labeling", () => {
    const manifest = JSON.parse(readFileSync("data/diagnostic-catalog/manifest.json", "utf8"));
    expect(manifest.sources.GTR.url).toBe("https://www.ncbi.nlm.nih.gov/gtr/docs/maintenance_use/");
    const result = catalog.resolve({ name: "BRCA1" });
    expect(result.candidates.some(item => item.system === "GTR")).toBe(true);
    for (const term of result.candidates.filter(item => item.system === "GTR")) {
      expect(term.code).toMatch(/^GTR\d{9}\.\d+$/);
      expect(["Clinical", "Research"]).toContain(term.testType);
      expect(catalog.resolve({ name: term.code }).state).toBe("declared_code_found");
    }
  });
  it("rejects a damaged shard before serving reference candidates", () => {
    const dir = mkdtempSync(join(tmpdir(), "pmc-catalog-test-"));
    try {
      const manifest = JSON.parse(readFileSync("data/diagnostic-catalog/manifest.json", "utf8"));
      writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
      writeFileSync(join(dir, manifest.files[0].path), "damaged synthetic data");
      expect(() => new LocalDiagnosticCatalog(dir)).toThrow("CATALOG_CHECKSUM_MISMATCH");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
