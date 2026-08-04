import { describe, expect, it } from "vitest";
import { buildGuestSystemPrompt } from "@/lib/assistant/prompts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";

// What the free format actually is, pinned in one place.
//
// The contract calls it "предварительная аналитика ресурсного состояния":
// Professor Python forms a preliminary assessment of where the person's
// state stands. The site had drifted away from that in two directions at
// once — the Russian copy sold it as a way to "decide whether you need the
// support programme", which turns an assessment into a sales step, and the
// English copy promised "recommendations on restoring your markers", which
// the contract puts in the paid formats only.
//
// Both are the same failure: the site describing the product differently
// from the document the client accepts. These tests hold the two together.

function freeReviewCopy(locale: "ru" | "en"): string {
  const d = getDictionary(locale);

  return [
    d.promo.titleFree,
    d.promo.textFree,
    d.promo.note,
    ...d.promoDetails.items.map((item) => `${item.q} ${item.a}`)
  ].join("\n");
}

describe("what the free format is described as", () => {
  it("says it is an assessment of the person's current state", () => {
    expect(freeReviewCopy("ru")).toContain("показателями вашего организма");
    expect(freeReviewCopy("ru")).toContain("где вы находитесь сейчас");
    expect(freeReviewCopy("en")).toContain("body's markers");
    expect(freeReviewCopy("en")).toContain("where you stand today");
  });

  it("does not sell it as a way to decide whether to buy the programme", () => {
    // An assessment of someone's health is not a step in a funnel, and
    // saying it is invites the reader to distrust the answer they get.
    for (const phrase of [
      "нужно ли вам сопровождение",
      "нужно ли сопровождение",
      "понять направление"
    ]) {
      expect(freeReviewCopy("ru")).not.toContain(phrase);
    }

    for (const phrase of ["whether you need", "understand the direction"]) {
      expect(freeReviewCopy("en")).not.toContain(phrase);
    }
  });

  it("never promises recommendations for free, in either language", () => {
    // Clause 3 of the offer keeps the full review and its recommendations
    // in the paid formats. Promising them free promises more than the
    // contract gives.
    expect(freeReviewCopy("ru")).toContain(
      "рекомендациями по восстановлению входит в платные форматы"
    );
    expect(freeReviewCopy("en")).toContain(
      "recommendations for recovery is part of the paid formats"
    );
    expect(freeReviewCopy("en")).not.toContain(
      "recommendations on restoring your markers"
    );
  });

  it("still keeps the boundary: an expert opinion, not a diagnosis", () => {
    expect(getDictionary("ru").promo.note).toContain("не заменяет консультацию врача");
    expect(getDictionary("en").promo.note.toLowerCase()).toContain("doctor");
  });

  it("matches the name the contract gives the service", () => {
    const clause = OFFER_CONTENT.ru.sections
      .flatMap((section) => section.paragraphs ?? [])
      .join("\n");

    expect(clause).toContain("Предварительная аналитика ресурсного состояния");
    expect(freeReviewCopy("ru")).toContain("аналитика вашего ресурсного состояния");
  });
});

describe("the assistant tells visitors the same thing", () => {
  it("describes the free format by the person's state, not by the sale", () => {
    // A visitor who asks the assistant must hear what the page says. A
    // difference between the two is exactly what reads as a catch.
    return buildGuestSystemPrompt().then((prompt) => {
      expect(prompt).toContain("показателями его организма");
      expect(prompt).not.toContain(
        "помогающая понять направление и решить, нужно ли сопровождение"
      );
      expect(prompt).toContain("НЕ рекомендации по восстановлению");
    });
  });
});
