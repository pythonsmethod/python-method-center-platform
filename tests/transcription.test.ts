import { describe, expect, it } from "vitest";
import {
  compareTranscriptions,
  formatAgreed,
  formatDisputed,
  parseTranscription,
  TRANSCRIPTION_SYSTEM_PROMPT,
  type TranscribedValue
} from "@/lib/assistant/transcription";

// Reading a client's documents twice and comparing the two readings.
//
// The error that produced this: a discharge summary carried a table whose
// value column was printed offset from its row labels. The assistant slid by
// one row, read the body-mass index — 25 — as the answer in the row
// "Smoking (yes, no)", and reported a non-smoker as a smoker. Every one of
// the forty-odd laboratory values was transcribed correctly; the mistake was
// alignment, which no instruction makes reliable on a photograph of creased
// paper.
//
// So nothing reaches the analysis unless two independent readings produced
// the same value. Everything else is named — with its file — for a person to
// settle by opening it.

function row(overrides: Partial<TranscribedValue> = {}): TranscribedValue {
  return {
    file: "IMG_6220.jpeg",
    section: "Таблица осмотра",
    label: "Курение (да, нет)",
    value: "нет",
    confident: true,
    note: "-",
    ...overrides
  };
}

describe("reading the reader's answer", () => {
  it("takes a well-formed line apart", () => {
    const [parsed] = parseTranscription(
      "IMG_6219.jpeg :: Биохимия 17.07.2026 :: Креатинин :: 71 мкмоль/л :: ДА :: -"
    );

    expect(parsed).toEqual({
      file: "IMG_6219.jpeg",
      section: "Биохимия 17.07.2026",
      label: "Креатинин",
      value: "71 мкмоль/л",
      confident: true,
      note: "-"
    });
  });

  it("keeps the explanation of what was unclear", () => {
    const [parsed] = parseTranscription(
      "IMG_6218.jpeg :: УЗИ :: ПЗР правой доли :: 136 мм :: НЕТ :: сгиб бумаги проходит через цифру"
    );

    expect(parsed.confident).toBe(false);
    expect(parsed.note).toBe("сгиб бумаги проходит через цифру");
  });

  it("treats a missing answer as unsure, never as confident", () => {
    // A reading that forgot to answer the question is not a confident one,
    // and the difference decides whether a value reaches a person unchecked.
    const [parsed] = parseTranscription("f.jpeg :: Раздел :: Строка :: 5 :: :: -");

    expect(parsed.confident).toBe(false);
  });

  it("ignores anything that is not a value line", () => {
    const parsed = parseTranscription(
      ["Вот что я прочитал:", "", "f.jpeg :: Раздел :: Строка :: 5 :: ДА :: -", "Готово."].join("\n")
    );

    expect(parsed).toHaveLength(1);
  });
});

describe("what two readings agree on", () => {
  it("passes a value through when both saw the same thing", () => {
    const result = compareTranscriptions([row()], [row()]);

    expect(result.agreed).toHaveLength(1);
    expect(result.disputed).toHaveLength(0);
  });

  it("ignores spacing and a comma written for a decimal point", () => {
    const result = compareTranscriptions(
      [row({ label: "Калий", value: "4,71 ммоль/л" })],
      [row({ label: "Калий", value: "4.71  ммоль/л" })]
    );

    expect(result.agreed).toHaveLength(1);
  });
});

describe("what must never pass quietly", () => {
  it("holds back a value the two readings disagree on", () => {
    // The real failure, reproduced: one reading slid a row and reported the
    // body-mass index as the smoking answer.
    const result = compareTranscriptions(
      [row({ value: "нет" })],
      [row({ value: "25" })]
    );

    expect(result.agreed).toHaveLength(0);
    expect(result.disputed).toHaveLength(1);
    expect(result.disputed[0].reason).toBe("разные значения");
    expect(result.disputed[0].first).toBe("нет");
    expect(result.disputed[0].second).toBe("25");
  });

  it("holds back a value only one reading saw at all", () => {
    const result = compareTranscriptions([row()], []);

    expect(result.agreed).toHaveLength(0);
    expect(result.disputed[0].reason).toBe("прочитано только один раз");
    expect(result.disputed[0].second).toBeNull();
  });

  it("holds back a value the second reading found and the first did not", () => {
    const result = compareTranscriptions([], [row()]);

    expect(result.disputed).toHaveLength(1);
    expect(result.disputed[0].first).toBeNull();
  });

  it("holds back a value either reading was unsure of", () => {
    // Agreement between two guesses is not confirmation.
    const result = compareTranscriptions(
      [row({ confident: false, note: "блик на цифре" })],
      [row({ confident: true })]
    );

    expect(result.agreed).toHaveLength(0);
    expect(result.disputed[0].reason).toBe("чтение неуверенное");
    expect(result.disputed[0].note).toContain("блик");
  });
});

describe("what a person is given to settle", () => {
  it("names the file, the section and the row", () => {
    const { disputed } = compareTranscriptions(
      [row({ value: "нет" })],
      [row({ value: "25" })]
    );
    const text = formatDisputed(disputed);

    expect(text).toContain("IMG_6220.jpeg");
    expect(text).toContain("Курение (да, нет)");
    expect(text).toContain("«нет»");
    expect(text).toContain("«25»");
  });

  it("says nothing when there is nothing to settle", () => {
    expect(formatDisputed([])).toBe("");
  });
});

describe("what the analysis is allowed to work from", () => {
  it("carries only the agreed values, grouped by their source", () => {
    const text = formatAgreed([
      row({ section: "Биохимия", label: "Креатинин", value: "71 мкмоль/л" }),
      row({ section: "Биохимия", label: "АЛТ", value: "24 Ед/л" })
    ]);

    expect(text).toContain("Биохимия — файл «IMG_6220.jpeg»");
    expect(text).toContain("- Креатинин: 71 мкмоль/л");
    expect(text).toContain("- АЛТ: 24 Ед/л");
  });

  it("says plainly when nothing survived both readings", () => {
    // Silence here would look like a document with no values in it.
    expect(formatAgreed([])).toContain("ни одно значение не подтвердилось");
  });
});

describe("the instruction given to the reader", () => {
  it("forbids reading a table by position", () => {
    // The offset column is the whole reason this exists.
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("Сопоставляй по смыслу");
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("ЧУЖОЕ значение");
  });

  it("forbids guessing and forbids silent corrections", () => {
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("Нельзя угадывать");
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("Нельзя молча исправлять бланк");
  });

  it("demands the file name rather than an invented one", () => {
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("Не выдумывай имя");
  });

  it("demands everything, including what looks unimportant", () => {
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("Переноси ВСЁ");
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain(
      "Нельзя пропускать строку потому, что она кажется незначительной"
    );
  });
});
