import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

// The page someone reaches after their card has been refused.
//
// It exists because of a real payment during the focus group: a live card,
// from an Android phone, declined twice six minutes apart. The card was
// issued in a country whose cards cannot make international payments at
// all — nothing to do with the balance on it and nothing to do with us.
//
// Two things have to hold on this page, and neither is decoration.
//
// The person must be told it is not their fault. Someone refused without an
// explanation concludes the problem is them and leaves, and they were the
// most motivated visitor we had — they were reaching for a card.
//
// And every word of it must exist in both languages. The method titles used
// to be hardcoded in Russian inside the code, so an English visitor whose
// card had just failed was shown the way out in a language they might not
// read.

const METHOD_IDS = ["bank", "crypto", "paypal", "wise", "other"] as const;

describe.each(["ru", "en"] as const)("the alternative payment page in %s", (locale) => {
  const t = getDictionary(locale).altPayment;

  it("names and explains every configurable method", () => {
    for (const id of METHOD_IDS) {
      expect(t.methodLabels[id].length).toBeGreaterThan(0);
      expect(t.methodHints[id].length).toBeGreaterThan(0);
    }
  });

  it("tells the person it is not their fault", () => {
    const expected = locale === "ru" ? "Дело не в вас" : "It is not you";

    expect(t.blockedTitle).toContain(expected);
  });

  it("offers routes that actually work, not sympathy", () => {
    // Four of them, and each has to be something a person can go and do
    // today. A page that only says "sorry" costs us the sale and the client.
    expect(t.blockedItems.length).toBeGreaterThanOrEqual(3);

    const routes = t.blockedItems.join("\n").toLowerCase();

    expect(routes).toContain(locale === "ru" ? "карта другой страны" : "another country");
    expect(routes).toContain(locale === "ru" ? "родственник" : "relative");
    expect(routes).toContain("usdt");
  });

  it("keeps a way through for someone none of it fits", () => {
    // The last route must lead to a human, not to a dead end.
    const last = t.blockedItems[t.blockedItems.length - 1].toLowerCase();

    expect(last).toContain(locale === "ru" ? "напишите" : "write to us");
  });
});

describe("the warning on the payment page", () => {
  it("appears before the card is tried, not after", () => {
    // The decline happens on Stripe's page, where we cannot say anything at
    // all. So the only place this can be said is here, in advance.
    const ru = getDictionary("ru").payment;

    expect(ru.altTitle).toContain("России");
    expect(ru.altText).toContain("до того, как пробовать картой");
  });

  it("says what does work, in both languages", () => {
    expect(getDictionary("ru").payment.altText).toContain("карта другой страны");
    expect(getDictionary("en").payment.altText.toLowerCase()).toContain(
      "card from another country"
    );
  });
});
