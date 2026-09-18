import { createHash } from "node:crypto";
import { buildCanonicalFacts, parseGoogleDocumentAILabRows } from "./pipeline";
import type { ExtractedLabRow } from "./types";
import type { NormalizedDocumentExtraction } from "@/lib/document-extraction/types";
import { spatialTokensFromNormalizedPage } from "@/lib/clinical-evidence/provenance";
import { aggregateCoordinates, createDeskewedSpatialTokens, reconstructSpatialTables, tokenRect,
  type SpatialCell, type SpatialDeskewTransform } from "@/lib/clinical-evidence/spatial-table";

const aliases: Record<string, string> = {
  test: "test", analyte: "test", item: "test", показатель: "test", исследование: "test",
  result: "value", value: "value", результат: "value", значение: "value",
  unit: "unit", units: "unit", единицы: "unit",
  reference: "reference", range: "reference", референс: "reference", норма: "reference",
  flag: "flag", флаг: "flag",
};
const role = (text: string) => aliases[text.trim().toLowerCase().replace(/:$/, "")];
export type LabCellSource = {
  text: string; tokenIds: string[]; tokens: { id: string; text: string; span: { start: number; end: number } | null;
    coordinates: NonNullable<ExtractedLabRow["sourceCoordinates"]> }[];
  page: number;
  /** Immutable provider/source coordinates used for provenance and highlighting. */
  coordinates: NonNullable<ExtractedLabRow["sourceCoordinates"]>;
  /** Optional derivative coordinates used only to associate cells into rows. */
  associationCoordinates: NonNullable<ExtractedLabRow["sourceCoordinates"]>;
  coordinateTransform: SpatialDeskewTransform | null;
  anchorsValidated: boolean;
};
const geometryHash = (tokens: ReturnType<typeof spatialTokensFromNormalizedPage>) => createHash("sha256")
  .update(JSON.stringify(tokens.map(token => ({ id: token.id, page: token.page, coordinates: token.coordinates }))))
  .digest("hex");

export function extractSpatialLabCandidates(document: NormalizedDocumentExtraction) {
  const candidates: { row: ExtractedLabRow; cells: Record<string, LabCellSource | null>; issues: string[] }[] = [];
  const pageIssues: { page: number; reason: string }[] = [];
  const pageTransforms: { page: number; transform: SpatialDeskewTransform;
    sourceGeometryHashSha256: string; derivativeGeometryHashSha256: string }[] = [];
  for (const page of document.pages) {
    const tokens = spatialTokensFromNormalizedPage(page);
    const invalid = tokens.length !== page.tokens.length || tokens.some(t => !tokenRect(t)) || new Set(tokens.map(t => t.id)).size !== tokens.length;
    if (invalid) { pageIssues.push({ page: page.pageNumber, reason: "INVALID_OR_MISSING_TOKEN_GEOMETRY" }); continue; }
    // Derivative header routing only; source text is recovered from original tokens.
    const mapped = tokens.map(t => ({ ...t, text: role(t.text) ?? t.text }));
    const deskew = createDeskewedSpatialTokens(mapped, {
      orientationAnchors: ["test", "value", "unit", "reference", "flag"],
    });
    if (deskew.status === "REJECTED") {
      pageIssues.push({ page: page.pageNumber, reason: `DESKEW_${deskew.reason}` });
      continue;
    }
    if (deskew.transform) pageTransforms.push({ page: page.pageNumber, transform: deskew.transform,
      sourceGeometryHashSha256: geometryHash(tokens), derivativeGeometryHashSha256: geometryHash(deskew.tokens) });
    const tables = reconstructSpatialTables(deskew.tokens, { structuredTablesSufficient: false,
      headerRoles: ["test", "value", "unit", "reference", "flag"], mergeWrappedValues: false }).tables;
    for (const table of tables) {
      if (!table.headers.includes("test") || !table.headers.includes("value") || new Set(table.headers).size !== table.headers.length) {
        pageIssues.push({ page: page.pageNumber, reason: "AMBIGUOUS_OR_UNSUPPORTED_HEADERS" }); continue;
      }
      for (const spatial of table.rows) {
        const cells: Record<string, LabCellSource | null> = {};
        const sourceCell = (cell: SpatialCell | null): LabCellSource | null => {
          if (!cell) return null;
          const originals = cell.tokens.map(t => tokens.find(original => original.id === t.id)!);
          const anchored = originals.every(t => t.textAnchor && Number.isSafeInteger(t.textAnchor.start) && Number.isSafeInteger(t.textAnchor.end)
            && t.textAnchor.start >= 0 && t.textAnchor.end > t.textAnchor.start && t.textAnchor.end <= document.text.length
            && document.text.slice(t.textAnchor.start, t.textAnchor.end) === t.text);
          return { text: originals.map(t => t.text.trim()).join(" "), tokenIds: originals.map(t => t.id),
            tokens: originals.map(t => ({ id: t.id, text: t.text, span: t.textAnchor ?? null, coordinates: t.coordinates })),
            page: page.pageNumber, coordinates: aggregateCoordinates(originals),
            associationCoordinates: cell.coordinates, coordinateTransform: deskew.transform, anchorsValidated: anchored };
        };
        table.headers.forEach((header, i) => { cells[header] = sourceCell(spatial.cells[i]); });
        const issues = [...spatial.issues, "SPATIAL_ASSOCIATION_REQUIRES_REVIEW",
          ...(deskew.transform ? ["SOURCE_DERIVED_DESKEW_APPLIED"] : [])];
        if (!cells.test || !cells.value) issues.push("MISSING_REQUIRED_CELL");
        if (Object.values(cells).some(c => c && !c.anchorsValidated)) issues.push("TOKEN_ANCHOR_MISMATCH");
        const numeric = cells.value?.text.trim() ?? "";
        if (!/^(?:[<>≤≥]=?\s*)?[-+]?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?$/.test(numeric)) issues.push("NON_NUMERIC_OR_COMPETING_VALUE");
        candidates.push({ cells, issues, row: {
          originalTestName: cells.test?.text ?? "", valueOriginal: cells.value?.text ?? "",
          unitOriginal: cells.unit?.text ?? null, referenceOriginal: cells.reference?.text ?? null,
          labFlagOriginal: cells.flag?.text ?? null, sourcePage: page.pageNumber,
          sourceCoordinates: cells.value?.coordinates ?? cells.test?.coordinates ?? null,
          extractionConfidence: Math.min(...spatial.cells.filter((c): c is SpatialCell => c !== null).map(c => c.ocrConfidence ?? 0)),
          associationAmbiguous: true,
        } });
      }
    }
    if (!tables.length) pageIssues.push({ page: page.pageNumber, reason: "NO_SUPPORTED_SPATIAL_TABLE" });
  }
  return { candidates, pageIssues, pageTransforms };
}

/** Opt-in review-only bridge. No writes; production callers remain unchanged. */
export function buildReviewOnlyLabFacts(document: NormalizedDocumentExtraction, context: Parameters<typeof buildCanonicalFacts>[1]) {
  const native = parseGoogleDocumentAILabRows(document.raw);
  const nativePages = new Set(native.map(row => row.sourcePage));
  const fallback = extractSpatialLabCandidates({ ...document, pages: document.pages.filter(p => !nativePages.has(p.pageNumber)) });
  const eligible = fallback.candidates.filter(c => c.row.originalTestName && c.row.valueOriginal && !c.issues.includes("NON_NUMERIC_OR_COMPETING_VALUE"));
  const canonical = buildCanonicalFacts([...native, ...eligible.map(c => c.row)], context);
  const facts = canonical.facts.map(fact => ({ ...fact, verificationStatus: "NEEDS_REVIEW" as const,
    verificationIssues: [...new Set([...fact.verificationIssues, "INDEPENDENT_SOURCE_REVIEW_REQUIRED",
      ...eligible.filter(c => c.row.sourcePage === fact.sourcePage && c.row.originalTestName === fact.originalTestName && c.row.valueOriginal === fact.valueOriginal).flatMap(c => c.issues)])] }));
  return { facts, nativeRows: native.length, spatialRows: eligible.length,
    unresolvedRows: fallback.candidates.length - eligible.length, sourceCells: fallback.candidates,
    pageIssues: fallback.pageIssues, pageTransforms: fallback.pageTransforms,
    counters: { ...canonical.counters, facts_verified: 0, facts_needing_review: facts.length, facts_rejected: 0 } };
}
