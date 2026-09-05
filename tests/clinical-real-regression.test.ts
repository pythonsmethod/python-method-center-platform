import { describe, expect, it } from "vitest";
import fixture from "./fixtures/clinical-real-minimized-v1.json";
import { extractClinicalClosureDocumentEvidence, extractClinicalDocumentEvidence, extractMitoticScores, reconstructSpatialTables } from "@/lib/clinical-evidence";
import { biomarkerR2 } from "./fixtures/clinical-hardening-v1";

const options = { structuredTablesSufficient: false };
describe("minimized real OCR regressions", () => {
  it("extracts the source score rather than the historical incorrect Gold value", () => {
    expect(extractMitoticScores(fixture.pathology.text)).toEqual([
      expect.objectContaining({ value: 2, ambiguous: false })
    ]);
  });

  it("retains receptor rows across wrapped values and form separators", () => {
    const result = reconstructSpatialTables(fixture.biomarkers.tokens, options);
    const rows = result.tables.flatMap((t) => t.rows);
    for (const label of [/Estrogen Receptor/, /Progesterone Receptor/, /HER2/]) {
      expect(rows.some((r) => label.test(r.cells[0]?.text ?? ""))).toBe(true);
    }
    const er = rows.find((r) => /Estrogen Receptor/.test(r.cells[0]?.text ?? ""))!;
    expect(er.cells[1]?.text).toContain("positivity )");
    expect(rows.every((r) => r.verificationStatus === "NEEDS_REVIEW")).toBe(true);
    const retained = rows.flatMap((r) => r.cells.flatMap((c) => c?.tokens ?? []));
    expect(new Set(retained.map((t) => t.id)).size).toBe(retained.length);
    expect(retained.every((t) => fixture.biomarkers.tokens.some((s) => s.id === t.id))).toBe(true);
  });

  it("keeps real reconstructed clinical facts in review", () => {
    const result = extractClinicalDocumentEvidence({ blocks: [], tokens: fixture.biomarkers.tokens, layout: options },
      { caseId: "minimized", sourceDocumentId: "R2", providerVersion: fixture.providerVersion, parserVersion: "clinical-hardening-v2" });
    expect(result.facts).toHaveLength(5);
    expect(result.facts.every((f) => f.verificationStatus === "NEEDS_REVIEW" && f.sourceCoordinates)).toBe(true);
  });

  it("retains native supporting token IDs as P3 without changing review state", () => {
    const result = extractClinicalClosureDocumentEvidence({ blocks: [], tokens: fixture.biomarkers.tokens, layout: options },
      { caseId: "minimized", sourceDocumentId: "R2", providerVersion: fixture.providerVersion, parserVersion: "clinical-provenance-v1" });
    expect(result.facts).toHaveLength(5);
    expect(result.facts.every((f) => f.verificationStatus === "NEEDS_REVIEW" && f.tokenProvenance?.level === "P3")).toBe(true);
    expect(result.facts.every((f) => f.tokenProvenance!.tokenIds.every((id) => fixture.biomarkers.tokens.some((token) => token.id === id)))).toBe(true);
  });

  it("does not suppress a headerless form when another table exists on the same page", () => {
    const other = biomarkerR2().map((t) => ({ ...t, page: 6, id: `other-${t.id}`,
      coordinates: { normalizedVertices: t.coordinates.normalizedVertices!.map((v) => ({ ...v, y: v.y! + .4 })) } }));
    const result = reconstructSpatialTables([...fixture.biomarkers.tokens, ...other], options);
    expect(result.tables.some((t) => t.headers[0] === "marker")).toBe(true);
    expect(result.tables.some((t) => t.headers[0] === "source-label" &&
      t.rows.some((r) => /Estrogen Receptor/.test(r.cells[0]?.text ?? "")))).toBe(true);
  });
});
