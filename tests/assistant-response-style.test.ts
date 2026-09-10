import { describe, expect, it, vi } from "vitest";
import { ANHAM_RESPONSE_STYLE, normalizeAnhamResponse as plain } from "@/lib/assistant/response-style";
import { CASE_REVIEW_DRAFT_MARKER, CASE_REVIEW_SUMMARY_MARKER, CASE_REVIEW_SYSTEM_PROMPT, parseCaseReview } from "@/lib/assistant/case-review";
import { SLEEP_ADVICE_SYSTEM_PROMPT } from "@/lib/sleep/prompt";

vi.mock("@/lib/assistant/knowledge", () => ({ getKnowledgeForPrompt: async () => "" }));
import { buildGuestSystemPrompt, buildRegisteredSystemPrompt, buildPaidClientSystemPrompt, buildStaffSystemPrompt } from "@/lib/assistant/prompts";

describe("Anham prose normalization", () => {
  it.each([
    ["## Что видно\n\n**Факт:** *данных мало*.\n\n### Следующий шаг ###", "Что видно\n\nФакт: данных мало.\n\nСледующий шаг"],
    ["# Data\n\n__Fact__: _uncertain_.", "Data\n\nFact: uncertain."],
    ["***Важно*** и ~~ошибка~~", "Важно и (зачёркнуто: ошибка)"],
    ["~~Take 5 mg~~", "(struck out: Take 5 mg)"],
    ["\\*\\*Факт\\*\\*", "Факт"],
    ["---\n\n***\n\n___", ""],
    ["- Первое.\n* Второе.\n+ Третье.\n• Четвёртое.\n1. Пятое.\n2) Шестое.", "Первое.\n\nВторое.\n\nТретье.\n\nЧетвёртое.\n\nПятое.\n\nШестое."],
    ["1. 3,2 ммоль/л\n2. 4.8 mmol/L", "3,2 ммоль/л\n\n4.8 mmol/L"],
    ["* 3,2 mmol/L\n• 4.8 mmol/L\n> - Review needed.", "3,2 mmol/L\n\n4.8 mmol/L\n\nReview needed."],
    ["```text\nALT < 48 U/L\n```\n\n`TSH 3,2`", "ALT < 48 U/L\n\nTSH 3,2"],
    ["~~~\nДанных нет.\n~~~", "Данных нет."],
    ["> Это наблюдение.\n\n---\n\nЭто — гипотеза.", "Это наблюдение.\n\nЭто, гипотеза."],
    ["Вывод\n====\n\nЕсть данные.", "Вывод\n\nЕсть данные."],
    ["- [x] Read source\n- [ ] Ask Karen", "Completed: Read source\n\nNot completed: Ask Karen"],
    ["- [x] Прочитать\n- [ ] Проверить", "Выполнено: Прочитать\n\nНе выполнено: Проверить"],
    ["  Спокойный текст.\r\n\r\n\r\n  Ещё абзац.  ", "Спокойный текст.\n\nЕщё абзац."]
  ])("converts %j to plain paragraphs", (input, expected) => {
    expect(plain(input)).toBe(expected);
    expect(plain(plain(input))).toBe(plain(input));
  });

  it.each([
    "−0,5; -0.5; +2; <0.01; > 5; ≤3; ≥2; ±0,2; 3–5; 3-5; 10^9/L; 5*10^9/L; 10**9/L",
    "> 5 mmol/L\n>   -0.5 mg/L\n>= 2\n< 0,01\n- 5 mmol/L\n+ 2 mg",
    "3.5 mg/L\n0.05 мг/л\n1. mg\n2026. Клиническая запись",
    "09.09.2026, 2026-09-09, 12:30; 120/80; 95%; 1:160; 37 °C; µmol/L; мкмоль/л",
    "IgG/IgM; HER2+; Ki-67; pT1N0; CD4/CD8; C++; C#; T3/T4; HLA_B27; NEEDS_REVIEW; SOURCE_ONLY",
    "**literal.pdf; report_2026.pdf; lab__final__.pdf; https://example.org/a_b?q=3.2&x=5#part_1",
    "__анализ__.pdf; кровь_2026.pdf",
    "https://example.org/русский—путь?q=**value**#lab",
    "/cabinet/records—new?value=3.2#row_1",
    "Файл №2: ALT 48 U/L. Второе чтение: ALT 43 U/L. Требует проверки."
  ])("preserves numeric, clinical and literal content: %s", (input) => {
    expect(plain(input)).toBe(input);
  });

  it("preserves numeric ranges and negative values when replacing an em dash", () => {
    expect(plain("Референс 3—5; результат —0,5; норма 4 — 8."))
      .toBe("Референс 3-5; результат −0,5; норма 4-8.");
  });

  it("retains link labels and exact balanced destinations", () => {
    const input = "**[Источник](https://example.org/a_(b)?v=3.5&u=mg%2FL#x_y)**, [кабинет](/cabinet?locale=en#files).";
    expect(plain(input)).toBe("Источник (https://example.org/a_(b)?v=3.5&u=mg%2FL#x_y), кабинет (/cabinet?locale=en#files).");
  });

  it("retains autolinks and reference links including destinations", () => {
    const output = plain("[Source][lab]\n\n[lab]: https://example.org/a_b#c\n\n<https://example.org/second?q=1>");
    expect(output).toContain("Source (https://example.org/a_b#c)");
    expect(output).toContain("https://example.org/second?q=1");
    expect(output).not.toContain("][");
  });

  it("keeps table column associations, comparators, blank cells and all rows", () => {
    const input = "| Test | Result | Reference |\n| --- | ---: | :--- |\n| TSH | **3,2** mIU/L | 0.4–4.0 |\n| CRP | <5 mg/L | |";
    expect(plain(input)).toBe("Test: TSH; Result: 3,2 mIU/L; Reference: 0.4–4.0\n\nTest: CRP; Result: <5 mg/L; Reference:");
  });

  it("does not discard a mismatched or non-Markdown table row", () => {
    expect(plain("A | B\n--- | ---\nx | y | z")).toContain("x; y; z");
    expect(plain("a | b")).toBe("a | b");
  });

  it("preserves literal pipes and filenames inside tables", () => {
    const input = "File | Note\n--- | ---\nlab__final__.pdf | `a|b`";
    expect(plain(input)).toBe("File: lab__final__.pdf; Note: a|b");
  });

  it("normalizes em dashes inside table cells without losing values", () => {
    expect(plain("Test | Range\n--- | ---\nTSH | 3—5\nCRP | **<5** — source only"))
      .toBe("Test: TSH; Range: 3-5\n\nTest: CRP; Range: <5, source only");
  });

  it("does not truncate long analytical output or change uncertainty", () => {
    const input = "В документе указано 3,2 мМЕ/л. Гипотеза требует проверки Karen.\n\n".repeat(400).trim();
    expect(plain(input)).toBe(input);
  });

  it("handles placeholders from untrusted input without collision", () => {
    expect(plain("\uE0000\uE001 **Факт** https://example.org")).toBe("\uE0000\uE001 Факт https://example.org");
  });
});

describe("style is shared without merging roles", () => {
  const builders: Array<[string, () => string | Promise<string>]> = [
    ["guest", () => buildGuestSystemPrompt()],
    ["registered", () => buildRegisteredSystemPrompt("context")],
    ["paid", () => buildPaidClientSystemPrompt("context")],
    ["Anna", () => buildStaffSystemPrompt("founder")],
    ["Karen", () => buildStaffSystemPrompt("karen")],
    ["case review", () => CASE_REVIEW_SYSTEM_PROMPT],
    ["sleep", () => SLEEP_ADVICE_SYSTEM_PROMPT]
  ];
  it.each(builders)("includes the central bilingual rule for %s", async (_role, build) => {
    const prompt = await build();
    expect(prompt).toContain(ANHAM_RESPONSE_STYLE);
    expect(prompt).toContain("short paragraphs");
    expect(prompt).toContain("короткими абзацами");
    expect(prompt).toContain("Style does not change medical boundaries");
  });

  it("parses machine separators before normalizing both visible review fields", () => {
    const input = `${CASE_REVIEW_DRAFT_MARKER}\n## Hello\n**TSH** 3,2 mIU/L.\n${CASE_REVIEW_SUMMARY_MARKER}\n- File №2: **3,2** or **8,2** mIU/L. Needs review.`;
    expect(parseCaseReview(input)).toEqual({ status: "ok", parts: {
      draft: "Hello\nTSH 3,2 mIU/L.", summary: "File №2: 3,2 or 8,2 mIU/L. Needs review."
    } });
  });
});
