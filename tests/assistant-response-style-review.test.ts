import { describe, expect, it } from "vitest";
import { normalizeAnhamResponse as plain } from "@/lib/assistant/response-style";

describe("review regressions: clinical signs are not presentation markers", () => {
  for (const space of ["\u00a0", "\u202f", "\u2009"]) {
    it.each(["-", "+", ">"])("preserves %s with Unicode spacing " + space.codePointAt(0)?.toString(16), (sign) => {
      for (const number of [".5", ",5", "5*10^9"]) {
        const source = `${sign} ${space}${number} mg/L`;
        for (const locale of ["ru", "en"] as const) {
          expect(plain(source, locale)).toBe(source);
          expect(plain(plain(source, locale), locale)).toBe(source);
        }
      }
    });
    it("preserves unit-bearing numeric lines with Unicode spacing " + space.codePointAt(0)?.toString(16), () => {
      const source = `1. ${space}µg/L`;
      expect(plain(source)).toBe(source);
    });
  }

  it.each([
    "- .5 mg/L", "+ ,5 мг/л", "> .5 mg/L", "> -.5 mg/L",
    "> ±0.2", "> ≥5", "- ≥5 mg/L", "1. µg/L", "2. U/L", "3. mIU/L",
    "4. ng", "5. μmol/L", ",5 mg/L", "Результат: ,5 мг/л",
    "> 5*10^9/L", "- 5*10^9/L", "+ 2*10**3/mL"
  ])("preserves %s across response, save and read normalization", (source) => {
    expect(plain(source)).toBe(source);
    expect(plain(plain(source))).toBe(source);
  });

  it("keeps a leading-decimal negative sign when replacing an em dash", () => {
    expect(plain("—.5 mg/L; —,5 мг/л")).toBe("−.5 mg/L; −,5 мг/л");
  });

  it.each([
    ["ru", "(зачёркнуто: 5 mg)\nВыполнено: TSH"],
    ["en", "(struck out: 5 mg)\nCompleted: TSH"]
  ] as const)("uses the %s locale for numeric-only annotations", (locale, expected) => {
    expect(plain("~~5 mg~~\n[x] TSH", locale)).toBe(expected);
  });

  it("still removes unambiguous prose lists and quotes", () => {
    expect(plain("1. Review the source.\n2. Ask Karen.\n> Needs review."))
      .toBe("Review the source.\n\nAsk Karen.\nNeeds review.");
  });
});
