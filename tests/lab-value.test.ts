import { describe, expect, it } from "vitest";
import {
  buildLabValue,
  needsHumanReview,
  type ExtractedRow,
  type LabValueRecord
} from "@/lib/analysis/lab-value";

// The database refuses a row whose resolved half disagrees with its method.
// The same rule is checked here so a violation shows up in a test rather
// than as a failed insert in the middle of a document being processed.
function satisfiesStorageConstraint(record: LabValueRecord): boolean {
  return record.unit_resolution_method === "unresolved"
    ? record.unit_resolved === null &&
        record.value_canonical === null &&
        record.conversion_factor === null &&
        record.unresolved_reason !== null
    : record.unit_resolved !== null &&
        record.value_canonical !== null &&
        record.unresolved_reason === null;
}

const rows: ExtractedRow[] = [
  { labelPrinted: "Гемоглобин", value: 9.6, referencePrinted: "12–15.5", referenceConfirmed: true },
  { labelPrinted: "Гемоглобин", value: 96, unitPrinted: "г/л" },
  { labelPrinted: "Глюкоза, ммоль/л", value: 5.1, unitPrinted: "ммоль/л" },
  { labelPrinted: "Ферритин", value: 43, unitPrinted: "нг/мл" },
  { labelPrinted: "Мочевина", value: 5, unitPrinted: "ммоль/л" },
  { labelPrinted: "BUN", value: 18, unitPrinted: "mg/dL" },
  { labelPrinted: "Гликированный гемоглобин", value: 48, unitPrinted: "ммоль/моль" },
  { labelPrinted: "Гемоглобин", value: 9.6 },
  { labelPrinted: "Гемоглобин", value: 9.6, referencePrinted: "12–15.5", referenceConfirmed: false },
  { labelPrinted: "Непонятный показатель", value: 1, unitPrinted: "г/л" },
  { labelPrinted: "Кальций", value: 9.6, referencePrinted: "8.6–10.2", referenceConfirmed: true }
];

describe("строка бланка становится записью факта", () => {
  it("подпись и число разбираются вместе", () => {
    const record = buildLabValue(rows[0]);

    expect(record.analyte).toBe("hemoglobin");
    expect(record.unit_resolution_method).toBe("resolved_by_reference");
    expect(record.unit_resolved).toBe("g/L");
    expect(record.value_canonical).toBeCloseTo(96, 6);
    expect(record.position_in_reference).not.toBeNull();
  });

  it("оригинал сохраняется таким, как напечатан", () => {
    const record = buildLabValue({
      labelPrinted: "Гемоглобин",
      value: 9.6,
      unitPrinted: "г/дл",
      referencePrinted: "12–15.5",
      referenceConfirmed: true,
      measuredOn: "2026-08-14"
    });

    // The three things the person sees on their own paper, plus the caption
    // and the date.
    expect(record.label_original).toBe("Гемоглобин");
    expect(record.value_original).toBe(9.6);
    expect(record.unit_original).toBe("г/дл");
    expect(record.reference_original).toBe("12–15.5");
    expect(record.measured_on).toBe("2026-08-14");
  });

  it("записывает, какая редакция справочников это посчитала", () => {
    // When an answer changes, the first question is whether the code changed
    // or the tables underneath it did.
    expect(buildLabValue(rows[0]).reference_set_version).toContain("units=");
    expect(buildLabValue(rows[0]).reference_set_version).toContain("labels=");
  });
});

describe("нераспознанное не проходит молча", () => {
  it("незнакомая подпись останавливает пересчёт и называет причину", () => {
    const record = buildLabValue(rows[9]);

    expect(record.analyte).toBeNull();
    expect(record.value_canonical).toBeNull();
    expect(record.unit_resolution_method).toBe("unresolved");
    expect(record.unresolved_reason).toContain("Непонятный показатель");
    // The row is still kept whole: the person settling it has to read what
    // the form actually said.
    expect(record.value_original).toBe(1);
    expect(record.unit_original).toBe("г/л");
  });

  it("каждая запись удовлетворяет ограничению хранилища", () => {
    // Including the awkward ones: no unit and no interval, an interval two
    // readings disagreed on, a conversion by formula rather than factor.
    for (const row of rows) {
      const record = buildLabValue(row);

      expect(satisfiesStorageConstraint(record), row.labelPrinted).toBe(true);
    }
  });

  it("к человеку уходит и непонятная подпись, и неопределённая единица", () => {
    expect(needsHumanReview(buildLabValue(rows[9]))).toBe(true);
    expect(needsHumanReview(buildLabValue(rows[7]))).toBe(true);
    expect(needsHumanReview(buildLabValue(rows[8]))).toBe(true);
    expect(needsHumanReview(buildLabValue(rows[0]))).toBe(false);
  });
});

describe("показатели, которые нельзя путать", () => {
  it("мочевина и BUN приходят к разным каноническим единицам", () => {
    const urea = buildLabValue(rows[4]);
    const bun = buildLabValue(rows[5]);

    expect(urea.analyte).toBe("urea");
    expect(bun.analyte).toBe("bun");
    expect(urea.unit_resolved).not.toBe(bun.unit_resolved);
  });

  it("формульный пересчёт не записывает множителя", () => {
    const record = buildLabValue(rows[6]);

    expect(record.analyte).toBe("hba1c");
    expect(record.value_canonical).toBeCloseTo(6.54, 2);
    expect(record.conversion_factor).toBeNull();
  });
});
