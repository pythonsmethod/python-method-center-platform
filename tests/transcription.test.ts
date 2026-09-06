import { describe, expect, it } from "vitest";
import {
  canResolveAsVisuallyEmpty,
  classifyTranscribedDocument,
  compareTranscriptions,
  coalesceTranscriptionFragments,
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
    reference: "-",
    referenceConfirmed: false,
    confident: true,
    note: "-",
    ...overrides
  };
}

// The interval decides the unit, so the two readings have to agree on it
// separately from agreeing on the value.
describe("сверка референсного интервала между чтениями", () => {
  it("совпавший интервал отмечается подтверждённым", () => {
    const first = [row({ label: "Гемоглобин", value: "96", reference: "120-155" })];
    const second = [row({ label: "Гемоглобин", value: "96", reference: "120 – 155" })];

    const { agreed, disputed } = compareTranscriptions(first, second);

    expect(disputed).toHaveLength(0);
    expect(agreed).toHaveLength(1);
    expect(agreed[0].referenceConfirmed).toBe(true);
  });

  it("разные интервалы не спорят о значении, но снимают подтверждение", () => {
    // The readings saw the same number, so the value is not in dispute.
    // They saw different scales, so nothing about the unit follows from it.
    const first = [row({ label: "Гемоглобин", value: "9.6", reference: "12-15.5" })];
    const second = [row({ label: "Гемоглобин", value: "9.6", reference: "120-155" })];

    const { agreed, disputed } = compareTranscriptions(first, second);

    expect(disputed).toHaveLength(0);
    expect(agreed).toHaveLength(1);
    expect(agreed[0].value).toBe("9.6");
    expect(agreed[0].referenceConfirmed).toBe(false);
  });

  it("интервал, увиденный одним чтением, не подтверждён", () => {
    const first = [row({ label: "Ферритин", value: "43", reference: "30-400" })];
    const second = [row({ label: "Ферритин", value: "43", reference: "-" })];

    const { agreed } = compareTranscriptions(first, second);

    expect(agreed[0].referenceConfirmed).toBe(false);
  });
});

describe("reading the reader's answer", () => {
  it("takes a well-formed line apart", () => {
    const [parsed] = parseTranscription(
      "IMG_6219.jpeg :: Биохимия 17.07.2026 :: Креатинин :: 71 мкмоль/л :: 62 - 106 :: ДА :: -"
    );

    expect(parsed).toEqual({
      file: "IMG_6219.jpeg",
      section: "Биохимия 17.07.2026",
      label: "Креатинин",
      value: "71 мкмоль/л",
      reference: "62 - 106",
      // Settled by comparing the two readings, not by one of them.
      referenceConfirmed: false,
      confident: true,
      note: "-"
    });
  });

  it("reads a line written before the interval was asked for", () => {
    // Six fields, the shape the reader used until the reference interval
    // was added. The confidence answer is found by what it says, so the
    // older line still parses instead of sliding by one field.
    const [parsed] = parseTranscription(
      "IMG_6219.jpeg :: Биохимия :: Креатинин :: 71 мкмоль/л :: ДА :: -"
    );

    expect(parsed.value).toBe("71 мкмоль/л");
    expect(parsed.reference).toBe("");
    expect(parsed.confident).toBe(true);
    expect(parsed.note).toBe("-");
  });

  it("does not mistake an interval that reads \"нет\" for the answer", () => {
    // A laboratory that printed no interval, and a reader that wrote the
    // word rather than a dash. Position five is checked first, so the real
    // answer is still found in position six.
    const [parsed] = parseTranscription(
      "IMG_6219.jpeg :: Анкета :: Курение :: нет :: нет :: ДА :: -"
    );

    expect(parsed.value).toBe("нет");
    expect(parsed.reference).toBe("нет");
    expect(parsed.confident).toBe(true);
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

  it("ignores presentation-only punctuation in identical prose", () => {
    const result = compareTranscriptions(
      [row({ label: "Жалобы", value: "Боль в животе, пояснице." })],
      [row({ label: "Жалобы", value: "Боль в животе ,пояснице" })]
    );

    expect(result).toMatchObject({ agreed: [{ value: "Боль в животе, пояснице." }], disputed: [] });
  });

  it("preserves clinically meaningful operators while normalising prose punctuation", () => {
    const result = compareTranscriptions(
      [row({ label: "Результат", value: "< 5.0" })],
      [row({ label: "Результат", value: "> 5.0" })]
    );

    expect(result.agreed).toEqual([]);
    expect(result.disputed).toMatchObject([{ reason: "разные значения" }]);
  });

  it("parses the explicit structured row state", () => {
    const [parsed] = parseTranscription(
      "form.jpg :: УЗИ :: контур :: ровный, неровный :: - :: UNSELECTED_TEMPLATE :: ДА :: печатные варианты"
    );
    expect(parsed.rowState).toBe("UNSELECTED_TEMPLATE");
    expect(parsed.confident).toBe(true);
    expect(parsed.reference).toBe("-");
  });

  it("reassembles explicit result, unit and reference fragments before comparison", () => {
    const first = [
      row({ section: "ОАК", label: "Гемоглобин (HGB)", value: "134", reference: "" }),
      row({ section: "ОАК", label: "Гемоглобин (HGB) ед.изм.", value: "г/л", reference: "" }),
      row({ section: "ОАК", label: "Гемоглобин (HGB) референс", value: "117 - 160", reference: "" }),
    ];
    const second = [row({ section: "ОАК", label: "Гемоглобин (HGB)", value: "134 г/л", reference: "117–160" })];

    const result = compareTranscriptions(first, second);
    expect(result.disputed).toHaveLength(0);
    expect(result.agreed[0]).toMatchObject({ value: "134 г/л", reference: "117 - 160", referenceConfirmed: true });
  });

  it("reassembles bilingual suffixes and inline reference text", () => {
    const first = [
      row({ section: "Биохимия", label: "Трансаминаза-АЛТ", value: "18.6", reference: "" }),
      row({ section: "Биохимия", label: "Трансаминаза-АЛТ — Өлч. бирд./Ед.Изм.", value: "Ед/л", reference: "" }),
      row({ section: "Биохимия", label: "Трансаминаза-АЛТ — Ченемин көргөзгүчү/Референсные значения", value: "< 49,00", reference: "" }),
    ];
    const second = [row({ section: "Биохимия", label: "Трансаминаза-АЛТ", value: "18.6 Ед/л (Референсные значения < 49,00)", reference: "" })];

    expect(compareTranscriptions(first, second)).toMatchObject({ agreed: [{ value: "18.6 Ед/л", referenceConfirmed: true }], disputed: [] });
  });

  it("does not discard an orphan presentation fragment", () => {
    const orphan = row({ label: "Калий ед.изм.", value: "ммоль/л" });
    expect(coalesceTranscriptionFragments([orphan])).toEqual([orphan]);
  });

  it("does not promote explicitly empty form fields into clinical facts", () => {
    const emptyMarkers = ["", "не заполнено", "[не заполнено]", "(нет записи)", "(нет значения)", "(пусто)", "не вписано"];

    for (const value of emptyMarkers) {
      expect(coalesceTranscriptionFragments([row({ label: "Незаполненное поле", value })])).toEqual([]);
    }
  });

  it("keeps uncertain handwriting visible for review", () => {
    const uncertain = row({ label: "Рукописная пометка", value: "[не разобрано]", confident: false });
    expect(coalesceTranscriptionFragments([uncertain])).toEqual([uncertain]);
  });

  it("does not verify an untouched list of mutually exclusive form options", () => {
    const first = row({ label: "Эхоструктура", value: "однородная, неоднородная (диффузно, очагово)", confident: true });
    const second = row({ label: "Эхоструктура", value: "однородная, неоднородная (диффузно, очагово)", confident: true });

    const result = compareTranscriptions([first], [second]);
    expect(result.agreed).toEqual([]);
    expect(result.disputed).toMatchObject([{ reason: "чтение неуверенное" }]);
  });

  it("keeps one explicitly selected form option eligible for agreement", () => {
    const first = row({ label: "Эхоструктура", value: "однородная (подчёркнуто)", confident: true });
    const second = row({ label: "Эхоструктура", value: "однородная (подчёркнуто)", confident: true });

    expect(compareTranscriptions([first], [second])).toMatchObject({ agreed: [{ value: "однородная (подчёркнуто)" }], disputed: [] });
  });

  it("never promotes matching handwriting from a partially visible source", () => {
    const coverage = row({
      section: "[КОНТРОЛЬ ИСТОЧНИКА]",
      label: "[ПОКРЫТИЕ ДОКУМЕНТА]",
      value: "PARTIAL",
      confident: false,
      note: "нижняя часть закрыта серым полем",
    });
    const handwriting = row({ section: "Заключение", label: "Рукописная строка", value: "Копростаз" });

    const result = compareTranscriptions([coverage, handwriting], [coverage, handwriting]);
    expect(result.agreed).toEqual([]);
    expect(result.disputed).toMatchObject([{ label: "Рукописная строка", reason: "источник виден не полностью" }]);
  });

  it("keeps matching handwriting eligible when both readings saw the complete source", () => {
    const coverage = row({ section: "[КОНТРОЛЬ ИСТОЧНИКА]", label: "[ПОКРЫТИЕ ДОКУМЕНТА]", value: "COMPLETE" });
    const handwriting = row({ section: "Заключение", label: "Рукописная строка", value: "Копростаз" });

    expect(compareTranscriptions([coverage, handwriting], [coverage, handwriting]))
      .toMatchObject({ agreed: [{ label: "Рукописная строка", value: "Копростаз" }], disputed: [] });
  });

  it("matches a unique exact label when readers name its section differently", () => {
    const result = compareTranscriptions(
      [row({ section: "Общий анализ крови", label: "HGB [g/L]", value: "137" })],
      [row({ section: "Гематология", label: "HGB [g/L]", value: "137" })],
    );
    expect(result).toMatchObject({ agreed: [{ value: "137" }], disputed: [] });
  });

  it("matches a unique label with one OCR character error inside the same section", () => {
    const result = compareTranscriptions(
      [row({ section: "Общий анализ мочи", label: "Белок с пирогаллоловым красным", value: "0.08" })],
      [row({ section: "Общий анализ мочи", label: "Белок с пирогалроловым красным", value: "0.08" })]
    );
    expect(result).toMatchObject({ agreed: [{ value: "0.08" }], disputed: [] });
  });

  it("matches Cyrillic and Latin spellings of pH inside the same section", () => {
    const result = compareTranscriptions(
      [row({ section: "Общий анализ мочи", label: "рН", value: "6.0" })],
      [row({ section: "Общий анализ мочи", label: "pH", value: "6.0" })]
    );
    expect(result).toMatchObject({ agreed: [{ value: "6.0" }], disputed: [] });
  });

  it("does not fuzzy-match labels whose numeric identifiers differ", () => {
    const result = compareTranscriptions(
      [row({ section: "Исследование", label: "Образец 17", value: "норма" })],
      [row({ section: "Исследование", label: "Образец 18", value: "норма" })]
    );
    expect(result.agreed).toEqual([]);
    expect(result.disputed).toHaveLength(2);
  });

  it("does not cross-match a repeated label across different sections", () => {
    const first = [row({ section: "До", label: "Размер", value: "10" }), row({ section: "После", label: "Размер", value: "12" })];
    const second = [row({ section: "Исследование 1", label: "Размер", value: "10" }), row({ section: "Исследование 2", label: "Размер", value: "12" })];
    const result = compareTranscriptions(first, second);
    expect(result.agreed).toHaveLength(0);
    expect(result.disputed).toHaveLength(4);
  });
});

describe("whole-document content classification", () => {
  it("allows visual evidence to resolve only structured uncertain clinical rows", () => {
    const rows = [
      row({ section: "Шапка", label: "Фамилия", value: "Тест", rowState: "FILLED" }),
      row({ section: "Заключение", label: "Рукописная строка", value: "[неразборчиво]", rowState: "UNCERTAIN" }),
      row({ section: "УЗИ", label: "Размер", value: "мм", rowState: "EMPTY" }),
    ];
    expect(canResolveAsVisuallyEmpty(rows, rows)).toBe(true);
  });

  it("never lets visual evidence suppress a structured filled clinical row", () => {
    const rows = [row({ section: "УЗИ", label: "Размер", value: "94 мм", rowState: "FILLED" })];
    expect(canResolveAsVisuallyEmpty(rows, rows)).toBe(false);
  });

  it("fails closed when a historical row has no structured state", () => {
    const rows = [row({ section: "Заключение", label: "Рукописная строка", value: "[неразборчиво]" })];
    expect(canResolveAsVisuallyEmpty(rows, rows)).toBe(false);
  });

  it("uses structured states instead of wording in notes", () => {
    const rows = [
      row({ section: "УЗИ", label: "контур", value: "ровный, неровный", rowState: "UNSELECTED_TEMPLATE", note: "arbitrary provider wording" }),
      row({ section: "УЗИ", label: "размер", value: "мм", rowState: "EMPTY", note: "arbitrary provider wording" }),
    ];
    expect(classifyTranscribedDocument(rows, rows)).toBe("EMPTY_TEMPLATE");
  });

  it("does not treat filled identity metadata as clinical content when the provider uses a facility section", () => {
    const rows = [
      row({ section: "КАБИНЕТ УЛЬТРАЗВУКОВОЙ ДИАГНОСТИКИ", label: "Возраст", value: "42", rowState: "FILLED" }),
      row({ section: "КАБИНЕТ УЛЬТРАЗВУКОВОЙ ДИАГНОСТИКИ", label: "Дата (рукописная у заголовка)", value: "13.11.2024", rowState: "FILLED" }),
      row({ section: "КАБИНЕТ УЛЬТРАЗВУКОВОЙ ДИАГНОСТИКИ", label: "Ф.И.О.", value: "Тест", rowState: "FILLED" }),
      row({ section: "УЗИ", label: "Размер", value: "мм", rowState: "EMPTY" }),
    ];
    expect(classifyTranscribedDocument(rows, rows)).toBe("EMPTY_TEMPLATE");
  });

  it("keeps a structured uncertain row visible for review", () => {
    const rows = [row({ section: "Заключение", value: "[неразборчиво]", rowState: "UNCERTAIN", confident: false })];
    expect(classifyTranscribedDocument(rows, rows)).toBe("CLINICAL_CONTENT");
  });
  it("classifies an identity-only blank form as empty", () => {
    const rows = [
      row({ section: "Шапка бланка", label: "Фамилия, имя", value: "Тестовый Пациент" }),
      row({ section: "Шапка бланка", label: "Дата (рукописно)", value: "22.11.24" }),
      row({ section: "УЗИ", label: "Размер", value: "[не заполнено]" }),
      row({ section: "УЗИ", label: "Эхоструктура", value: "однородная, неоднородная" }),
    ];
    expect(classifyTranscribedDocument(rows, rows)).toBe("EMPTY_TEMPLATE");
  });

  it("keeps a filled copy of the same form clinical", () => {
    const rows = [
      row({ section: "Шапка", label: "Фамилия, имя", value: "Тестовый Пациент" }),
      row({ section: "УЗИ", label: "Размер", value: "94 мм" }),
    ];
    expect(classifyTranscribedDocument(rows, rows)).toBe("CLINICAL_CONTENT");
  });

  it("does not call uncertain visible handwriting an empty form", () => {
    const rows = [row({ section: "Заключение", label: "Рукописная запись", value: "[неразборчиво]", confident: false })];
    expect(classifyTranscribedDocument(rows, rows)).toBe("CLINICAL_CONTENT");
  });

  it("treats printed template options explicitly reported as unmarked as empty", () => {
    const first = [
      row({ section: "ПЕЧЕНЬ", label: "контур", value: "ровный, неровный, четкий, нечеткий", note: "печатный перечень вариантов, ни один не отмечен" }),
      row({ section: "СОСУДЫ", label: "воротная вена", value: "-", note: "поле не заполнено" }),
    ];
    const second = [
      row({ section: "ПЕЧЕНЬ", label: "контур", value: "ровный, неровный, четкий, нечеткий", note: "печатный шаблон, отметок нет" }),
      row({ section: "СОСУДЫ", label: "воротная вена", value: "[не заполнено] мм", note: "-" }),
      row({ section: "ПЕЧЕНЬ", label: "эхогенность", value: "средняя, повышена, понижена", note: "печатные варианты, отметка не сделана" }),
      row({ section: "Данные пациента", label: "Возраст", value: "40" }),
      row({ section: "Заголовок", label: "Дата", value: "22.11.24" }),
    ];

    expect(classifyTranscribedDocument(first, second)).toBe("EMPTY_TEMPLATE");
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

  it("requires source coverage and character-by-character handwriting review", () => {
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("[ПОКРЫТИЕ ДОКУМЕНТА]");
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("PARTIAL");
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("Читай рукопись посимвольно");
    expect(TRANSCRIPTION_SYSTEM_PROMPT).toContain("Не достраивай слово по медицинскому смыслу");
  });
});
