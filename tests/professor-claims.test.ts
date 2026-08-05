import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

// The line that must not be crossed on the page about Professor Python.
//
// The page tells a true and heavy story: his mother fell ill at stage four
// in 2024, he was beside her, and since then he has worked almost entirely
// with people at a severe stage of cancer. All of that is biography, and
// biography is safe to publish.
//
// What is not safe — and is therefore forbidden here — is any statement
// that the method acted on the disease: that people "beat the diagnosis",
// that a doctor "confirmed" the recovery, that oncologists were astonished,
// that anyone went into remission. Three separate reasons, any one of them
// sufficient:
//
//   1. A person reading it may postpone the treatment keeping them alive.
//      That is the only consequence here that cannot be undone.
//   2. California Health & Safety Code 1701.1 makes it an offence to
//      advertise anything as a treatment or cure for cancer without
//      approval, and the contract puts this business under California law.
//      The FTC's health-claim rules require competent and reliable
//      scientific evidence, and testimonials — including a doctor's — are
//      not evidence and are not fixed by a disclaimer. The same site sells
//      supplements, and a disease claim turns those into unapproved drugs.
//   3. Both payment processors prohibit unsubstantiated health claims
//      outright. A frozen account holds the money for months, and the
//      centre stops being able to help anyone at all.
//
// The temptation to add one of these sentences will return — they are the
// most persuasive sentences available, which is exactly why they are
// forbidden. This test is what stands in the way at that moment.

// Matched against the whole professor section, case-insensitively. Stems,
// not whole words, so a different ending does not slip through.
const FORBIDDEN = {
  ru: [
    // The outcome itself, in every form it tends to be written.
    "победил онколог",
    "победили онколог",
    "победить онколог",
    "победила онколог",
    "победить рак",
    "победил рак",
    "справились с диагноз",
    "справилась с диагноз",
    "справиться с диагноз",
    "ремисси",
    "вылечил",
    "вылечен",
    "излечен",
    "исцелен",
    "выздоровел",
    "спас жизн",
    "спасённых",
    // Someone else vouching for the outcome.
    "врачи подтвер",
    "врачи поража",
    "врачи в шоке",
    "онкологи поража",
    "онкологи подтвер",
    "подтвердили результат",
    // A promise about what the reader will get.
    "гарантиру",
    "гарантия",
    "мы вылечим",
    "вы победите"
  ],
  en: [
    "beat cancer",
    "beat the diagnosis",
    "defeated cancer",
    "cured",
    "cure for",
    "remission",
    "healed",
    "saved lives",
    "doctors confirmed",
    "doctors were astonished",
    "oncologists were astonished",
    "oncologists confirmed",
    "guarantee",
    "we will cure",
    "you will beat"
  ]
} as const;

// Everything in the section, however deeply nested, as one lowercased blob.
function sectionText(locale: "ru" | "en"): string {
  const flatten = (value: unknown): string[] => {
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
  };

  return flatten(getDictionary(locale).professor).join("\n").toLowerCase();
}

describe.each(["ru", "en"] as const)("the professor page in %s", (locale) => {
  it("never claims the method acted on anyone's disease", () => {
    const text = sectionText(locale);

    for (const phrase of FORBIDDEN[locale]) {
      expect(text, `forbidden claim on the professor page: "${phrase}"`).not.toContain(
        phrase.toLowerCase()
      );
    }
  });

  it("tells the reader to continue their treatment", () => {
    // The counterweight. A page that talks about people in a severe state
    // and does not say this is the dangerous version of the same page.
    const t = getDictionary(locale).professor;
    const expected =
      locale === "ru"
        ? "Если вы проходите лечение — продолжайте его."
        : "If you are in treatment, please continue it.";

    expect(t.work.warning).toContain(expected);
  });

  it("says he works alongside doctors, not instead of them", () => {
    const t = getDictionary(locale).professor;
    const expected =
      locale === "ru" ? "рядом с вашими врачами, а не вместо них" : "not instead of them";

    expect(t.work.warning).toContain(expected);
  });

  it("keeps his own boundary as the heading of that block", () => {
    // "I do not treat. I restore." — his sentence, not a legal disclaimer
    // written for him. It sits in a heading because that is where it is
    // read.
    const t = getDictionary(locale).professor;
    const expected = locale === "ru" ? "Я не лечу" : "I do not treat";

    expect(t.work.title).toContain(expected);
  });

  it("names no client, in any form", () => {
    // Real people's names appear in what Karen recorded. Publishing them
    // would be someone else's medical data on a marketing page — a wrong
    // done to them personally, on top of being an outcome claim.
    const text = sectionText(locale);

    for (const name of ["ирин", "денис", "irina", "denis"]) {
      expect(text).not.toContain(name);
    }
  });
});
