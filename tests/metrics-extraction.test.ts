import { describe, expect, it } from "vitest";
import {
  EXTRACTION_SYSTEM_PROMPT,
  MAX_EXTRACTED_ROWS,
  parseExtraction,
  readExtractedRow
} from "@/lib/metrics/extraction";
import { compareMetrics, type MetricReading } from "@/lib/metrics/compare";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Reading a printout into a table, and comparing two sets of results.
//
// The line these tests exist to hold: the model copies figures, and
// nothing on this path is allowed to say what the figures mean. Every
// recommendation on the platform comes from Professor Python personally.
// A model that starts interpreting a lab value — even gently, even as a
// hint — is the failure the whole platform is built around avoiding.

describe("the extraction prompt", () => {
  it("forbids assessment, reference ranges and recommendations", () => {
    for (const rule of [
      "Не оцениваешь показатели",
      "Не сравниваешь с референсными значениями",
      "Не называешь диагнозов",
      "Не даёшь рекомендаций"
    ]) {
      expect(EXTRACTION_SYSTEM_PROMPT).toContain(rule);
    }
  });

  it("names who does give recommendations", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain(
      "Все рекомендации на платформе даёт только Professor Python лично"
    );
  });

  it("asks for bare JSON rows and nothing else", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain('{"rows":[');
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("Верни ТОЛЬКО JSON");
  });
});

describe("what the interface promises about the boundary", () => {
  it("says in both languages that the assistant does not advise", () => {
    const ru = getDictionary("ru").cabinet;
    const en = getDictionary("en").cabinet;

    expect(ru.metricsUpload.boundary).toContain("не даёт рекомендаций");
    expect(ru.metricsUpload.boundary).toContain("Professor Python");
    expect(en.metricsUpload.boundary).toContain("gives no recommendations");
    expect(en.metricsUpload.boundary).toContain("Professor Python");

    expect(ru.metricsCompare.boundary).toContain("Professor Python");
    expect(en.metricsCompare.boundary).toContain("Professor Python");
  });

  it("tells the person to check the figures before they are saved", () => {
    expect(getDictionary("ru").cabinet.metricsUpload.checkNote).toContain(
      "Сверьте цифры"
    );
    expect(getDictionary("en").cabinet.metricsUpload.checkNote).toContain(
      "Check the figures"
    );
  });
});

describe("reading one proposed row", () => {
  const good = {
    name: "Гемоглобин",
    value: 132,
    unit: "г/л",
    measured_at: "2026-08-01"
  };

  it("accepts a well-formed row", () => {
    expect(readExtractedRow(good)).toEqual(good);
  });

  it("accepts a comma decimal, as a Russian form prints it", () => {
    expect(readExtractedRow({ ...good, value: "4,7" })?.value).toBe(4.7);
  });

  it("accepts a missing unit", () => {
    expect(readExtractedRow({ ...good, unit: null })?.unit).toBeNull();
  });

  it("refuses a row without a real date", () => {
    for (const measured_at of ["", "01.08.2026", "2026-13-01", "2026-02-30"]) {
      expect(readExtractedRow({ ...good, measured_at })).toBeNull();
    }
  });

  it("refuses a value that is not a number", () => {
    for (const value of ["не обнаружено", "< 0.5", "", null]) {
      expect(readExtractedRow({ ...good, value })).toBeNull();
    }
  });

  it("refuses a nameless row and one with an absurd name", () => {
    expect(readExtractedRow({ ...good, name: "  " })).toBeNull();
    expect(readExtractedRow({ ...good, name: "x".repeat(81) })).toBeNull();
  });
});

describe("parsing what the model returns", () => {
  it("reads plain JSON", () => {
    const result = parseExtraction(
      '{"rows":[{"name":"Ферритин","value":42,"unit":"нг/мл","measured_at":"2026-08-01"}]}'
    );

    expect(result).toEqual({
      status: "ok",
      rows: [
        { name: "Ферритин", value: 42, unit: "нг/мл", measured_at: "2026-08-01" }
      ]
    });
  });

  it("survives the markdown fence a model adds despite being told not to", () => {
    const result = parseExtraction(
      '```json\n{"rows":[{"name":"Ферритин","value":42,"unit":null,"measured_at":"2026-08-01"}]}\n```'
    );

    expect(result.status).toBe("ok");
    expect(result.status === "ok" && result.rows).toHaveLength(1);
  });

  it("drops the rows it cannot trust and keeps the rest", () => {
    const result = parseExtraction(
      JSON.stringify({
        rows: [
          { name: "Гемоглобин", value: 132, unit: "г/л", measured_at: "2026-08-01" },
          { name: "Железо", value: "не обнаружено", measured_at: "2026-08-01" },
          { name: "", value: 5, measured_at: "2026-08-01" }
        ]
      })
    );

    expect(result.status === "ok" && result.rows.map((r) => r.name)).toEqual([
      "Гемоглобин"
    ]);
  });

  it("keeps one reading per indicator per date", () => {
    const result = parseExtraction(
      JSON.stringify({
        rows: [
          { name: "Ферритин", value: 42, measured_at: "2026-08-01" },
          { name: "ферритин", value: 43, measured_at: "2026-08-01" },
          { name: "Ферритин", value: 51, measured_at: "2026-09-01" }
        ]
      })
    );

    expect(result.status === "ok" && result.rows).toHaveLength(2);
  });

  it("caps how many rows one file can add", () => {
    const rows = Array.from({ length: MAX_EXTRACTED_ROWS + 20 }, (_, i) => ({
      name: `Показатель ${i}`,
      value: i,
      measured_at: "2026-08-01"
    }));

    const result = parseExtraction(JSON.stringify({ rows }));

    expect(result.status === "ok" && result.rows.length).toBe(MAX_EXTRACTED_ROWS);
  });

  it("reports unreadable output rather than inventing rows", () => {
    for (const raw of ["", "не смог прочитать", "{", "[]", '{"rows":null}']) {
      expect(parseExtraction(raw).status).toBe("unreadable");
    }
  });

  it("accepts an honest empty answer", () => {
    expect(parseExtraction('{"rows":[]}')).toEqual({ status: "ok", rows: [] });
  });
});

describe("comparing the last two sets", () => {
  const rows: MetricReading[] = [
    { metric_name: "Ферритин", value: 20, unit: "нг/мл", measured_at: "2026-06-01" },
    { metric_name: "Ферритин", value: 30, unit: "нг/мл", measured_at: "2026-07-01" },
    { metric_name: "Ферритин", value: 45, unit: "нг/мл", measured_at: "2026-08-01" },
    { metric_name: "Гемоглобин", value: 140, unit: "г/л", measured_at: "2026-07-01" },
    { metric_name: "Гемоглобин", value: 133, unit: "г/л", measured_at: "2026-08-01" },
    { metric_name: "Витамин D", value: 25, unit: "нг/мл", measured_at: "2026-08-01" }
  ];

  it("compares the two most recent dates, not the first and the last", () => {
    const ferritin = compareMetrics(rows).changes.find(
      (c) => c.name === "Ферритин"
    );

    expect(ferritin?.previousValue).toBe(30);
    expect(ferritin?.currentValue).toBe(45);
    expect(ferritin?.delta).toBe(15);
    expect(ferritin?.percent).toBe(50);
    expect(ferritin?.direction).toBe("up");
  });

  it("reports a fall as a fall", () => {
    const hb = compareMetrics(rows).changes.find((c) => c.name === "Гемоглобин");

    expect(hb?.delta).toBe(-7);
    expect(hb?.direction).toBe("down");
  });

  it("sets aside an indicator with only one reading", () => {
    const { changes, firstTime } = compareMetrics(rows);

    expect(changes.some((c) => c.name === "Витамин D")).toBe(false);
    expect(firstTime.map((f) => f.name)).toEqual(["Витамин D"]);
  });

  it("lets a correction entered later win over the same date", () => {
    const corrected = compareMetrics([
      { metric_name: "X", value: 10, unit: null, measured_at: "2026-07-01" },
      { metric_name: "X", value: 99, unit: null, measured_at: "2026-08-01" },
      { metric_name: "X", value: 20, unit: null, measured_at: "2026-08-01" }
    ]).changes[0];

    expect(corrected.currentValue).toBe(20);
    expect(corrected.previousValue).toBe(10);
  });

  it("does not divide by zero", () => {
    const change = compareMetrics([
      { metric_name: "X", value: 0, unit: null, measured_at: "2026-07-01" },
      { metric_name: "X", value: 5, unit: null, measured_at: "2026-08-01" }
    ]).changes[0];

    expect(change.percent).toBeNull();
    expect(change.delta).toBe(5);
  });

  it("calls an unchanged value unchanged", () => {
    const change = compareMetrics([
      { metric_name: "X", value: 7, unit: null, measured_at: "2026-07-01" },
      { metric_name: "X", value: 7, unit: null, measured_at: "2026-08-01" }
    ]).changes[0];

    expect(change.direction).toBe("same");
    expect(change.delta).toBe(0);
  });

  it("puts the largest movement first", () => {
    const names = compareMetrics(rows).changes.map((c) => c.name);

    // Ферритин moved 50%, Гемоглобин 5%.
    expect(names[0]).toBe("Ферритин");
  });

  it("returns nothing to compare when there is nothing to compare", () => {
    expect(compareMetrics([]).changes).toEqual([]);
  });
});
