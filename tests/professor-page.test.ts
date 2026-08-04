import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";

// A page about a real person, on a platform about health.
//
// Everything factual on it comes from clause 2 of the offer — the document
// the client accepts — and from nowhere else. No education, no titles, no
// count of people helped: invented credentials on a health platform are
// both a deception and a liability, and they are impossible to walk back
// once a client has read them.
//
// The other line these tests hold is the one the whole platform rests on:
// the contract calls him a specialist in the recovery of the body, not a
// physician. A page about him is exactly where someone decides what he is,
// so it must not drift into implying a medical qualification.

const CLAIMS_A_DOCTOR = [
  "врач",
  "доктор",
  "медицинское образование",
  "клиническ",
  "диагноз",
  "лечени",
  "пациент"
];

describe.each(["ru", "en"] as const)("the professor page in %s", (locale) => {
  const t = getDictionary(locale).professor;
  const text = Object.values(t).join("\n");

  it("says plainly that he is not a physician", () => {
    const expected = locale === "ru" ? "Он не врач" : "He is not a physician";

    expect(t.boundaryText).toContain(expected);
  });

  it("does not present him as medical staff", () => {
    if (locale !== "ru") {
      return;
    }

    // Only inside the boundary paragraph, where the words appear in order
    // to deny them, is any of this allowed.
    const withoutBoundary = Object.entries(t)
      .filter(([key]) => key !== "boundaryText")
      .map(([, value]) => value)
      .join("\n")
      .toLowerCase();

    for (const claim of CLAIMS_A_DOCTOR) {
      expect(withoutBoundary).not.toContain(claim);
    }
  });

  it("claims no credential the contract does not", () => {
    for (const invented of [
      "диплом",
      "степень",
      "сертифиц",
      "университет",
      "degree",
      "certified",
      "university",
      "PhD"
    ]) {
      expect(text.toLowerCase()).not.toContain(invented.toLowerCase());
    }
  });

  it("carries no number the contract has not already stated", () => {
    // Thirty years is in clause 2. Anything else numeric — people helped,
    // success rates — would be invented.
    const numbers = text.match(/\d+/g) ?? [];
    const allowed = new Set(["30", "1331", "5", "90025"]);

    for (const number of numbers) {
      expect(allowed.has(number)).toBe(true);
    }
  });
});

describe("what the page states matches the contract", () => {
  const clause = OFFER_CONTENT.ru.sections
    .flatMap((section) => section.paragraphs ?? [])
    .join("\n");

  it("takes the thirty years from clause 2", () => {
    expect(clause).toContain("тридцатилетней практикой");
    expect(getDictionary("ru").professor.yearsValue).toBe("30 лет");
  });

  it("takes the company and address from clause 2", () => {
    expect(clause).toContain("Pythons & Co");
    expect(clause).toContain("1331 Amherst Ave");

    for (const locale of ["ru", "en"] as const) {
      expect(getDictionary(locale).professor.companyText).toContain("Pythons & Co");
      expect(getDictionary(locale).professor.companyText).toContain("1331 Amherst Ave");
    }
  });

  it("uses the name the contract gives him", () => {
    expect(clause).toContain("Карен, в дальнейшем именуемый Professor Python");
    expect(getDictionary("ru").professor.subtitle).toContain("Карен");
  });
});
