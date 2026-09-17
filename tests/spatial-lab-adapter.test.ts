import { describe, expect, it } from "vitest";
import { buildReviewOnlyLabFacts } from "@/lib/canonical-facts/spatial-lab-adapter";
import type { NormalizedDocumentExtraction } from "@/lib/document-extraction/types";

const context = { caseId: "synthetic", sourceDocumentId: "lab", extractionProvider: "fixture", extractionVersion: "v1" };
function source(rows: (string | null)[][], headers = ["Test", "Result", "Unit", "Reference"]) {
  let text = "";
  const tokens = [headers, ...rows].flatMap((row, r) => row.flatMap((word, c) => {
    if (word === null) return [];
    const start = text.length; text += word + "\n";
    const x = .06 + c * .23, y = .2 + r * .06;
    return [{ id: `t-${r}-${c}`, text: word, textAnchor: { start, end: start + word.length }, confidence: .99,
      boundingPoly: { normalizedVertices: [{ x, y }, { x: x + .12, y }, { x: x + .12, y: y + .025 }, { x, y: y + .025 }] } }];
  }));
  return { text, raw: {}, pages: [{ pageNumber: 1, tokens, blocks: [], lines: [], paragraphs: [], tables: [], detectedLanguages: [], qualityDefects: [] }] } satisfies NormalizedDocumentExtraction;
}
const rows = [["Ferritin", "12,7", "ng/mL", "10-120"], ["CRP", "<0.8", "mg/L", "0-5"], ["Glucose", "5.1", "mmol/L", "3.9-5.5"]];
describe("laboratory spatial bridge", () => {
  it.each([["Test", "Result", "Unit", "Reference"], ["Показатель", "Результат", "Единицы", "Норма"]])("maps semantic headers %j without auto-verifying", (...headers) => {
    const result = buildReviewOnlyLabFacts(source(rows, headers), context);
    expect(result.facts).toHaveLength(3);
    expect(result.facts.map(f => f.valueOriginal)).toEqual(["12,7", "<0.8", "5.1"]);
    expect(result.facts.every(f => f.verificationStatus === "NEEDS_REVIEW")).toBe(true);
    expect(result.sourceCells[0].cells.value).toMatchObject({ text: "12,7", tokenIds: ["t-1-1"], anchorsValidated: true });
  });
  it("does not borrow a missing unit", () => {
    const result = buildReviewOnlyLabFacts(source([rows[0], ["CRP", "<0.8", null, "0-5"], rows[2]]), context);
    expect(result.facts[1].unitOriginal).toBeNull();
    expect(result.facts[1].verificationIssues).toContain("MISSING_CELL");
  });
  it("retains missing results as unresolved rather than filling them", () => {
    const result = buildReviewOnlyLabFacts(source([rows[0], ["CRP", null, "mg/L", "0-5"], rows[2]]), context);
    expect(result.facts).toHaveLength(2); expect(result.unresolvedRows).toBe(1);
  });
  it("blocks missing geometry", () => {
    const doc = source(rows); doc.pages[0].tokens[2].boundingPoly.normalizedVertices = [];
    expect(buildReviewOnlyLabFacts(doc, context).facts).toHaveLength(0);
  });
  it("does not claim exact anchors for a changed span", () => {
    const doc = source(rows); doc.pages[0].tokens[5].textAnchor.start++;
    const result = buildReviewOnlyLabFacts(doc, context);
    expect(result.facts[0].verificationIssues).toContain("TOKEN_ANCHOR_MISMATCH");
  });
  it("does not merge two numbers into one", () => {
    const result = buildReviewOnlyLabFacts(source([rows[0], ["CRP", "1 2", "mg/L", "0-5"], rows[2]]), context);
    expect(result.facts).toHaveLength(2); expect(result.unresolvedRows).toBe(1);
  });
  it("does not classify headerless prose as a table", () => {
    expect(buildReviewOnlyLabFacts(source(rows, ["words", "other", "text", "notes"]), context).facts).toHaveLength(0);
  });
  it("uses coordinates rather than provider array order", () => {
    const doc = source(rows); doc.pages[0].tokens.reverse();
    expect(buildReviewOnlyLabFacts(doc, context).facts.map(f => f.originalTestName)).toEqual(["Ferritin", "CRP", "Glucose"]);
  });
  it("does not mutate original OCR", () => {
    const doc = source(rows); const before = JSON.stringify(doc); buildReviewOnlyLabFacts(doc, context);
    expect(JSON.stringify(doc)).toBe(before);
  });
  it("does not borrow a value-only continuation from the next line", () => {
    const result = buildReviewOnlyLabFacts(source([rows[0], [null, "9", null, null], rows[1], rows[2]]), context);
    expect(result.facts[0].valueOriginal).toBe("12,7"); expect(result.unresolvedRows).toBe(1);
  });
  it("does not carry headers across pages", () => {
    const doc = source(rows);
    doc.pages[0].pageNumber = 2;
    doc.pages[0].tokens = doc.pages[0].tokens.slice(4);
    expect(buildReviewOnlyLabFacts(doc, context).facts).toHaveLength(0);
  });
  it("rejects duplicate token identity", () => {
    const doc = source(rows); doc.pages[0].tokens[5].id = doc.pages[0].tokens[4].id;
    expect(buildReviewOnlyLabFacts(doc, context).facts).toHaveLength(0);
  });
});
