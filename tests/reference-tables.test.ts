import { describe, expect, it } from "vitest";
import {
  REFERENCE_TABLES,
  criticalValuesApproved,
  criticalValuesBlockReason,
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
    for (const part of ["units=", "variation=", "critical=", "blockers="]) {
      expect(version).toContain(part);
    }
  });

  it("каждый показатель с порогом имеет каноническую единицу", () => {
    // A threshold is compared against a value converted into the canonical
    // unit. A threshold for an analyte the unit table does not know is a
    // comparison that can never happen.
    const units = REFERENCE_TABLES.analyteUnits.analytes as Record<
      string,
      { canonical: string }
    >;

    for (const threshold of REFERENCE_TABLES.criticalValues.thresholds) {
      expect(units, threshold.analyte).toHaveProperty(threshold.analyte);
      expect(units[threshold.analyte].canonical, threshold.analyte).toBe(
        threshold.unit
      );
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

describe("подпись под критическими порогами", () => {
  it("пороги не подписаны, значит скрининг не идёт в production", () => {
    // This is not a wish for the future: it is the state of the file today,
    // and the test exists so that shipping the Safety Screen while the
    // field is still empty is impossible to do by accident.
    const approved = criticalValuesApproved();
    const reason = criticalValuesBlockReason();

    if (approved) {
      expect(reason).toBeNull();
      return;
    }

    expect(reason).toBeTruthy();
    expect(reason).toContain("approved_by");
  });

  it("пустая строка и пробелы не считаются подписью", () => {
    // A signature is a person's name. "" and " " are what a field looks
    // like when somebody meant to come back to it.
    const approver: unknown = REFERENCE_TABLES.criticalValues._meta.approved_by;

    if (typeof approver === "string") {
      expect(criticalValuesApproved()).toBe(approver.trim().length > 0);
    } else {
      expect(criticalValuesApproved()).toBe(false);
    }
  });
});
