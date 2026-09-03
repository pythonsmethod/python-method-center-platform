import { describe, expect, it } from "vitest";
import { extractBoundedSourceEvidence, extractClinicalClosureDocumentEvidence } from "@/lib/clinical-evidence";

const context = { caseId: "synthetic", sourceDocumentId: "doc", providerVersion: "synthetic", parserVersion: "closure-v1" };
const coordinates = { normalizedVertices: [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .8 }, { x: .1, y: .8 }] };
const run = (text: string, dateOrder?: "MDY" | "DMY") => extractBoundedSourceEvidence([{ text, page: 1, coordinates, confidence: .99 }], context, { dateOrder });

describe("bounded clinical source mechanisms", () => {
  it("keeps dimensions, units, anatomy and laterality in the source span", () => {
    const text = "FINDINGS:\nLeft breast mass measures 12 mm x 8 mm x 6 mm.\nIMPRESSION:\nSource statement.";
    const fact = run(text).find((f) => f.structuredPayload?.kind === "MEASUREMENT")!;
    expect(fact.structuredPayload).toMatchObject({ dimensions: [12, 8, 6], unit: "mm" });
    expect(fact).toMatchObject({ laterality: "LEFT", anatomicalSite: "breast", numericValue: null, verificationStatus: "NEEDS_REVIEW" });
    expect(text.slice(fact.sourceSpan!.start, fact.sourceSpan!.end)).toBe(fact.originalText);
  });
  it("does not silently normalize mixed dimensions or mixed laterality", () => {
    const facts = run("FINDINGS:\nLeft and right breast masses measure 1 cm x 8 mm.");
    const measurement = facts.find((f) => f.evidenceType === "MEASUREMENT")!;
    expect(measurement.structuredPayload?.kind).toBe("SOURCE_NARRATIVE");
    expect(measurement.laterality).toBeNull();
    expect(measurement.verificationIssues).toContain("MIXED_MEASUREMENT_UNITS");
  });
  it("retains decimal measurements and unique IDs for multiple dimensions", () => {
    const facts = run("FINDINGS:\nRight breast mass measures 1.5 x 0.8 cm and a second mass measures 0.6 cm.").filter((f) => f.evidenceType === "MEASUREMENT");
    expect(facts).toHaveLength(2);
    expect(new Set(facts.map((f) => f.evidenceId)).size).toBe(2);
    expect(facts[0].structuredPayload).toMatchObject({ dimensions: [1.5, .8] });
  });
  it("bounds wrapped prose at the next section and does not capture identifying fields", () => {
    const facts = run("FINDINGS:\nLeft breast mass with\nheterogeneous enhancement.\nIMPRESSION:\nSource-reported suspicious finding.\nName: EXCLUDED\nUnrelated text");
    expect(facts.some((f) => f.originalText.includes("with\nheterogeneous"))).toBe(true);
    expect(facts.some((f) => f.originalText.includes("EXCLUDED"))).toBe(false);
    expect(facts.some((f) => f.originalText.includes("Unrelated"))).toBe(false);
  });
  it("keeps source-reported pathology statements without generating a diagnosis", () => {
    const facts = run("FINAL DIAGNOSIS:\nSource-reported carcinoma.\nLymph-vascular invasion: Not identified.\nMicrocalcifications: Absent.");
    expect(facts.some((f) => f.evidenceType === "LYMPHOVASCULAR_INVASION")).toBe(true);
    expect(facts.some((f) => f.evidenceType === "MICROCALCIFICATIONS")).toBe(true);
    expect(facts.every((f) => f.normalizedText === null && f.verificationStatus === "NEEDS_REVIEW")).toBe(true);
  });
  it("recognizes BI-RADS subject rows only within the category section", () => {
    const facts = run("ASSESSMENT/BI-RADS CATEGORY:\nLeft: 4 - source category\nRight: 1 - source category\nRECOMMENDATION:\nBiopsy.\nLeft: 3 samples");
    const categories = facts.filter((f) => f.evidenceType === "BI_RADS");
    expect(categories.map((f) => f.numericValue)).toEqual([4, 1]);
    expect(categories[0].structuredPayload).toMatchObject({ subject: "LEFT" });
  });
  it("associates dates by their labels, not by nearest proximity", () => {
    const facts = run("Exam Date/Time:\n04/17/2024 9:30 AM\nPrinted: 04/20/2024\nCollected: 04/18/2024", "MDY").filter((f) => f.evidenceType === "EVENT_DATE");
    expect(facts.map((f) => [f.dateKind, f.eventDate])).toEqual([["EXAM", "2024-04-17"], ["PRINTED", "2024-04-20"], ["COLLECTED", "2024-04-18"]]);
  });
  it("does not infer date order, roll invalid dates, or borrow a different field", () => {
    expect(run("Exam date: 03/04/2024")[0].eventDate).toBeNull();
    expect(run("Exam date: 02/30/2024", "MDY")[0].eventDate).toBeNull();
    expect(run("Exam date:\nPrinted: 03/04/2024", "MDY").filter((f) => f.evidenceType === "EVENT_DATE").map((f) => f.dateKind)).toEqual(["PRINTED"]);
  });
  it("retains conflicting dates for review without choosing one", () => {
    const facts = run("Exam date: 03/04/2024 or 03/05/2024", "MDY");
    expect(facts).toHaveLength(2);
    expect(facts.every((f) => f.eventDate === null && f.verificationIssues?.includes("AMBIGUOUS_OR_INVALID_DATE"))).toBe(true);
  });
  it("closure does not inherit auto-verified status from the legacy text extractor", () => {
    const result = extractClinicalClosureDocumentEvidence({ blocks: [{ text: "BI-RADS: 4", page: 1, coordinates, confidence: .99 }], tokens: [], layout: { structuredTablesSufficient: false } }, context);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.facts.every((f) => f.verificationStatus === "NEEDS_REVIEW")).toBe(true);
  });
});
