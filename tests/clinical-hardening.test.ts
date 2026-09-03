import { describe, it, expect } from "vitest";
import { extractMitoticScores, reconstructSpatialTables, extractSpatialEvidence, extractClinicalDocumentEvidence } from "@/lib/clinical-evidence";
import { biomarkerR2, pathologyR1, token } from "./fixtures/clinical-hardening-v1";

const options = { structuredTablesSufficient: false };
describe("R1 source-bound mitotic score", () => {
  it.each([pathologyR1, "Mitoses = 11/10HPF, score 2", "Mitotic score: 2", "Mitotic score\n2", "Mitoses 11/10 HPF,\nscore: 2"])("reads explicit score: %s", (text) => {
    expect(extractMitoticScores(text)[0]).toMatchObject({ value: 2, ambiguous: false });
  });
  it.each(["Mitoses 11/10HPF", "Mitoses 11\nNuclear score 3", "Mitotic score 2 or score 3", "Mitotic score 9"])("does not borrow unrelated or ambiguous numbers: %s", (text) => {
    expect(extractMitoticScores(text)[0]).toMatchObject({ value: null, ambiguous: true });
  });
  it("does not create a score without a source label", () => expect(extractMitoticScores("Nuclear score 3")).toEqual([]));
});
describe("R2 generic geometry", () => {
  it("integrates fallback without duplicate flat-text biomarkers or invented QA metrics", () => {
    const result = extractClinicalDocumentEvidence({ blocks: [{ text: "ER: Positive\nMitoses 15 per HPF", page: 1 }], tokens: biomarkerR2(), layout: options }, { caseId: "synthetic", sourceDocumentId: "r2", providerVersion: "fixture-v1", parserVersion: "hardening-v1" });
    expect(result.facts.filter((f) => f.evidenceType === "BIOMARKER")).toHaveLength(3);
    expect(result.counters).toMatchObject({ pathology_pattern_misses: 1, false_verified_count: null, benchmark_regression_count: null, table_objects_missing_but_fallback_used: 1 });
  });
  it("reconstructs rows, headers, columns and multi-token cells independent of input order", () => {
    const result = reconstructSpatialTables(biomarkerR2().reverse(), options);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].headers).toEqual(["marker", "result"]);
    expect(result.tables[0].rows.map((r) => r.cells.map((c) => c?.text))).toEqual([["ER", "Positive"], ["PR", "Negative"], ["HER2", "IHC 0"]]);
    expect(result.counters.spatial_rows_reconstructed).toBe(3);
  });
  it("does not run over sufficient provider tables", () => expect(reconstructSpatialTables(biomarkerR2(), { structuredTablesSufficient: true }).tables).toEqual([]));
  it("rejects prose without semantic table headers", () => expect(reconstructSpatialTables([token("Paragraph", .1, .1), token("text", .6, .1)], options).tables).toEqual([]));
  it("rejects one-row pseudo tables", () => expect(reconstructSpatialTables(biomarkerR2().slice(0, 4), options).tables).toEqual([]));
  it("retains missing cells for review", () => {
    const result = reconstructSpatialTables([...biomarkerR2(), token("ER", .1, .26)], options);
    expect(result.tables[0].rows[3]).toMatchObject({ verificationStatus: "NEEDS_REVIEW", issues: ["MISSING_CELL"] });
  });
  it("does not silently verify a wrapped value", () => {
    const result = reconstructSpatialTables([...biomarkerR2(), token("Score", .6, .24)], options);
    expect(result.tables[0].rows[2].issues).toContain("WRAPPED_ASSOCIATION");
    expect(result.tables[0].rows[2].verificationStatus).toBe("NEEDS_REVIEW");
  });
  it("keeps nearby tables separate", () => {
    const second = biomarkerR2().map((t) => ({ ...t, id: `second-${t.id}`, coordinates: { normalizedVertices: t.coordinates.normalizedVertices!.map((p) => ({ ...p, y: p.y! + .2 })) } }));
    expect(reconstructSpatialTables([...biomarkerR2(), ...second], options).tables).toHaveLength(2);
  });
  it("does not cross pages", () => {
    const tables = reconstructSpatialTables(biomarkerR2().map((t, i) => ({ ...t, page: i > 3 ? 2 : 1 })), options).tables;
    expect(tables).toHaveLength(1);
    expect(tables[0].page).toBe(2);
    expect(tables[0].rows.flatMap((r) => r.cells.flatMap((c) => c?.tokens ?? [])).every((t) => t.page === 2)).toBe(true);
  });
  it("keeps OCR confidence distinct from layout confidence", () => {
    const result = reconstructSpatialTables(biomarkerR2().map((t) => ({ ...t, confidence: .5 })), options);
    expect(result.tables[0].rows[0]).toMatchObject({ layoutConfidence: .95, verificationStatus: "NEEDS_REVIEW" });
  });
  it("rejects malformed geometry", () => {
    const result = reconstructSpatialTables([{ ...token("ER", .1, .1), coordinates: {} }], options);
    expect(result.counters.layout_reconstruction_failures).toBe(1);
    expect(result.tables).toEqual([]);
  });
  it("retains boundary overlaps as ambiguous", () => {
    const input = biomarkerR2();
    input[3] = token("Positive", .35, .14, .3);
    const row = reconstructSpatialTables(input, options).tables[0].rows[0];
    expect(row.issues).toContain("COLUMN_BOUNDARY_OVERLAP");
    expect(row.verificationStatus).toBe("NEEDS_REVIEW");
  });
  it("recognizes headerless synoptic labels without inferring verified associations", () => {
    const rows = reconstructSpatialTables(biomarkerR2().slice(2), options).tables[0].rows;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.verificationStatus === "NEEDS_REVIEW")).toBe(true);
  });
  it("refuses headerless layouts with unstable value columns", () => {
    expect(reconstructSpatialTables([token("ER", .1, .1), token("Positive", .6, .1), token("PR", .1, .14), token("Negative", .8, .14)], options).tables).toEqual([]);
  });
  it("maps biomarkers with full row provenance and review gate", () => {
    const result = extractSpatialEvidence(biomarkerR2(), { caseId: "synthetic", sourceDocumentId: "r2", providerVersion: "fixture-v1", parserVersion: "hardening-v1" }, options);
    expect(result.facts).toHaveLength(3);
    expect(result.facts.every((f) => f.verificationStatus === "NEEDS_REVIEW")).toBe(true);
    expect(result.facts[0].sourceCoordinates?.normalizedVertices).toEqual([{ x: .1, y: .14 }, { x: .72, y: .14 }, { x: .72, y: .15500000000000003 }, { x: .1, y: .15500000000000003 }]);
  });
});
