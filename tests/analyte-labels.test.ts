import { describe, expect, it } from "vitest";
import { knownAnalytes, resolveAnalyteLabel } from "@/lib/analysis/analyte-labels";
import { REFERENCE_TABLES } from "@/lib/reference/tables";

const resolved = (printed: string) => {
  const result = resolveAnalyteLabel(printed);

  return result.status === "resolved" ? result.analyte : null;
};

describe("подпись в бланке — код показателя", () => {
  it("узнаёт один показатель во всех его написаниях", () => {
    for (const printed of ["Гемоглобин", "гемоглобин", "HGB", "Hb", "Haemoglobin", "  ГЕМОГЛОБИН  "]) {
      expect(resolved(printed), printed).toBe("hemoglobin");
    }
  });

  it("не спотыкается о знаки препинания и единицу рядом", () => {
    // The shapes forms actually print.
    expect(resolved("Нейтрофилы абс.")).toBe("neutrophils_abs");
    expect(resolved("Глюкоза, ммоль/л")).toBe("glucose");
    expect(resolved("Гемоглобин г/л")).toBe("hemoglobin");
    expect(resolved("25(OH)D")).toBe("vitamin_d_25oh");
  });
});

describe("похожее — не то же самое", () => {
  it("мочевина, мочевая кислота и азот мочевины — три разных показателя", () => {
    // They share a prefix in Russian and are different substances. A match
    // by substring or by nearest spelling would merge them.
    expect(resolved("Мочевина")).toBe("urea");
    expect(resolved("Мочевая кислота")).toBe("uric_acid");
    expect(resolved("Азот мочевины")).toBe("bun");
    expect(resolved("BUN")).toBe("bun");
  });

  it("незнакомая подпись не разгадывается", () => {
    for (const printed of ["", "Гемогл", "Гемоглобин плода", "Онкомаркер CA 125", "—"]) {
      expect(resolveAnalyteLabel(printed).status, printed).toBe("unknown");
    }
  });

  it("двусмысленные сокращения намеренно не опознаются", () => {
    // "Mg" is also milligrams, "TG" is also thyroglobulin, "UA" is also a
    // urine test. Not recognising them is the safe answer.
    for (const printed of ["Mg", "TG", "UA", "Ca", "P"]) {
      expect(resolveAnalyteLabel(printed).status, printed).toBe("unknown");
    }
  });
});

describe("один словарь, а не два", () => {
  it("каждый код из словаря подписей есть в таблице единиц, и наоборот", () => {
    // The prohibition in section 11 of the specification. Two lists of
    // analyte codes is two things to keep in step, which is two things to
    // get wrong.
    const units = Object.keys(
      REFERENCE_TABLES.analyteUnits.analytes as Record<string, unknown>
    ).sort();

    expect(knownAnalytes()).toEqual(units);
  });

  it("ни одно написание не ведёт к двум разным показателям", () => {
    const table = REFERENCE_TABLES.analyteLabels.labels as Record<string, string[]>;
    const seen = new Map<string, string>();

    for (const [analyte, spellings] of Object.entries(table)) {
      for (const spelling of spellings) {
        const key = spelling.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
        const previous = seen.get(key);

        expect(previous ?? analyte, `${spelling} → ${previous} / ${analyte}`).toBe(analyte);
        seen.set(key, analyte);
      }
    }
  });
});
