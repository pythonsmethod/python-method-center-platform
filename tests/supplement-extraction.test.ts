import { describe, expect, it } from "vitest";
import { parseSupplementExtraction, readExtractedSupplement } from "@/lib/supplements/extraction";

describe("supplement file extraction", () => {
  it("keeps only validated source rows and normalizes times", () => {
    expect(parseSupplementExtraction('```json\n{"rows":[{"name":" Magnesium ","dose":"400 mg","times":["20:00","bad"],"timing_note":"With food"}]}\n```')).toEqual([
      { name: "Magnesium", dose: "400 mg", times: ["20:00"], notes: null, timing_note: "With food" }
    ]);
  });

  it("gives a reviewable default time when the source has none", () => {
    expect(readExtractedSupplement({ name: "Vitamin D", times: [] })?.times).toEqual(["08:00"]);
  });

  it("rejects malformed model output", () => {
    expect(parseSupplementExtraction("not json")).toBeNull();
  });
});
