import { createHash } from "node:crypto";
import { GoogleDocumentAIProvider } from "./google-document-ai";

// Fixed, authored non-medical fixture. No uploaded or caller-supplied bytes.
export const SYNTHETIC_LINES = [
  "ANHAM SYNTHETIC OCR TEST",
  "NO PERSONAL OR MEDICAL DATA",
  "ITEM VALUE UNIT RANGE",
  "ALPHA 12.34 mg/L 10.00-20.00",
  "BETA 0.05 g/L 0.01-0.09",
  "GAMMA 1234 count 1000-2000",
] as const;

export function syntheticPdf(): Buffer {
  const stream = SYNTHETIC_LINES.map((line, i) =>
    `BT /F1 16 Tf 50 ${750 - i * 45} Td (${line}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

export async function runSyntheticGoogleSmoke(accessToken: () => Promise<string>, fetchImpl: typeof fetch = fetch) {
  const bytes = syntheticPdf();
  // Existing Google processor, deliberately pinned for this bounded staging test.
  const provider = new GoogleDocumentAIProvider({
    projectId: "pythons-ankh-analysis", location: "us", processorId: "2ca773b0daa15488",
    accessToken, fetchImpl,
  });
  const raw = await provider.process_document({ bytes, mimeType: "application/pdf" });
  const result = provider.normalize_response(raw);
  const lines = result.pages.flatMap(p => p.lines).map(l => l.text.trim().replace(/\s+/g, " "));
  const checks = SYNTHETIC_LINES.map(expected => ({ expected, matched: lines.includes(expected) }));
  const tokens = result.pages.flatMap(p => p.tokens);
  const anchoredTokens = tokens.filter(t => t.textAnchor && t.boundingPoly).length;
  return {
    ok: checks.every(c => c.matched) && result.pages.length === 1 && anchoredTokens > 0,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    checks, pages: result.pages.length, tokenCount: tokens.length, anchoredTokens,
    syntheticDocumentSent: true, phiSent: false, clinicalValidation: false,
  };
}
