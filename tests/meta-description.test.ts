import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

// The one sentence a stranger reads in a search result before deciding
// whether this site is worth a click. It used to describe the software —
// questionnaire, documents, payment — which is what the platform *has*,
// not what a person comes here for.
//
// Two things must stay true of it:
//
//  1. It says who does the work. "Professor Python reviews your analyses
//     himself" is the whole offer; an AI assistant beside you every day is
//     the second half. A description that names neither sells nothing.
//
//  2. It fits. Google cuts the description at roughly 155-160 characters,
//     and the promo sentence is appended last — so if the base line grows,
//     the word that gets cut off is "бесплатно". That is exactly the word
//     worth the click, which is why the length is pinned by a test and not
//     by good intentions.

const LOCALES = ["ru", "en"] as const;

// Deliberately below Google's ~160 so the appended promo line survives.
const MAX_LENGTH = 155;

describe("the site description in search results", () => {
  it("names the person doing the work", () => {
    for (const locale of LOCALES) {
      expect(getDictionary(locale).meta.description).toContain("Professor Python");
    }
  });

  it("mentions the assistant that is there between reviews", () => {
    expect(getDictionary("ru").meta.description).toContain("ИИ-помощник");
    expect(getDictionary("en").meta.description).toContain("AI assistant");
  });

  it("does not describe the software instead of the offer", () => {
    // The old line, kept here so it cannot quietly come back.
    for (const phrase of ["анкета", "Клиентская платформа"]) {
      expect(getDictionary("ru").meta.description).not.toContain(phrase);
    }

    for (const phrase of ["questionnaire", "client platform"]) {
      expect(getDictionary("en").meta.description).not.toContain(phrase);
    }
  });


});

describe("meta description length", () => {
  it("fits in a search result", () => {
    for (const locale of LOCALES) {
      expect(getDictionary(locale).meta.description.length).toBeLessThanOrEqual(MAX_LENGTH);
    }
  });
});
