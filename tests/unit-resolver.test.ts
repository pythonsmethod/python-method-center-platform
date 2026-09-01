import { describe, expect, it } from "vitest";
import { canonicaliseUnitSpelling, resolveUnit } from "@/lib/analysis/unit-resolver";

// The acceptance cases of section 8.1 of the specification, first and
// verbatim. Every number in them was checked by hand before the code was
// written.

describe("приёмочные случаи спецификации", () => {
  it("гемоглобин 9.6 при интервале 12–15.5 читается как g/dL и равен 96 g/L", () => {
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 9.6,
      referencePrinted: "12–15.5",
      referenceConfirmed: true
    });

    expect(r.method).toBe("resolved_by_reference");
    expect(r.unitResolved).toBe("g/L");
    expect(r.valueCanonical).toBeCloseTo(96, 6);
    expect(r.conversionFactor).toBe(10);
  });

  it("гемоглобин 96 при интервале 120–155 уже в канонической единице", () => {
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 96,
      referencePrinted: "120–155",
      referenceConfirmed: true
    });

    expect(r.method).toBe("resolved_by_reference");
    expect(r.unitResolved).toBe("g/L");
    expect(r.valueCanonical).toBe(96);
    expect(r.conversionFactor).toBe(1);
  });

  it("кальций 9.6 при интервале 8.6–10.2 даёт 2.395 mmol/L", () => {
    const r = resolveUnit({
      analyte: "calcium_total",
      value: 9.6,
      referencePrinted: "8.6–10.2",
      referenceConfirmed: true
    });

    expect(r.unitResolved).toBe("mmol/L");
    expect(r.valueCanonical).toBeCloseTo(2.395, 3);
  });

  it("кальций 2.4 при интервале 2.15–2.55 не пересчитывается", () => {
    const r = resolveUnit({
      analyte: "calcium_total",
      value: 2.4,
      referencePrinted: "2.15–2.55",
      referenceConfirmed: true
    });

    expect(r.unitResolved).toBe("mmol/L");
    expect(r.valueCanonical).toBe(2.4);
    expect(r.conversionFactor).toBe(1);
  });

  it("глюкоза 500 при интервале 70–100 даёт 27.75 mmol/L", () => {
    // The value behind the specification's critical-value case: 500 mg/dL
    // is a number no laboratory prints in mmol/L, and the interval is the
    // only thing that says so.
    const r = resolveUnit({
      analyte: "glucose",
      value: 500,
      referencePrinted: "70–100",
      referenceConfirmed: true
    });

    expect(r.unitResolved).toBe("mmol/L");
    expect(r.valueCanonical).toBeCloseTo(27.755, 3);
  });

  it("без единицы и без интервала — не определено, и молча не проходит", () => {
    const r = resolveUnit({ analyte: "hemoglobin", value: 9.6 });

    expect(r.method).toBe("unresolved");
    expect(r.valueCanonical).toBeNull();
    expect(r.unresolvedReason).toBeTruthy();
  });

  it("мочевина и BUN остаются разными показателями", () => {
    // Not two units of one thing. BUN mg/dL x 0.357 = urea mmol/L, and an
    // automatic conversion between them would be a silent factor of three.
    const urea = resolveUnit({ analyte: "urea", value: 5, unitPrinted: "ммоль/л" });
    const bun = resolveUnit({ analyte: "bun", value: 18, unitPrinted: "mg/dL" });

    expect(urea.unitResolved).toBe("mmol/L");
    expect(urea.valueCanonical).toBe(5);

    expect(bun.unitResolved).toBe("mmol/L_urea");
    expect(bun.valueCanonical).toBeCloseTo(6.426, 3);
    // The two canonical units differ, so nothing downstream can compare
    // them by accident.
    expect(bun.unitResolved).not.toBe(urea.unitResolved);
  });

  it("ферритин в ng/mL и в µg/L — одна шкала, множитель единица", () => {
    const a = resolveUnit({ analyte: "ferritin", value: 43, unitPrinted: "нг/мл" });
    const b = resolveUnit({ analyte: "ferritin", value: 43, unitPrinted: "мкг/л" });

    expect(a.valueCanonical).toBe(43);
    expect(b.valueCanonical).toBe(43);
    expect(a.unitResolved).toBe(b.unitResolved);
  });
});

describe("напечатанная единица", () => {
  it("узнаётся в кириллице и латинице одинаково", () => {
    for (const spelling of ["г/л", "g/L", "G/L", "гр/л", " г/л "]) {
      expect(canonicaliseUnitSpelling(spelling), spelling).toBe("g/L");
    }

    expect(canonicaliseUnitSpelling("мкмоль/л")).toBe("umol/L");
    expect(canonicaliseUnitSpelling("10^9/л")).toBe("10^9/L");
  });

  it("имеет приоритет над интервалом", () => {
    // A laboratory naming its own unit is better evidence than a
    // fingerprint, and it is what the person sees on their paper.
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 96,
      unitPrinted: "г/л",
      referencePrinted: "120–155",
      referenceConfirmed: true
    });

    expect(r.method).toBe("explicit");
    expect(r.valueCanonical).toBe(96);
  });

  it("незнакомое написание не выдумывается, а отправляет к интервалу", () => {
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 9.6,
      unitPrinted: "непонятно",
      referencePrinted: "12–15.5",
      referenceConfirmed: true
    });

    expect(r.method).toBe("resolved_by_reference");
    expect(r.valueCanonical).toBeCloseTo(96, 6);
  });
});

describe("отказ вместо догадки", () => {
  it("интервал, не совпавший у двух чтений, единицу не определяет", () => {
    // The property the previous step exists to provide. Without it the
    // resolver would happily use an interval one reading invented.
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 9.6,
      referencePrinted: "12–15.5",
      referenceConfirmed: false
    });

    expect(r.method).toBe("unresolved");
    expect(r.unresolvedReason).toContain("разные референсные интервалы");
  });

  it("односторонняя граница не считается отпечатком", () => {
    // "< 5.0" fits a great many scales at once, so it identifies nothing.
    const r = resolveUnit({
      analyte: "crp",
      value: 3,
      referencePrinted: "< 5.0",
      referenceConfirmed: true
    });

    expect(r.method).toBe("unresolved");
  });

  it("интервал, не совпавший ни с одной единицей, оставляет значение неопределённым", () => {
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 9.6,
      referencePrinted: "900–1000",
      referenceConfirmed: true
    });

    expect(r.method).toBe("unresolved");
    expect(r.unresolvedReason).toContain("не совпал");
  });

  it("неизвестный показатель не пересчитывается ни во что", () => {
    const r = resolveUnit({ analyte: "чего-то-нет", value: 5, unitPrinted: "г/л" });

    expect(r.method).toBe("unresolved");
    expect(r.valueCanonical).toBeNull();
  });
});

describe("что сохраняется рядом с пересчётом", () => {
  it("оригинал остаётся нетронутым", () => {
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 9.6,
      unitPrinted: "г/дл",
      referencePrinted: "12–15.5",
      referenceConfirmed: true
    });

    // The three things the person sees on their own paper.
    expect(r.unitOriginal).toBe("г/дл");
    expect(r.referenceOriginal).toBe("12–15.5");
    expect(r.referenceLow).toBe(12);
    expect(r.referenceHigh).toBe(15.5);
  });

  it("положение внутри интервала считается по напечатанной шкале", () => {
    // Value and interval are printed on the same scale whichever it is, so
    // the position needs no conversion — and stays comparable between
    // countries precisely because of that.
    const r = resolveUnit({
      analyte: "hemoglobin",
      value: 9.6,
      referencePrinted: "12–15.5",
      referenceConfirmed: true
    });

    expect(r.positionInReference).not.toBeNull();
    expect(r.positionInReference!).toBeLessThan(0);
  });

  it("гликированный гемоглобин переводится формулой, а не множителем", () => {
    // IFCC to NGSP is not a multiplication. The formula is named in the
    // table; a table naming a formula the code does not know converts
    // nothing rather than multiplying by something plausible.
    const r = resolveUnit({
      analyte: "hba1c",
      value: 48,
      unitPrinted: "ммоль/моль"
    });

    expect(r.unitResolved).toBe("%_NGSP");
    expect(r.valueCanonical).toBeCloseTo(6.54, 2);
    expect(r.conversionFactor).toBeNull();
  });
});
