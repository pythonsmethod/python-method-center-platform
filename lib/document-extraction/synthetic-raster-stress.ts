import { createHash } from "node:crypto";
import fixtures from "./synthetic-raster-fixtures.json";
import { GoogleDocumentAIProvider } from "./google-document-ai";
import type { NormalizedDocumentExtraction } from "./types";

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
  const provider = new GoogleDocumentAIProvider({ projectId: "pythons-ankh-analysis", location: "us", processorId: "2ca773b0daa15488", accessToken });
  const status = await provider.get_processor_status();
  const receipts = [];
  for (const fixture of fixtures) {
    const bytes = Buffer.from(fixture.base64, "base64");
    const started = Date.now();
    const raw = await provider.process_document({ bytes, mimeType: "image/png" });
    const result = provider.normalize_response(raw);
    receipts.push({ name: fixture.name, sha256: createHash("sha256").update(bytes).digest("hex"),
      elapsedMs: Date.now() - started, pages: result.pages.length,
      quality: result.pages.map(p => p.qualityScore ?? null), ...scoreRaster(result, fixture) });
  }
  return { fixtureSet: "anham-raster-stress-v1", processorVersion: status.defaultProcessorVersion ?? null,
    versionPinned: false, receipts, phiSent: false, clinicalValidation: false, cost: null };
}
