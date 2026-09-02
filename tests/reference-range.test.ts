import { describe, expect, it } from "vitest";
import {
  parseReferenceRange,
  positionInReference,
  referenceRangesMatch
} from "@/lib/analysis/reference-range";

// The interval printed on the form is what tells the unit apart. These
// cases are the shapes real laboratory forms actually print.

describe("разбор референсного интервала", () => {
  it("читает интервал в обеих единицах, по которым их и различают", () => {
    // The pair that the whole unit resolver rests on.
    expect(parseReferenceRange("12–15.5")).toEqual({ low: 12, high: 15.5 });
    expect(parseReferenceRange("120–155")).toEqual({ low: 120, high: 155 });
  });

  it("принимает любое тире и любой десятичный разделитель", () => {
    // A Russian form prints commas; the dash comes in four shapes and a
    // laboratory may use two of them in one document.
    for (const text of ["12-15,5", "12 – 15,5", "12 — 15.5", "12−15.5"]) {
      expect(parseReferenceRange(text), text).toEqual({ low: 12, high: 15.5 });
    }
  });

  it("не спотыкается о единицу, напечатанную рядом", () => {
    expect(parseReferenceRange("12–15.5 г/дл")).toEqual({ low: 12, high: 15.5 });
    expect(parseReferenceRange("4.0 – 9.0 x10^9/L")).toEqual({ low: 4, high: 9 });
  });

  it("читает односторонние границы", () => {
    expect(parseReferenceRange("< 5.0")).toEqual({ low: null, high: 5 });
    expect(parseReferenceRange("до 5,0")).toEqual({ low: null, high: 5 });
    expect(parseReferenceRange("менее 0.3")).toEqual({ low: null, high: 0.3 });
    expect(parseReferenceRange("> 40")).toEqual({ low: 40, high: null });
    expect(parseReferenceRange("≥ 40")).toEqual({ low: 40, high: null });
  });

  it("возвращает пусто там, где интервала нет", () => {
    for (const text of ["", "-", "—", "нет", "отрицательно", "не обнаружено", null, undefined]) {
      expect(parseReferenceRange(text as string), String(text)).toBeNull();
    }
  });

  it("отказывается от перевёрнутого интервала", () => {
    // "15.5 - 12" is a misreading, not a misprint. Accepting it would
    // invert the scale and place every value outside the interval.
    expect(parseReferenceRange("15.5 - 12")).toBeNull();
  });
});

describe("положение внутри своего интервала", () => {
  it("нижняя граница — ноль, верхняя — единица", () => {
    const range = { low: 120, high: 155 };

    expect(positionInReference(120, range)).toBe(0);
    expect(positionInReference(155, range)).toBe(1);
    expect(positionInReference(137.5, range)).toBeCloseTo(0.5, 5);
  });

  it("вне интервала выходит за границы нуля и единицы", () => {
    const range = { low: 120, high: 155 };

    expect(positionInReference(96, range)).toBeLessThan(0);
    expect(positionInReference(170, range)).toBeGreaterThan(1);
  });

  it("одно число в разных лабораториях — разное состояние", () => {
    // The point of the whole quantity. Ferritin 43 sits at the floor of one
    // laboratory's interval and mid-range in another's; the number is the
    // same and the state is not.
    const strict = positionInReference(43, { low: 30, high: 400 });
    const loose = positionInReference(43, { low: 10, high: 120 });

    expect(strict).not.toBeNull();
    expect(loose).not.toBeNull();
    expect(strict!).toBeLessThan(0.05);
    expect(loose!).toBeGreaterThan(0.25);
  });

  it("не считается там, где интервал неполный или вырожденный", () => {
    expect(positionInReference(5, null)).toBeNull();
    expect(positionInReference(5, { low: null, high: 10 })).toBeNull();
    expect(positionInReference(5, { low: 10, high: null })).toBeNull();
    // Dividing by a zero span would report infinity as a position.
    expect(positionInReference(5, { low: 10, high: 10 })).toBeNull();
  });
});

describe("сверка интервала между двумя чтениями", () => {
  it("одинаково записанный интервал считается совпавшим", () => {
    expect(referenceRangesMatch("12–15.5", "12 - 15,5")).toBe(true);
    expect(referenceRangesMatch("120-155", "120 – 155")).toBe(true);
  });

  it("расхождение в интервале — это расхождение в единице", () => {
    // Not a small discrepancy: it is grams per litre against grams per
    // decilitre, a factor of ten in what the value means.
    expect(referenceRangesMatch("12–15.5", "120–155")).toBe(false);
  });

  it("прочитанный только одним чтением интервал не считается подтверждённым", () => {
    expect(referenceRangesMatch("12–15.5", "")).toBe(false);
    expect(referenceRangesMatch("", "12–15.5")).toBe(false);
  });

  it("отсутствие интервала в обоих чтениях — это согласие", () => {
    expect(referenceRangesMatch("", "")).toBe(true);
    expect(referenceRangesMatch("-", "—")).toBe(true);
  });
});
