import { createHash } from "node:crypto";
import { normalizeLabFlag, normalizeTestName, normalizeUnit, normalizeWhitespace, parseNumericValue, parseReferenceInterval } from "@/lib/canonical-facts/parsing";
import type { BoundingPolygon, CanonicalFactCounters, CanonicalLabFact, ExtractedLabRow, SelectiveVerificationRequest } from "@/lib/canonical-facts/types";

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value !== null && typeof value === "object" ? value as JsonRecord : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function textFromLayout(layoutValue: unknown, fullText: string): string {
  const anchor = record(record(layoutValue).textAnchor);
  return array(anchor.textSegments).map((segment) => {
    const item = record(segment);
    return fullText.slice(Number(item.startIndex ?? 0), Number(item.endIndex ?? 0));
  }).join("");
}

function cellValue(cellValue: unknown, text: string) {
  const cell = record(cellValue);
  const layout = record(cell.layout);
  return {
    text: normalizeWhitespace(textFromLayout(layout, text)),
    confidence: typeof layout.confidence === "number" ? layout.confidence : null,
    coordinates: (layout.boundingPoly ?? null) as BoundingPolygon | null
  };
}

const HEADER_ALIASES: Record<string, string[]> = {
  test: ["test", "analyte", "analysis", "name", "показатель", "исследование", "наименование исследования"],
  value: ["result", "value", "результат", "значение"],
  unit: ["unit", "units", "единица", "ед изм", "единицы измерения"],
  reference: ["reference", "reference range", "ref", "норма", "референс", "референсные значения"],
  flag: ["flag", "status", "флаг", "отклонение"]
};

function headerKind(value: string): keyof typeof HEADER_ALIASES | null {
  const header = value.toLowerCase().replace(/[:.]/g, " ").replace(/[|/\\]/g, " ").replace(/\s+/g, " ").trim();
  return (Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.some((alias) => {
    const normalizedAlias = alias.replace(/[.:]/g, " ").replace(/\s+/g, " ").trim();
    return header === normalizedAlias || header.includes(normalizedAlias);
  }))?.[0] as keyof typeof HEADER_ALIASES | undefined) ?? null;
}

export function parseGoogleDocumentAILabRows(response: unknown): ExtractedLabRow[] {
  const document = record(record(response).document ?? response);
  const text = String(document.text ?? "");
  const rows: ExtractedLabRow[] = [];
  for (const [pageIndex, pageValue] of array(document.pages).entries()) {
    const page = record(pageValue);
    const sourcePage = Number(page.pageNumber ?? pageIndex + 1);
    for (const tableValue of array(page.tables)) {
      const table = record(tableValue);
      const headerRow = record(array(table.headerRows)[0]);
      const headers = array(headerRow.cells).map((cell) => headerKind(cellValue(cell, text).text));
      const index = (kind: string) => headers.indexOf(kind as keyof typeof HEADER_ALIASES);
      if (index("test") < 0 || index("value") < 0) continue;
      for (const bodyRowValue of array(table.bodyRows)) {
        const cells = array(record(bodyRowValue).cells).map((cell) => cellValue(cell, text));
        const test = cells[index("test")];
        const value = cells[index("value")];
        if (!test?.text || !value?.text) continue;
        const confidences = cells.map((cell) => cell.confidence).filter((item): item is number => item !== null);
        rows.push({
          originalTestName: test.text,
          valueOriginal: value.text,
          unitOriginal: cells[index("unit")]?.text || null,
          referenceOriginal: cells[index("reference")]?.text || null,
          labFlagOriginal: cells[index("flag")]?.text || null,
          sourcePage,
          sourceCoordinates: value.coordinates ?? test.coordinates,
          extractionConfidence: confidences.length ? Math.min(...confidences) : null
        });
      }
    }
  }
  return rows;
}

function stableId(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function canonicalizeLabRow(row: ExtractedLabRow, context: {
  caseId: string;
  sourceDocumentId: string;
  extractionProvider: string;
  extractionVersion: string;
}): CanonicalLabFact {
  const originalTestName = normalizeWhitespace(row.originalTestName);
  const valueOriginal = normalizeWhitespace(row.valueOriginal);
  const unitOriginal = normalizeWhitespace(row.unitOriginal ?? "") || null;
  const referenceOriginal = normalizeWhitespace(row.referenceOriginal ?? "") || null;
  const normalizedTestName = normalizeTestName(originalTestName);
  const unitNormalized = normalizeUnit(unitOriginal);
  const numeric = parseNumericValue(valueOriginal);
  const reference = parseReferenceInterval(referenceOriginal);
  const issues: string[] = [];
  if (!originalTestName || !valueOriginal) issues.push("missing_required_source_field");
  if (row.associationAmbiguous) issues.push("ambiguous_row_association");
  if (!row.sourcePage || !row.sourceCoordinates) issues.push("incomplete_provenance");
  if (row.extractionConfidence === null || row.extractionConfidence === undefined) issues.push("missing_confidence");
  else if (row.extractionConfidence < 0.9) issues.push("low_critical_field_confidence");
  if (numeric.numeric === null && /^[<>≤≥+\-\d.,e\s]+$/i.test(valueOriginal)) issues.push("unparseable_numeric_value");
  if (referenceOriginal && reference.low === null && reference.high === null) issues.push("unresolved_reference_interval");
  if (!normalizedTestName) issues.push("normalization_unresolved");
  if (unitOriginal && !unitNormalized) issues.push("unit_normalization_unresolved");
  const verificationStatus = !originalTestName || !valueOriginal
    ? "REJECTED"
    : issues.some((issue) => issue !== "normalization_unresolved" && issue !== "unit_normalization_unresolved") ? "NEEDS_REVIEW" : "VERIFIED";
  const fingerprintSource = [context.sourceDocumentId, context.extractionProvider, context.extractionVersion, row.sourcePage, originalTestName, valueOriginal, unitOriginal, referenceOriginal, normalizeLabFlag(row.labFlagOriginal)].join("|");
  const factFingerprint = createHash("sha256").update(fingerprintSource).digest("hex");
  return {
    factId: stableId(factFingerprint), factFingerprint, caseId: context.caseId,
    sourceDocumentId: context.sourceDocumentId, sourcePage: row.sourcePage,
    sourceCoordinates: row.sourceCoordinates ?? null, originalTestName,
    normalizedTestName, standardCode: null, valueOriginal, valueNumeric: numeric.numeric,
    valueComparator: numeric.comparator, unitOriginal, unitNormalized, referenceOriginal,
    referenceLow: reference.low, referenceHigh: reference.high,
    labFlagOriginal: normalizeLabFlag(row.labFlagOriginal), orderDate: row.orderDate ?? null,
    collectionDate: row.collectionDate ?? null, receivedDate: row.receivedDate ?? null,
    resultDate: row.resultDate ?? null, reportDate: row.reportDate ?? null,
    laboratoryName: row.laboratoryName ?? null, method: row.method ?? null,
    extractionConfidence: row.extractionConfidence ?? null, verificationStatus,
    verificationIssues: issues,
    normalizationStatus: normalizedTestName ? "NORMALIZED" : "UNRESOLVED",
    comparabilityStatus: normalizedTestName && (!unitOriginal || unitNormalized) ? "HIGH" : normalizedTestName ? "LIMITED" : "NOT_COMPARABLE",
    extractionProvider: context.extractionProvider, extractionVersion: context.extractionVersion
  };
}

export function buildCanonicalFacts(rows: ExtractedLabRow[], context: Parameters<typeof canonicalizeLabRow>[1]) {
  const deduplicated = new Map<string, CanonicalLabFact>();
  for (const row of rows) {
    const fact = canonicalizeLabRow(row, context);
    deduplicated.set(fact.factFingerprint, fact);
  }
  const facts = [...deduplicated.values()];
  const counters: CanonicalFactCounters = {
    documents_processed: 1, facts_extracted: rows.length,
    facts_verified: facts.filter((fact) => fact.verificationStatus === "VERIFIED").length,
    facts_needing_review: facts.filter((fact) => fact.verificationStatus === "NEEDS_REVIEW").length,
    facts_rejected: facts.filter((fact) => fact.verificationStatus === "REJECTED").length,
    parser_errors: rows.length - facts.length,
    normalization_unresolved: facts.filter((fact) => fact.normalizationStatus === "UNRESOLVED").length
  };
  const verificationRequests: SelectiveVerificationRequest[] = facts
    .filter((fact) => fact.verificationStatus === "NEEDS_REVIEW")
    .map((fact) => ({
      sourceDocumentId: fact.sourceDocumentId, factFingerprint: fact.factFingerprint,
      reason: fact.verificationIssues.join(","),
      fields: [
        ...(fact.verificationIssues.some((issue) => issue.includes("confidence")) ? ["value" as const, "unit" as const, "reference" as const] : []),
        ...(fact.verificationIssues.includes("ambiguous_row_association") ? ["row_association" as const] : []),
        ...(fact.verificationIssues.includes("incomplete_provenance") ? ["provenance" as const] : [])
      ]
    }));
  return { facts, counters, verificationRequests };
}

export function buildCanonicalFactsFromGoogleResponse(response: unknown, context: Parameters<typeof canonicalizeLabRow>[1]) {
  return buildCanonicalFacts(parseGoogleDocumentAILabRows(response), context);
}
