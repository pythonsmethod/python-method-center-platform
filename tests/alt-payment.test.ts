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

// What must never appear on a public page again. Requisites for a transfer
// or a wallet address are country-specific, and a US company has to know
// who it is taking money from — neither of which a published list can do.
const NEVER_PUBLISHED = {
  ru: ["USDT", "TRC", "IBAN", "SWIFT", "кошел", "реквизиты для оплаты"],
  en: ["USDT", "TRC", "IBAN", "SWIFT", "wallet address"]
} as const;

describe.each(["ru", "en"] as const)("the alternative payment page in %s", (locale) => {
  const t = getDictionary(locale).altPayment;

  it("still lets a person say how they would rather pay", () => {
    // The form asks; the site does not offer. That difference is the whole
    // policy: it is their preference, not our published price list.
    for (const id of METHOD_IDS) {
      expect(t.methodLabels[id].length).toBeGreaterThan(0);
    }
  });

  it("publishes no payment details of any kind", () => {
    const page = Object.values(t)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string")
      .join("\n");

    for (const forbidden of NEVER_PUBLISHED[locale]) {
      expect(page, `must not be published: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("says outright that the site takes cards and nothing else", () => {
    const expected =
      locale === "ru" ? "оплату картой" : "we take card payments";

    expect(t.officialTitle.toLowerCase()).toContain(expected.toLowerCase());
  });

  it("promises the plan is opened after payment, not left to the client", () => {
    const expected =
      locale === "ru" ? "откроем вам тариф" : "we open your plan";

    expect(t.officialText).toContain(expected);
  });

  it("tells the person it is not their fault", () => {
    const expected = locale === "ru" ? "Дело не в вас" : "It is not you";

    expect(t.blockedTitle).toContain(expected);
  });

  it("offers routes that actually work, not sympathy", () => {
    // Each has to be something a person can go and do today. A page that
    // only says "sorry" costs us the sale and the client.
    //
    // Both published routes are card payments through Stripe — which is
    // exactly why they can be published at all.
    expect(t.blockedItems.length).toBeGreaterThanOrEqual(3);

    const routes = t.blockedItems.join("\n").toLowerCase();

    expect(routes).toContain(locale === "ru" ? "карта другой страны" : "another country");
    expect(routes).toContain(locale === "ru" ? "близкого человека" : "someone close to you");
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

  it("advertises no method the site does not actually run", () => {
    // Officially the site takes cards. Naming a transfer or a wallet here
    // would promise a checkout that does not exist.
    for (const phrase of ["криптовалют", "перевод"]) {
      expect(getDictionary("ru").payment.altText).not.toContain(phrase);
    }

    for (const phrase of ["cryptocurrency", "a transfer"]) {
      expect(getDictionary("en").payment.altText.toLowerCase()).not.toContain(phrase);
    }
  });
});
