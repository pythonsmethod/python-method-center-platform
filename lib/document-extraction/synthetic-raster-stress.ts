import { createHash } from "node:crypto";
import fixtures from "./synthetic-raster-fixtures.json";
import { GoogleDocumentAIProvider } from "./google-document-ai";
import type { NormalizedDocumentExtraction } from "./types";
import { SYNTHETIC_PROCESSOR, SYNTHETIC_PROCESSOR_MANIFEST } from "./synthetic-processor-manifest";
import { buildCanonicalFactsFromGoogleResponse } from "@/lib/canonical-facts/pipeline";
import { runConnectedAnkhHarness } from "@/lib/ankh-harness/connected-pipeline";
import { buildReviewOnlyLabFacts } from "@/lib/canonical-facts/spatial-lab-adapter";

export const STRESS_GOLD = [
  ["ALPHA", "12,34", "mg/L", "10,00-20,00"],
  ["BETA", "<0.05", "g/L", "0.01-0.09"],
  ["GAMMA", ">1234", "count", "1000-2000"],
  ["DELTA", "-0,07", "mmol/L", "-0,10-0,00"],
  ["EPSILON", "0.001", "mg/L", "0.000-0.009"],
  ["ZETA", "100.0", "%", "95.0-100.0"],
];

// Source rectangles are authored with the SVG before OCR; never derived from candidates.
export function scoreRaster(result: NormalizedDocumentExtraction, fixture: { width: number; height: number; angle: number }) {
  const cells: { x: number; text: string }[][] = Array.from({ length: 24 }, () => []);
  let unlocatedTokens = 0;
  const angle = fixture.angle * Math.PI / 180;
  for (const token of result.pages.flatMap(p => p.tokens)) {
    const vertices = (token.boundingPoly as { normalizedVertices?: { x?: number; y?: number }[] } | undefined)?.normalizedVertices;
    if (!vertices?.length || !token.textAnchor) { unlocatedTokens++; continue; }
    const cx = vertices.reduce((s, v) => s + (v.x ?? 0), 0) / vertices.length * fixture.width - fixture.width / 2;
    const cy = vertices.reduce((s, v) => s + (v.y ?? 0), 0) / vertices.length * fixture.height - fixture.height / 2;
    const x = Math.cos(angle) * cx + Math.sin(angle) * cy + 800;
    const y = -Math.sin(angle) * cx + Math.cos(angle) * cy + 500;
    const row = Math.floor((y - 240) / 90);
    const col = [40, 430, 770, 1110].findIndex((left, i) => x >= left && x < [430, 770, 1110, 1550][i]);
    if (row >= 0 && row < 6 && col >= 0) cells[row * 4 + col].push({ x, text: token.text });
  }
  const checks = STRESS_GOLD.flatMap((row, r) => row.map((expected, c) => {
    const observed = cells[r * 4 + c].sort((a, b) => a.x - b.x).map(t => t.text).join("").replace(/\s/g, "");
    return { row: r + 1, column: c + 1, expected, observed, matched: observed === expected };
  }));
  return { exactFields: checks.filter(c => c.matched).length, totalFields: 24,
    exactRows: STRESS_GOLD.filter((_, r) => checks.slice(r * 4, r * 4 + 4).every(c => c.matched)).length,
    totalRows: 6, unlocatedTokens, checks };
}

export async function runRasterStress(accessToken: () => Promise<string>) {
  const provider = new GoogleDocumentAIProvider({ ...SYNTHETIC_PROCESSOR, accessToken });
  const receipts = [];
  for (const fixture of fixtures) {
    const bytes = Buffer.from(fixture.base64, "base64");
    const started = Date.now();
    const raw = await provider.process_document({ bytes, mimeType: "image/png" });
    const result = provider.normalize_response(raw);
    // Deliberately do not feed authored Gold cells into the real parser.
    // This tests the OCR-to-canonical boundary separately from OCR scoring.
    const canonical = buildCanonicalFactsFromGoogleResponse(raw, {
      caseId: "synthetic-diagnostic", sourceDocumentId: fixture.name,
      extractionProvider: "google_document_ai", extractionVersion: SYNTHETIC_PROCESSOR.processorVersionId,
    });
    const connected = runConnectedAnkhHarness({
      environment: "IN_MEMORY_TEST", externalCallsAllowed: false, persistenceAllowed: false,
      caseAlias: "synthetic-diagnostic", expectedContext: ["independent_source_review"],
      documents: [{ caseAlias: "synthetic-diagnostic", sourceDocumentId: fixture.name,
        currentVersion: "frozen-v1", candidateVersion: "frozen-v1",
        caseIdentityHash: null, documentIdentityHash: null,
        providerVersion: SYNTHETIC_PROCESSOR.processorVersionId, parserVersion: "clinical-closure-v1",
        normalized: result }],
    });
    const spatial = buildReviewOnlyLabFacts(result, { caseId: "synthetic-diagnostic", sourceDocumentId: fixture.name,
      extractionProvider: "google_document_ai", extractionVersion: SYNTHETIC_PROCESSOR.processorVersionId });
    const rowMatches = STRESS_GOLD.map(expected => {
      const matches = spatial.facts.filter(f => f.originalTestName === expected[0]);
      const fact = matches.length === 1 ? matches[0] : null;
      return { label: expected[0], matched: Boolean(fact && [fact.originalTestName, fact.valueOriginal, fact.unitOriginal, fact.referenceOriginal]
        .every((value, i) => value?.replace(/\s/g, "") === expected[i])) };
    });
    const chain = {
      spatial, rowMatches, exactStructuredRows: rowMatches.filter(r => r.matched).length,
      nativeTables: result.pages.reduce((sum, page) => sum + page.tables.length, 0),
      nativeCanonicalCandidates: canonical.facts.length,
      canonicalCandidates: spatial.facts.length,
      expectedRows: STRESS_GOLD.length,
      legacyVerifiedCandidatesBlocked: canonical.counters.facts_verified,
      effectiveVerified: 0,
      status: spatial.facts.length === 0 ? "BLOCKED_NO_CANONICAL_ROWS" : "SOURCE_AUDIT_REQUIRED",
      persistence: "NOT_RUN", wholeCaseReview: "NOT_RUN", independentAudit: "NOT_RUN",
      connectedInMemory: { counters: connected.counters, documentTypes: connected.documents.map(d => d.documentType),
        externalCallsPerformed: connected.externalCallsPerformed, persistenceWritesPerformed: connected.persistenceWritesPerformed },
    };
    receipts.push({ name: fixture.name, sha256: createHash("sha256").update(bytes).digest("hex"),
      elapsedMs: Date.now() - started, pages: result.pages.length,
      quality: result.pages.map(p => p.qualityScore ?? null), chain, ...scoreRaster(result, fixture) });
  }
  return { fixtureSet: "anham-raster-stress-v1", processorVersion: SYNTHETIC_PROCESSOR.processorVersionId,
    manifest: SYNTHETIC_PROCESSOR_MANIFEST, versionPinned: true, receipts, phiSent: false, clinicalValidation: false, cost: null };
}
