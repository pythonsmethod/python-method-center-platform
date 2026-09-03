import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildCanonicalFacts, buildCanonicalFactsFromGoogleResponse, canonicalizeLabRow, parseNumericValue, parseReferenceInterval } from "@/lib/canonical-facts";
import { fixtureA, fixtureB, fixtureC, fixtureD, fixtureE, fixtureF, fixtureG } from "@/tests/fixtures/canonical-lab-facts";

const context = { caseId: "case-synthetic", sourceDocumentId: "document-synthetic", extractionProvider: "google-document-ai", extractionVersion: "pretrained-ocr-v2.1-2024-08-07" };

describe("canonical laboratory fact parsing", () => {
  it.each([
    ["9.6", 9.6, null], ["5,4", 5.4, null], ["-2.5", -2.5, null],
    ["1.2e3", 1200, null], ["< 1.0", 1, "<"], ["≥3,5", 3.5, ">="]
  ])("parses numeric syntax %s", (input, numeric, comparator) => {
    expect(parseNumericValue(input)).toEqual({ numeric, comparator });
  });

  it.each([
    ["12–15", 12, 15], ["12 - 15", 12, 15], ["< 5", null, 5],
    ["> 10", 10, null], ["≤ 3.5", null, 3.5]
  ])("separates reference interval %s", (input, low, high) => {
    expect(parseReferenceInterval(input)).toEqual({ low, high });
  });

  it("preserves original values while normalizing known names, units and flags", () => {
    const fact = canonicalizeLabRow(fixtureA[0], context);
    expect(fact).toMatchObject({
      originalTestName: "Hemoglobin", normalizedTestName: "Hemoglobin",
      valueOriginal: "9.6", valueNumeric: 9.6, unitOriginal: "g/dL", unitNormalized: "g/dL",
      referenceOriginal: "12.0–15.5", referenceLow: 12, referenceHigh: 15.5,
      labFlagOriginal: "LOW", verificationStatus: "VERIFIED", sourcePage: 1
    });
    expect(fact.sourceCoordinates).toEqual(fixtureA[0].sourceCoordinates);
  });

  it("supports decimal comma, inequalities, missing reference and multiple pages", () => {
    expect(canonicalizeLabRow(fixtureB, context).valueNumeric).toBe(5.4);
    expect(canonicalizeLabRow(fixtureC, context)).toMatchObject({ valueComparator: "<", referenceHigh: 3.5 });
    expect(canonicalizeLabRow(fixtureD, context)).toMatchObject({ referenceLow: null, referenceHigh: null });
    expect(buildCanonicalFacts(fixtureE, context).facts.map((fact) => fact.sourcePage)).toEqual([1, 2]);
  });

  it("routes low-confidence or ambiguous rows to selective review", () => {
    const result = buildCanonicalFacts([fixtureF], context);
    expect(result.facts[0].verificationStatus).toBe("NEEDS_REVIEW");
    expect(result.verificationRequests[0].fields).toEqual(expect.arrayContaining(["value", "row_association"]));
    expect(result.counters.facts_needing_review).toBe(1);
  });

  it("does not guess an unknown test mapping", () => {
    const fact = canonicalizeLabRow({ ...fixtureB, originalTestName: "Novel Marker X" }, context);
    expect(fact).toMatchObject({ normalizedTestName: null, normalizationStatus: "UNRESOLVED", comparabilityStatus: "NOT_COMPARABLE" });
  });

  it("is idempotent for duplicate processing input", () => {
    const once = buildCanonicalFacts(fixtureG, context);
    const twice = buildCanonicalFacts(fixtureG, context);
    expect(once.facts).toHaveLength(1);
    expect(twice.facts[0].factId).toBe(once.facts[0].factId);
    expect(twice.facts[0].factFingerprint).toBe(once.facts[0].factFingerprint);
  });
});

function googleTableFixture() {
  const values = ["Test", "Result", "Unit", "Reference", "Flag", "Hemoglobin", "9.6", "g/dL", "12.0–15.5", "LOW"];
  let text = "";
  const cells = values.map((value) => {
    const startIndex = text.length;
    text += `${value}\n`;
    return { layout: { textAnchor: { textSegments: [{ startIndex: String(startIndex), endIndex: String(startIndex + value.length) }] }, confidence: 0.98, boundingPoly: { normalizedVertices: [{ x: 0.1, y: 0.2 }] } } };
  });
  return { document: { text, pages: [{ pageNumber: 1, tables: [{ headerRows: [{ cells: cells.slice(0, 5) }], bodyRows: [{ cells: cells.slice(5) }] }] }] } };
}

describe("Google Document AI to canonical facts integration", () => {
  it("converts a synthetic OCR table into a verified canonical Hemoglobin fact", () => {
    const result = buildCanonicalFactsFromGoogleResponse(googleTableFixture(), context);
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0]).toMatchObject({
      originalTestName: "Hemoglobin", normalizedTestName: "Hemoglobin", valueOriginal: "9.6",
      valueNumeric: 9.6, unitOriginal: "g/dL", unitNormalized: "g/dL",
      referenceOriginal: "12.0–15.5", referenceLow: 12, referenceHigh: 15.5,
      labFlagOriginal: "LOW", verificationStatus: "VERIFIED", sourcePage: 1
    });
    expect(result.counters).toMatchObject({ documents_processed: 1, facts_extracted: 1, facts_verified: 1 });
  });
});

describe("canonical fact persistence migration", () => {
  it("extends existing cases/documents with idempotency and service-only RLS", () => {
    const migration = readFileSync("supabase/migrations/20260901150000_canonical_lab_facts.sql", "utf8");
    expect(migration).toContain("references public.uploaded_documents(id)");
    expect(migration).toContain("references public.client_cases(id)");
    expect(migration).toContain("unique (extraction_id, fact_fingerprint)");
    expect(migration).toContain('create policy "canonical_lab_facts_service_only"');
    expect(migration).toContain("using (false) with check (false)");
  });
});
