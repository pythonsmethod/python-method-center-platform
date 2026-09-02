import { describe, expect, it } from "vitest";
import { PIPELINE_STAGES, runAnalysis, splitValue, type AnalysisInput } from "@/lib/analysis/pipeline";
import { hasAllVersions } from "@/lib/analysis/versions";

const questionnaire = { birth_date: "1980-04-12", sex: "female" as const };

function run(extra: Partial<AnalysisInput> = {}) {
  return runAnalysis({
    documents: [],
    prior: [],
    questionnaire,
    extractionModelVersion: "claude-opus-4-8",
    ...extra
  });
}

describe("порядок стадий", () => {
  it("совпадает с разделом 6.1 спецификации, без стадии тревоги", () => {
    expect([...PIPELINE_STAGES]).toEqual([
      "upload",
      "quality_gate",
      "metadata_pre_extraction",
      "identity_resolver",
      "document_classification",
      "duplicate_version_detection",
      "full_extraction",
      "unit_resolution",
      "confidence_routing",
      "canonicalization",
      "timeline",
      "context_assembly",
      "interpretation_blocker_check",
      "analysis_rcv",
      "validation",
      "routing_karen_screen",
      "decision",
      "client_response",
      "learning_record"
    ]);
    expect((PIPELINE_STAGES as readonly string[]).includes("safety_screen")).toBe(false);
  });

  it("единица определяется раньше блокираторов, блокираторы — раньше анализа", () => {
    const at = (stage: string) => (PIPELINE_STAGES as readonly string[]).indexOf(stage);

    expect(at("unit_resolution")).toBeLessThan(at("interpretation_blocker_check"));
    expect(at("interpretation_blocker_check")).toBeLessThan(at("analysis_rcv"));
    expect(at("identity_resolver")).toBeLessThan(at("full_extraction"));
  });
});

describe("пять полей версий", () => {
  it("присутствуют у любой интерпретации и не пусты", () => {
    const result = run();

    expect(hasAllVersions(result.versions)).toBe(true);
    expect(result.versions.extraction_model_version).toBe("claude-opus-4-8");
    expect(result.versions.rule_set_version).toContain("blockers=");
    expect(result.versions.rule_set_version).toContain("labels=");
    expect(result.versions.threshold_set_version).toContain("units=");
    expect(result.versions.threshold_set_version).toContain("variation=");
    expect(result.versions.prompt_version).toMatch(/read=[0-9a-f]{12};header=[0-9a-f]{12};review=[0-9a-f]{12}/);
  });

  it("запись без хотя бы одного поля не считается проштампованной", () => {
    const { versions } = run();

    expect(hasAllVersions({ ...versions, prompt_version: "" })).toBe(false);
    expect(hasAllVersions({ ...versions, threshold_set_version: undefined })).toBe(false);
  });
});

describe("значение из строки бланка", () => {
  it("отделяет число от единицы, понимая запятую", () => {
    expect(splitValue("9,6 г/л")).toEqual({ value: 9.6, unit: "г/л" });
    expect(splitValue("96")).toEqual({ value: 96, unit: "" });
  });

  it("текст и границы не считаются измерениями", () => {
    expect(splitValue("без патологии")).toBeNull();
    expect(splitValue("< 5")).toBeNull();
    expect(splitValue("")).toBeNull();
  });
});

describe("прогон целиком", () => {
  const today = {
    documentId: "doc-new",
    collectionDate: "2026-08-14",
    agreed: [
      { label: "Гемоглобин", value: "9,6", reference: "12–15.5", referenceConfirmed: true },
      { label: "MCV", value: "88 фл", reference: "80-100", referenceConfirmed: true },
      { label: "Ферритин", value: "43 нг/мл", reference: "30-400", referenceConfirmed: true },
      { label: "Глюкоза", value: "5,1 ммоль/л", reference: "3.9-6.1", referenceConfirmed: true },
      { label: "Заключение", value: "Без патологии", reference: "", referenceConfirmed: true },
      { label: "Онкомаркер CA 125", value: "12 Ед/мл", reference: "0-35", referenceConfirmed: true }
    ]
  };
  const priorHemoglobin = {
    documentId: "doc-old",
    analyte: "hemoglobin",
    measured_on: "2026-05-10",
    value_canonical: 118,
    unit_resolved: "g/L",
    unit_resolution_method: "explicit",
    reference_low: 120,
    reference_high: 155,
    position_in_reference: -0.06
  };

  it("модули 1, 4 и 3 срабатывают по очереди на одних данных", () => {
    const result = run({ documents: [today], prior: [priorHemoglobin] });

    // Module 1: the text row is not a value; the tumour marker is a caption
    // nobody taught the dictionary and goes to a person.
    expect(result.labValues.map((v) => v.label_original)).toEqual([
      "Гемоглобин", "MCV", "Ферритин", "Глюкоза", "Онкомаркер CA 125"
    ]);
    expect(result.humanReview.map((v) => v.label_original)).toEqual(["Онкомаркер CA 125"]);
    // An unknown caption is not an unresolved unit: the state is about
    // values whose analyte is known and whose scale is not.
    expect(result.unitUnresolved).toBe(false);

    // Module 4: ferritin without CRP is blocked, with a specific request;
    // haemoglobin has its MCV from the same document and is readable.
    expect(result.blocked.map((b) => b.analyte)).toEqual(["ferritin"]);
    expect(result.requests[0]).toContain("С-реактивный белок");
    expect(result.trends.ferritin).toBeUndefined();

    // Module 3: haemoglobin 118 → 96 across two documents is −18.6%,
    // above the 9.7% threshold.
    expect(result.trends.hemoglobin.verdict).toBe("significant");
    expect(result.trends.hemoglobin.versus_previous!.delta_percent).toBeCloseTo(-18.6, 1);
    // Glucose has no earlier point.
    expect(result.trends.glucose.verdict).toBe("insufficient_points");
  });

  it("спутник из старого документа делает новое значение читаемым", () => {
    const priorCrp = { ...priorHemoglobin, documentId: "doc-old", analyte: "crp", measured_on: "2026-08-01", value_canonical: 2, unit_resolved: "mg/L" };
    const result = run({ documents: [today], prior: [priorHemoglobin, priorCrp] });

    expect(result.blocked).toEqual([]);
    expect(result.trends.ferritin).toBeDefined();
  });

  it("значение с неопределённой единицей уходит человеку и поднимает флаг прогона", () => {
    const result = run({
      documents: [{ documentId: "d", collectionDate: "2026-08-14", agreed: [
        { label: "Гемоглобин", value: "9,6", reference: "", referenceConfirmed: true }
      ] }]
    });

    expect(result.humanReview).toHaveLength(1);
    expect(result.unitUnresolved).toBe(true);
    expect(result.trends.hemoglobin).toBeUndefined();
  });

  it("документ без даты забора хранит значения, но не ставит их на линию", () => {
    const result = run({
      documents: [{ ...today, collectionDate: null, agreed: today.agreed.slice(0, 2) }],
      prior: [priorHemoglobin]
    });

    expect(result.labValues[0].measured_on).toBeNull();
    // Haemoglobin has MCV from the same document — the blocker window
    // cannot be checked without dates, so it is blocked, not guessed.
    expect(result.blocked.map((b) => b.analyte)).toContain("hemoglobin");
    expect(result.excluded.some((e) => e.analyte === "hemoglobin")).toBe(true);
  });

  it("ничего не покидает прогон молча", () => {
    const result = run({ documents: [today], prior: [priorHemoglobin] });
    const accounted = new Set([
      ...Object.keys(result.trends),
      ...result.blocked.map((b) => b.analyte),
      ...result.humanReview.map((h) => h.analyte ?? h.label_original)
    ]);

    for (const value of result.labValues) {
      expect(accounted.has(value.analyte ?? value.label_original), value.label_original).toBe(true);
    }
  });
});
