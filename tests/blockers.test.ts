import { describe, expect, it } from "vitest";
import {
  assessBlockers,
  FACT_NAMES,
  forInterpretation,
  isAnalyteRequirement,
  personFactsFrom,
  type InterpretableMeasurement,
  type Measurement
} from "@/lib/analysis/blockers";
import { REFERENCE_TABLES } from "@/lib/reference/tables";

function m(analyte: string, measuredOn: string | null, value: number | null = 1, extra: Partial<Measurement> = {}): Measurement {
  return { analyte, measuredOn, valueCanonical: value, unitResolved: "x", ...extra };
}

// The acceptance cases of section 8.4, first and verbatim.

describe("приёмочные случаи спецификации", () => {
  it("ферритин без СРБ в пределах 30 дней — заблокирован, запрос называет СРБ того же периода", () => {
    const ferritin = m("ferritin", "2026-08-14", 43);
    const r = assessBlockers(ferritin, [ferritin, m("crp", "2026-06-01", 2)]);

    expect(r.status).toBe("blocked");
    expect(r.missing).toEqual(["crp"]);
    expect(r.request).toContain("С-реактивный белок");
    expect(r.request).toContain("30 дн.");
    expect(r.request).toContain("ферритин");
    expect(r.reason).toContain("Белок острой фазы");
  });

  it("кальций без альбумина — заблокирован", () => {
    const calcium = m("calcium_total", "2026-08-14", 2.4);

    expect(assessBlockers(calcium, [calcium]).status).toBe("blocked");
  });

  it("кортизол без времени забора — заблокирован", () => {
    const cortisol = m("cortisol", "2026-08-14", 400);
    const r = assessBlockers(cortisol, [cortisol]);

    expect(r.status).toBe("blocked");
    expect(r.missing).toEqual(["collection_time"]);
    expect(r.request).toContain("время забора");
  });

  it("калий без статуса гемолиза — заблокирован для интерпретации, но виден", () => {
    // The value is not hidden: the assessment carries it, and the table of
    // all measurements still shows it. What it cannot do is reach a
    // conclusion.
    const potassium = m("potassium", "2026-08-14", 6.0);
    const r = assessBlockers(potassium, [potassium]);

    expect(r.status).toBe("blocked");
    expect(r.missing).toEqual(["hemolysis_flag"]);
    expect(r.severity).toBe("safety");
    expect(r.analyte).toBe("potassium");
  });

  it("B12 = 400 pmol/L без гомоцистеина — не блокируется, вне условия правила", () => {
    const b12 = m("vitamin_b12", "2026-08-14", 400);

    expect(assessBlockers(b12, [b12]).status).toBe("ok");
  });

  it("заблокированный показатель не может попасть в выводы", () => {
    const ferritin = m("ferritin", "2026-08-14", 43);
    const glucose = m("glucose", "2026-08-14", 5.1);
    const { interpretable, blocked } = forInterpretation([ferritin, glucose]);

    expect(interpretable.map((x) => x.analyte)).toEqual(["glucose"]);
    expect(blocked.map((x) => x.analyte)).toEqual(["ferritin"]);

    // The brand: a Measurement is not an InterpretableMeasurement, and the
    // only way to make one is the function above. A cast that bypasses it
    // does not compile.
    // @ts-expect-error — a plain measurement cannot be passed off as interpretable
    const smuggled: InterpretableMeasurement = ferritin;
    expect(smuggled).toBeDefined();
  });
});

describe("окно совпадения по времени", () => {
  const ferritin = m("ferritin", "2026-08-14", 43);

  it("спутник внутри окна включительно — читается; за окном — нет", () => {
    expect(assessBlockers(ferritin, [ferritin, m("crp", "2026-07-15", 2)]).status).toBe("ok");
    expect(assessBlockers(ferritin, [ferritin, m("crp", "2026-07-14", 2)]).status).toBe("blocked");
  });

  it("спутник без даты не считается спутником того же периода", () => {
    // "Probably the same period" is a guess.
    expect(assessBlockers(ferritin, [ferritin, m("crp", null, 2)]).status).toBe("blocked");
  });

  it("спутник без определённой единицы ничего не открывает", () => {
    expect(assessBlockers(ferritin, [ferritin, m("crp", "2026-08-14", null)]).status).toBe("blocked");
  });

  it("у железа окно семь дней: восьмой день — уже не тот период", () => {
    const iron = m("iron", "2026-08-14", 15, { facts: { collection_time: true } });

    expect(assessBlockers(iron, [iron, m("transferrin_saturation", "2026-08-21", 20)]).status).toBe("ok");
    expect(assessBlockers(iron, [iron, m("transferrin_saturation", "2026-08-22", 20)]).status).toBe("blocked");
  });
});

describe("условие применимости правила", () => {
  it("пограничный B12 без гомоцистеина — заблокирован", () => {
    const b12 = m("vitamin_b12", "2026-08-14", 200);
    const r = assessBlockers(b12, [b12]);

    expect(r.status).toBe("blocked");
    expect(r.request).toContain("гомоцистеин");
  });

  it("значение без определённой единицы не освобождается от правила", () => {
    // Exemption has to be shown, not assumed.
    const b12 = m("vitamin_b12", "2026-08-14", null);

    expect(assessBlockers(b12, [b12]).status).toBe("blocked");
  });
});

describe("факты о человеке", () => {
  it("креатинин читается только при известных возрасте и поле", () => {
    const creatinine = m("creatinine", "2026-08-14", 80);

    expect(assessBlockers(creatinine, [creatinine]).missing).toEqual(["age", "sex"]);
    expect(assessBlockers(creatinine, [creatinine], { age: true, sex: true }).status).toBe("ok");
  });

  it("возраст и пол берутся из анкеты, и только если она их называет", () => {
    expect(personFactsFrom({ birth_date: "1980-04-12", sex: "female" })).toEqual({ age: true, sex: true });
    expect(personFactsFrom({ birth_date: null, sex: "unspecified" })).toEqual({});
    expect(personFactsFrom(null)).toEqual({});
  });

  it("факт, который никто не сообщил, — отсутствующий факт", () => {
    const hba1c = m("hba1c", "2026-08-14", 6.5);
    const r = assessBlockers(hba1c, [hba1c], { no_anemia: true });

    expect(r.missing).toEqual(["no_recent_transfusion"]);
    expect(r.satisfied).toEqual(["no_anemia"]);
  });
});

describe("таблица правил и код не расходятся", () => {
  const rules = REFERENCE_TABLES.interpretationBlockers.rules as Array<{ analyte: string; requires: string[] }>;

  it("каждое требование — либо известный показатель, либо известный факт", () => {
    // A misspelt companion would otherwise become an unsatisfiable "fact"
    // and block the analyte forever, silently.
    for (const rule of rules) {
      for (const requirement of rule.requires) {
        const known = isAnalyteRequirement(requirement) || (FACT_NAMES as readonly string[]).includes(requirement);

        expect(known, `${rule.analyte} requires ${requirement}`).toBe(true);
      }
    }
  });

  it("каждый факт из списка кода действительно нужен какому-то правилу", () => {
    const used = new Set(rules.flatMap((rule) => rule.requires));

    for (const fact of FACT_NAMES) {
      expect(used.has(fact), fact).toBe(true);
    }
  });

  it("правило без условия применимости считает показатель заблокированным всегда, когда нет спутника", () => {
    const hb = m("hemoglobin", "2026-08-14", 96);

    expect(assessBlockers(hb, [hb]).missing).toEqual(["mcv"]);
  });
});
