import { describe, expect, it } from "vitest";
import { isOncologyAnalyte, resolveAnalyteLabel } from "@/lib/analysis/analyte-labels";
import { buildLabValue, needsHumanReview } from "@/lib/analysis/lab-value";
import { runAnalysis } from "@/lib/analysis/pipeline";
import { canonicalizeLabRow, parseNumericValue } from "@/lib/canonical-facts";
import { canonicaliseUnitSpelling } from "@/lib/analysis/unit-resolver";
import { oncologyReviewGuidance } from "@/lib/assistant/oncology-review-guidance";

const familyNames = [
  ["afp", "АФП", "alpha-fetoprotein"],
  ["cea", "РЭА", "carcinoembryonic antigen"],
  ["psa_unspecified", "ПСА", "PSA"],
  ["ca125", "СА 125", "CA125"],
  ["ca19_9", "СА 19-9", "CA 19.9"],
  ["ca15_3", "СА 15-3", "CA 15.3"],
  ["ca27_29", "СА 27-29", "CA 27.29"],
  ["hcg_beta", "β-ХГЧ", "beta-hCG"],
  ["calcitonin", "Кальцитонин", "calcitonin"],
  ["thyroglobulin", "Тиреоглобулин", "thyroglobulin"],
  ["cga", "Хромогранин А", "chromogranin A"],
  ["nse", "НСЕ", "neuron-specific enolase"],
  ["cyfra21_1", "CYFRA21-1", "CYFRA 21.1"],
  ["scc_ag", "Антиген плоскоклеточной карциномы", "SCC antigen"],
  ["he4", "HE4", "human epididymis protein 4"],
  ["ldh", "ЛДГ", "lactate dehydrogenase"],
  ["b2m", "β2-микроглобулин", "beta-2 microglobulin"],
  ["ca72_4", "СА 72-4", "CA 72.4"]
] as const;

function code(name: string): string | null {
  const result = resolveAnalyteLabel(name);
  return result.status === "resolved" ? result.analyte : null;
}

describe("source-linked oncology marker candidates", () => {
  it.each(familyNames)("recognizes %s from literal Russian and English captions", (expected, ru, en) => {
    expect(code(ru)).toBe(expected);
    expect(code(en)).toBe(expected);
    expect(isOncologyAnalyte(expected)).toBe(true);
  });

  it("keeps test forms and competing analytes separate", () => {
    expect(code("Total PSA")).toBe("psa_total");
    expect(code("Free PSA")).toBe("psa_free");
    expect(code("Percent free PSA")).toBe("psa_free_percent");
    expect(code("Total hCG")).toBe("hcg_total");
    expect(code("Free beta-hCG")).toBe("hcg_free_beta");
    expect(code("CA 15-3")).not.toBe(code("CA 27-29"));
    for (const ambiguous of ["Ca", "TG", "CT", "SCC", "anti-Tg", "procalcitonin", "LDH-1", "Free PSA %", "% free PSA", "Онкомаркер CA 125"]) {
      expect(code(ambiguous), ambiguous).toBeNull();
    }
  });

  it("does not merge international and enzyme units or infer a missing marker unit", () => {
    expect(canonicaliseUnitSpelling("Ед/мл")).toBe("U/mL");
    expect(canonicaliseUnitSpelling("МЕ/мл")).toBe("IU/mL");
    expect(canonicaliseUnitSpelling("мМЕ/мл")).toBe("mIU/mL");
    expect(canonicaliseUnitSpelling("МЕ/л")).toBe("IU/L");
    const explicit = buildLabValue({ labelPrinted: "СА 125", value: 42, unitPrinted: "Ед/мл", referencePrinted: "<35 Ед/мл" });
    expect(explicit).toMatchObject({ analyte: "ca125", label_original: "СА 125", value_original: 42, unit_original: "Ед/мл", unit_resolved: "U/mL", unit_resolution_method: "explicit", position_in_reference: null });
    expect(needsHumanReview(explicit)).toBe(true);
    const missing = buildLabValue({ labelPrinted: "HE4", value: 82, referencePrinted: "<100 pmol/L", referenceConfirmed: true });
    expect(missing).toMatchObject({ analyte: "he4", unit_resolved: null, value_canonical: null, unit_resolution_method: "unresolved" });
  });

  it("preserves an unambiguous Test and Result pair but does not calculate an oncology trend", () => {
    const anchor = (page: number, excerpt: string) => ({ level: "PAGE" as const, page, sourceHash: "synthetic-source-hash", excerpt, region: null });
    const rows = [1, 2].flatMap(page => [
      { section: "Marker result", label: "Test", value: "CA 125", reference: "-", referenceConfirmed: true, collectionDate: `2026-09-0${page}`, comparisonContext: { specimen: "Serum", method: "Method A" }, source: anchor(page, "Test | CA 125") },
      { section: "Marker result", label: "Result", value: `${40 + page} U/mL`, reference: "<35 U/mL", referenceConfirmed: true, collectionDate: `2026-09-0${page}`, comparisonContext: { specimen: "Serum", method: "Method A" }, source: anchor(page, `Result | ${40 + page} U/mL`) }
    ]);
    const run = runAnalysis({ documents: [{ documentId: "synthetic-doc", collectionDate: null, agreed: rows }], prior: [], questionnaire: null, extractionModelVersion: "synthetic-reader" });
    expect(run.labValues.map(value => [value.analyte, value.value_original, value.source_anchor?.related?.excerpt])).toEqual([
      ["ca125", 41, "Test | CA 125"], ["ca125", 42, "Test | CA 125"]
    ]);
    expect(run.humanReview).toHaveLength(2);
    expect(run.unitUnresolved).toBe(false);
    expect(run.trends.ca125).toBeUndefined();
  });

  it("keeps a marker out of automatic canonical verification even with a clear OCR row", () => {
    const source = { sourcePage: 1, sourceCoordinates: { normalizedVertices: [{ x: 0.1, y: 0.2 }] }, extractionConfidence: 0.99 };
    const context = { caseId: "synthetic-case", sourceDocumentId: "synthetic-doc", extractionProvider: "synthetic", extractionVersion: "1" };
    const marker = canonicalizeLabRow({ ...source, originalTestName: "CA 125", valueOriginal: "42", unitOriginal: "Ед/мл", referenceOriginal: "<35" }, context);
    expect(marker).toMatchObject({ normalizedTestName: "ca125", valueOriginal: "42", unitNormalized: "U/mL", verificationStatus: "NEEDS_REVIEW", comparabilityStatus: "NOT_COMPARABLE", standardCode: null });
    expect(marker.verificationIssues).toContain("oncology_review_required");
    const censored = canonicalizeLabRow({ ...source, originalTestName: "HE4", valueOriginal: "<5", unitOriginal: "pmol/L" }, context);
    expect(censored).toMatchObject({ valueOriginal: "<5", valueComparator: "<", verificationStatus: "NEEDS_REVIEW" });
    expect(parseNumericValue("1,234").numeric).toBeNull();
    expect(parseNumericValue("1.234").numeric).toBeNull();
  });

  it("only supplies staff draft questions for marker keys seen in this Case", () => {
    for (const [family] of familyNames) {
      expect(oncologyReviewGuidance([family], "en"), family).not.toBe("");
    }
    expect(oncologyReviewGuidance(["crp", null], "ru")).toBe("");
    const ru = oncologyReviewGuidance(["ca125", "psa_total", "psa_free", "ca125"], "ru");
    expect(ru).toContain("ВНУТРЕННИЕ ВОПРОСЫ");
    expect(ru).toContain("CA 125");
    expect(ru.match(/CA 125/g)).toHaveLength(1);
    expect(ru).toContain("PSA");
    expect(ru).not.toContain("NSE:");
    const en = oncologyReviewGuidance(["cga"], "en");
    expect(en).toContain("INTERNAL TUMOR MARKER REVIEW QUESTIONS");
    expect(en).toContain("do not advise changing medicines");
  });
});
