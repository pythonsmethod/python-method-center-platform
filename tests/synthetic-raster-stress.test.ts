import { describe, expect, it } from "vitest";
import { scoreRaster, STRESS_GOLD } from "@/lib/document-extraction/synthetic-raster-stress";
import { GoogleDocumentAIProvider } from "@/lib/document-extraction/google-document-ai";

function fixture(swapped = false, angle = 0) {
  let text = "";
  const width = angle ? 1650 : 1600, height = angle ? 1082 : 1000;
  const tokens = STRESS_GOLD.flatMap((row, r) => row.map((word, c) => {
    const content = swapped && c === 1 ? STRESS_GOLD[(r + 1) % 6][c] : word;
    const startIndex = text.length; text += content + " ";
    const x = [80, 480, 820, 1160][c] - 800, y = 280 + r * 90 - 500;
    const a = angle * Math.PI / 180;
    return { layout: { textAnchor: { textSegments: [{ startIndex, endIndex: text.length }] },
      boundingPoly: { normalizedVertices: [{ x: (Math.cos(a) * x - Math.sin(a) * y + width / 2) / width,
        y: (Math.sin(a) * x + Math.cos(a) * y + height / 2) / height }] } } };
  }));
  const provider = new GoogleDocumentAIProvider({ projectId: "test", location: "us", processorId: "test", accessToken: async () => "unused" });
  return { result: provider.normalize_response({ document: { text, pages: [{ tokens }] } }), geometry: { width, height, angle } };
}

describe("raster source-cell evaluation", () => {
  it.each([0, 3])("compares against fixed source cells at %s degrees", angle => {
    const f = fixture(false, angle);
    expect(scoreRaster(f.result, f.geometry)).toMatchObject({ exactFields: 24, exactRows: 6 });
  });
  it("rejects right numbers in wrong rows", () => {
    const f = fixture(true);
    expect(scoreRaster(f.result, f.geometry)).toMatchObject({ exactFields: 18, exactRows: 0 });
  });
  it("does not guess cells for tokens without coordinates", () => {
    const f = fixture();
    f.result.pages[0].tokens.forEach(t => { delete t.boundingPoly; });
    expect(scoreRaster(f.result, f.geometry)).toMatchObject({ exactFields: 0, exactRows: 0, unlocatedTokens: 24 });
  });
});
