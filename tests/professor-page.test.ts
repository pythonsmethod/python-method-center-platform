import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";

// A page about a real person, on a platform about health.
//
// Two rules hold it together. Everything about his standing comes from
// clause 2 of the offer — the document the client accepts — and from
// nowhere else: invented credentials on a health platform are both a
// deception and a liability, and they cannot be walked back once a client
// has read them.
//
// And the line the whole platform rests on: the contract calls him a
// specialist in the recovery of the body, not a physician. A page about
// him is exactly where someone decides what he is.
//
// The page now names doctors, diagnosis and treatment often — that is the
// point of it. It says the doctor diagnoses, the doctor prescribes, and he
// does the part nobody else does. So the test can no longer ban those words
// outright; it bans the sentences that would put him in the doctor's place.
//
// Claims about beating an illness are held separately, in
// tests/professor-claims.test.ts.

const PRESENTS_HIM_AS_MEDICAL = {
  ru: [
    "медицинское образование",
    "клиническ",
    "он лечит",
    "он назначает лечение",
    "назначает лечение он",
    "врач Professor Python",
    "наш врач",
    "медицинская услуга",
    "медицинское учреждение"
  ],
  en: [
    "medical degree",
    "medical education",
    "clinical",
    "he treats",
    "he prescribes treatment",
    // Leading space on purpose: "your doctor" ends in "our doctor", and the
    // page says "your doctor" repeatedly — which is the correct thing for
    // it to say.
    " our doctor",
    "medical service"
  ]
} as const;

function flatten(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flatten);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(flatten);
  }

  return [];
}

describe.each(["ru", "en"] as const)("the professor page in %s", (locale) => {
  const t = getDictionary(locale).professor;
  const text = flatten(t).join("\n");

  it("says plainly that he is not a physician", () => {
    const expected = locale === "ru" ? "Он не врач" : "He is not a physician";

    expect(t.boundaryText).toContain(expected);
  });

  it("still tells someone in an emergency where to go", () => {
    const expected =
      locale === "ru" ? "экстренной помощи" : "emergency service";

    expect(t.boundaryText).toContain(expected);
  });

  it("never puts him in the doctor's place", () => {
    // The boundary paragraph is where "medical institution" and "medical
    // service" appear in order to be denied, so it is excluded.
    const withoutBoundary = Object.entries(t)
      .filter(([key]) => key !== "boundaryText")
      .flatMap(([, value]) => flatten(value))
      .join("\n")
      .toLowerCase();

    for (const claim of PRESENTS_HIM_AS_MEDICAL[locale]) {
      expect(withoutBoundary, `reads as a medical claim: "${claim}"`).not.toContain(
        claim.toLowerCase()
      );
    }
  });

  it("claims no credential the contract does not", () => {
    for (const invented of [
      "диплом",
      "степень",
      "сертифиц",
      "профессор медицин",
      "degree",
      "certified",
      "PhD"
    ]) {
      expect(text.toLowerCase()).not.toContain(invented.toLowerCase());
    }
  });

  it("states openly that the title is not a title", () => {
    // He is called Professor by the people he worked with. The block that
    // explained where the name came from is gone with the rest of his
    // biography, so this sentence now carries that job alone — and it has
    // to stay: a reader who works the nickname out for themselves feels
    // they were being fooled.
    const expected =
      locale === "ru" ? "не медицинское звание" : "not a medical title";

    expect(t.nicknameNote).toContain(expected);
  });

  it("tells nothing of his private life beyond his mother", () => {
    // He asked for this. The page used to carry his school years, the
    // illness he had, his sport, his injuries and his medals; all of it is
    // gone, and the reason the method exists — his mother — stays.
    const personal =
      locale === "ru"
        ? ["гепатит", "чемпион", "школ", "класс", "штанг", "медал", "травм"]
        : ["hepatitis", "champion", "school", "barbell", "medal", "injur"];

    for (const word of personal) {
      expect(text.toLowerCase(), `private life back on the page: "${word}"`).not.toContain(
        word
      );
    }

    const mother = locale === "ru" ? "мам" : "mother";

    expect(text.toLowerCase()).toContain(mother);
  });

  it("carries no number the contract has not already stated", () => {
    // 30 years and 36 countries are both in the offer. 2024 is the year his
    // mother fell ill, in his own words. The rest are the postal address.
    //
    // Anything else numeric — people helped, countries, success rates,
    // percentages — would be invented, and on this page an invented number
    // is a claim.
    const numbers = text.match(/\d+/g) ?? [];
    const allowed = new Set(["30", "36", "2024", "1331", "5", "90025"]);

    for (const number of numbers) {
      expect(allowed.has(number), `unexplained number on the page: ${number}`).toBe(
        true
      );
    }
  });
});

describe("the boundary paragraph is still printed", () => {
  it("is rendered by the page, not merely present in the dictionary", () => {
    // It used to sit under the list of what he will not do. That list is
    // gone by the founder's call, and the paragraph came within one line of
    // going with it: without it the page reads as a medical service and
    // says nowhere what to do in an emergency. A dictionary entry nobody
    // renders would pass every other test in this file.
    const page = readFileSync(
      join(process.cwd(), "app/(public)/professor/page.tsx"),
      "utf8"
    );

    expect(page).toContain("t.boundaryText");
  });
});

describe("the mother photo is not published", () => {
  it("does not render the private photograph or its caption", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(public)/professor/page.tsx"),
      "utf8"
    );

    expect(page).not.toContain("MOTHER_IMAGE");
    expect(page).not.toContain("t.origin.photoAlt");
    expect(page).not.toContain("t.origin.photoCaption");
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

  it("takes the 36 countries from clause 1", () => {
    expect(clause).toContain("в 36 странах");
    expect(getDictionary("ru").professor.lead).toContain("36 странах");
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
    // A nickname with no real name behind it reads as a persona nobody is
    // answerable for. The contract names him; so does the page.
    expect(clause).toContain("Карен, в дальнейшем именуемый Professor Python");
    expect(getDictionary("ru").professor.fullName).toContain("Карен");
    expect(getDictionary("en").professor.fullName).toContain("Karen");
  });
});
