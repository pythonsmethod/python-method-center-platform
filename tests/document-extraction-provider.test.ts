import { describe, expect, it, vi } from "vitest";
import { GoogleDocumentAIProvider } from "@/lib/document-extraction/google-document-ai";

function provider(fetchImpl: typeof fetch) {
  return new GoogleDocumentAIProvider({
    projectId: "pythons-ankh-analysis",
    location: "us",
    processorId: "2ca773b0daa15488",
    accessToken: async () => "short-lived-token",
    fetchImpl
  });
}

describe("GoogleDocumentAIProvider", () => {
  it("sends online OCR to the regional endpoint with quality scoring enabled", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ document: { text: "ok" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })) as unknown as typeof fetch;
    await provider(fetchImpl).process_document({
      bytes: new Uint8Array([37, 80, 68, 70]),
      mimeType: "application/pdf"
    });

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(String(url)).toBe("https://us-documentai.googleapis.com/v1/projects/pythons-ankh-analysis/locations/us/processors/2ca773b0daa15488:process");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer short-lived-token");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      rawDocument: { content: "JVBERg==", mimeType: "application/pdf" },
      processOptions: { ocrConfig: { enableImageQualityScores: true } }
    });
  });

  it("normalizes text, provenance coordinates, confidence, language, and quality", () => {
    const normalized = provider(fetch).normalize_response({
      document: {
        text: "Hemoglobin 9.6",
        pages: [{
          pageNumber: 1,
          detectedLanguages: [{ languageCode: "en", confidence: 0.99 }],
          imageQualityScores: {
            qualityScore: 0.98,
            detectedDefects: [{ type: "quality/defect_blurry", confidence: 0.02 }]
          },
          lines: [{
            layout: {
              textAnchor: { textSegments: [{ startIndex: "0", endIndex: "15" }] },
              confidence: 0.97,
              boundingPoly: { normalizedVertices: [{ x: 0.1, y: 0.2 }] }
            }
          }],
          tokens: [{ layout: { textAnchor: { textSegments: [{ startIndex: "0", endIndex: "10" }] }, confidence: .99, boundingPoly: { normalizedVertices: [{ x: .1, y: .2 }] } } }]
        }]
      }
    });

    expect(normalized.text).toBe("Hemoglobin 9.6");
    expect(normalized.pages[0]).toMatchObject({
      pageNumber: 1,
      detectedLanguages: [{ languageCode: "en", confidence: 0.99 }],
      qualityScore: 0.98,
      lines: [{ text: "Hemoglobin 9.6", confidence: 0.97 }]
    });
    expect(normalized.pages[0].tokens[0]).toMatchObject({ id: "p1-token-0", text: "Hemoglobin", textAnchor: { start: 0, end: 10 } });
  });
});
