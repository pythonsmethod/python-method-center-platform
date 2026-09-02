import { describe, expect, it } from "vitest";
import {
  REFERENCE_TABLES,
  referenceSetVersion
} from "@/lib/reference/tables";

// The reference tables are clinical facts held as data. These tests pin the
// shape the modules will read them through — not the values themselves,
// which are meant to change as they are checked against their sources.

describe("справочные таблицы", () => {
  it("все четыре файла загружаются и объявляют свою версию", () => {
    for (const [name, table] of Object.entries(REFERENCE_TABLES)) {
      expect(table, name).toHaveProperty("_meta");
      expect(typeof table._meta.version, name).toBe("string");
      expect(table._meta.version.length, name).toBeGreaterThan(0);
    }
  });

  it("версия набора называет каждую таблицу отдельно", () => {
    const version = referenceSetVersion();

    // An interpretation records this string. A single combined number would
    // say that something changed without saying what, which is exactly the
    // question asked when a result moves.
    for (const part of ["units=", "variation=", "blockers=", "aliases=", "labels="]) {
      expect(version).toContain(part);
    }
  });

  it("каждое правило блокировки указывает на известный показатель", () => {
    const units = REFERENCE_TABLES.analyteUnits.analytes as Record<
      string,
      unknown
    >;

    for (const rule of REFERENCE_TABLES.interpretationBlockers.rules) {
      expect(units, rule.analyte).toHaveProperty(rule.analyte);
      expect(rule.reason.length, rule.analyte).toBeGreaterThan(0);
    }
  });

  it("порог значимого изменения выведен из вариации по общей формуле", () => {
    // RCV = 3.46 * CVi when the laboratory's own analytical variation is
    // unknown, which it always is: the centre has no agreement with any
    // laboratory. A stored figure that drifts from the formula would let a
    // change be called meaningful on arithmetic nobody can reproduce.
    for (const [analyte, entry] of Object.entries(
      REFERENCE_TABLES.biologicalVariation.analytes
    )) {
      const derived = Math.round(entry.cvi_percent * 3.46 * 10) / 10;

      expect(entry.rcv_default_percent, analyte).toBeCloseTo(derived, 1);
    }
  });
});
