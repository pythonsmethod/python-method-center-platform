import { describe, expect, it } from "vitest";
import {
  assessTrend,
  exactFormulaKnown,
  referenceChangeValue,
  type TrendPoint
} from "@/lib/analysis/trend-gate";
import { REFERENCE_TABLES } from "@/lib/reference/tables";

// A resolved point in the canonical unit, with an ordinary interval.
function point(
  value: number,
  extra: Partial<TrendPoint> = {}
): TrendPoint {
  return {
    valueCanonical: value,
    unitResolutionMethod: "explicit",
    unitResolved: "g/L",
    measuredOn: null,
    positionInReference: null,
    referenceLow: 120,
    referenceHigh: 155,
    ...extra
  };
}

const series = (analyte: string, ...values: number[]) =>
  assessTrend(analyte, values.map((v) => point(v)));

// The acceptance cases of section 8.3, first and verbatim. Every delta and
// every threshold was checked against the table by hand before the code
// was written.

describe("приёмочные случаи спецификации", () => {
  it("гемоглобин 118 → 109: −7.6% при пороге 9.7% — шум", () => {
    const r = series("hemoglobin", 118, 109);

    expect(r.verdict).toBe("noise");
    expect(r.versus_previous!.delta_percent).toBeCloseTo(-7.6, 1);
    expect(r.versus_previous!.rcv_used).toBe(9.7);
  });

  it("гемоглобин 118 → 96: −18.6% — тренд", () => {
    const r = series("hemoglobin", 118, 96);

    expect(r.verdict).toBe("significant");
    expect(r.versus_previous!.delta_percent).toBeCloseTo(-18.6, 1);
  });

  it("ферритин 43 → 14: −67.4% при пороге 51.9% — тренд", () => {
    const r = series("ferritin", 43, 14);

    expect(r.verdict).toBe("significant");
    expect(r.versus_previous!.rcv_used).toBe(51.9);
  });

  it("альбумин 39 → 32: −17.9% при пороге 11.1% — тренд", () => {
    expect(series("albumin", 39, 32).verdict).toBe("significant");
  });

  it("АЛТ 31 → 62: +100% при пороге 69.2% — тренд", () => {
    const r = series("alt_enzyme", 31, 62);

    expect(r.verdict).toBe("significant");
    expect(r.versus_previous!.delta_percent).toBeCloseTo(100, 6);
  });

  it("ТТГ 2.0 → 2.8: +40% при пороге 65.7% — не тренд", () => {
    // A 40% rise that means nothing. This is the case the whole gate exists
    // for: the number that looks alarming and is the body's own scatter.
    const r = series("tsh", 2.0, 2.8);

    expect(r.verdict).toBe("noise");
    expect(r.versus_previous!.is_significant).toBe(false);
  });

  it("внутри референса с изменением выше порога — значимый тренд", () => {
    // Both points sit inside 120–155 and the change is real. Nothing about
    // the interval would have flagged it; only the RCV does.
    const r = assessTrend("hemoglobin", [
      point(150, { positionInReference: 0.86 }),
      point(125, { positionInReference: 0.14 })
    ]);

    expect(r.verdict).toBe("significant");
    expect(r.latest_within_reference).toBe(true);
  });

  it("вне референса с изменением ниже порога — не ухудшение", () => {
    const r = assessTrend("hemoglobin", [
      point(100, { positionInReference: -0.57 }),
      point(96, { positionInReference: -0.69 })
    ]);

    expect(r.verdict).toBe("noise");
    expect(r.latest_within_reference).toBe(false);
  });
});

describe("порог берётся из таблицы, а не придумывается", () => {
  it("по умолчанию — записанная в таблице величина, с пометкой default", () => {
    const rcv = referenceChangeValue("hemoglobin");

    expect(rcv).toEqual({ rcv: 9.7, source: "default" });
  });

  it("при известном CVa лаборатории — точная формула, с пометкой exact", () => {
    // With CVa at the worst acceptable level the exact formula lands on the
    // table's default — which is exactly how the default was derived.
    const cvi = 2.8;
    const rcv = referenceChangeValue("hemoglobin", 0.75 * cvi);

    expect(rcv!.source).toBe("exact");
    expect(rcv!.rcv).toBeCloseTo(9.7, 1);

    // A better instrument gives a tighter threshold, never a looser one.
    expect(referenceChangeValue("hemoglobin", 0.5 * cvi)!.rcv).toBeLessThan(9.7);
  });

  it("код знает формулу ровно в той записи, в какой она стоит в таблице", () => {
    // If somebody rewords the formula in the JSON, this fails before the
    // arithmetic and the document describing it can disagree.
    expect(exactFormulaKnown()).toBe(true);
  });

  it("показатель без величины вариации не получает выдуманного порога", () => {
    // bun and inr are in the unit table but not in the variation table.
    for (const analyte of ["bun", "inr", "чего-то-нет"]) {
      expect(referenceChangeValue(analyte), analyte).toBeNull();

      const r = series(analyte, 10, 20);

      expect(r.verdict, analyte).toBe("not_comparable");
      expect(r.versus_previous, analyte).toBeNull();
    }
  });

  it("каждый показатель таблицы вариации известен таблице единиц", () => {
    const units = REFERENCE_TABLES.analyteUnits.analytes as Record<string, unknown>;

    for (const analyte of Object.keys(REFERENCE_TABLES.biologicalVariation.analytes)) {
      expect(units, analyte).toHaveProperty(analyte);
    }
  });
});

describe("тренд не строится там, где сравнивать нечего", () => {
  it("одна точка — недостаточно", () => {
    expect(assessTrend("hemoglobin", [point(118)]).verdict).toBe("insufficient_points");
  });

  it("неопределённая единица в любой точке — сравнения нет", () => {
    // Not a weaker comparison: not a comparison. The caller may pass fewer
    // points, but it does so visibly.
    const r = assessTrend("hemoglobin", [
      point(118),
      point(96, { unitResolutionMethod: "unresolved", valueCanonical: null, unitResolved: null })
    ]);

    expect(r.verdict).toBe("not_comparable");
    expect(r.reason).toContain("Точка 2");
    expect(r.versus_previous).toBeNull();
  });

  it("точки в разных единицах несопоставимы", () => {
    const r = assessTrend("hemoglobin", [point(118), point(11.8, { unitResolved: "g/dL" })]);

    expect(r.verdict).toBe("not_comparable");
    expect(r.reason).toContain("разным единицам");
  });

  it("нулевое предыдущее значение не даёт процента", () => {
    expect(series("crp", 0, 5).verdict).toBe("not_comparable");
  });
});

describe("что хранится у каждого тренда", () => {
  it("все поля спецификации присутствуют в обоих сравнениях", () => {
    const r = series("hemoglobin", 140, 130, 96);

    for (const c of [r.versus_previous!, r.versus_baseline!]) {
      expect(c).toMatchObject({
        rcv_used: 9.7,
        rcv_source: "default"
      });
      expect(typeof c.delta_percent).toBe("number");
      expect(typeof c.is_significant).toBe("boolean");
    }

    expect(r.versus_previous!.points_used).toBe(2);
    expect(r.versus_baseline!.points_used).toBe(3);
  });

  it("сравнение с базовой точкой ведётся отдельно от сравнения с предыдущей", () => {
    // Three small steps that each stay inside the noise and together do
    // not: the previous-point comparison says noise, the baseline says
    // the person has changed since the case began.
    const r = series("hemoglobin", 140, 132, 124);

    expect(r.versus_previous!.is_significant).toBe(false);
    expect(r.versus_baseline!.is_significant).toBe(true);
    expect(r.verdict).toBe("noise");
  });

  it("направление считается от трёх точек и не подменяет порог", () => {
    expect(series("hemoglobin", 140, 132, 124).direction).toBe("down");
    expect(series("hemoglobin", 140, 150, 124).direction).toBe("mixed");
    expect(series("hemoglobin", 140, 124).direction).toBeNull();
  });

  it("смена референса между документами отмечается разрывом, а не сглаживается", () => {
    const r = assessTrend("hemoglobin", [
      point(118, { referenceLow: 120, referenceHigh: 155 }),
      point(115, { referenceLow: 120, referenceHigh: 155 }),
      point(96, { referenceLow: 115, referenceHigh: 150 })
    ]);

    expect(r.reference_breaks).toEqual([1]);
    // The break is recorded; the comparison on canonical values still runs.
    expect(r.verdict).toBe("significant");
  });
});
