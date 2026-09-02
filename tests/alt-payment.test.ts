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

const METHOD_IDS = ["bank", "crypto", "wise", "other"] as const;

// What must never appear on a public page again. Requisites for a transfer
// or a wallet address are country-specific, and a US company has to know
// who it is taking money from — neither of which a published list can do.
const NEVER_PUBLISHED = {
  ru: ["USDT", "TRC", "IBAN", "SWIFT", "кошел", "реквизиты для оплаты"],
  en: ["USDT", "TRC", "IBAN", "SWIFT", "wallet address"]
} as const;

// No country is named on either page, in either language.
//
// The founder's call, and it holds up on its own: a person whose card was
// refused already knows where they live, and a list of countries printed on
// a payment page reads as "you are not our client". It is also a list that
// goes out of date by itself — the Russian text still said "since 2022",
// which nobody was ever going to come back and revise.
//
// What must survive without it: that it is not their fault, and a route to
// a human who will find them a way to pay.
const COUNTRIES = [
  "росси",
  "беларус",
  "казахстан",
  "армени",
  "грузи",
  "кыргыз",
  "оаэ",
  "украин",
  "russia",
  "belarus",
  "kazakhstan",
  "armenia",
  "georgia",
  "kyrgyz",
  "uae",
  "ukraine"
];

describe.each(["ru", "en"] as const)("naming no country in %s", (locale) => {
  it("keeps both payment pages free of a country list", () => {
    const dictionary = getDictionary(locale);
    const collect = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : Array.isArray(value)
          ? value.flatMap(collect)
          : value && typeof value === "object"
            ? Object.values(value).flatMap(collect)
            : [];

    const alt = { ...dictionary.altPayment } as Record<string, unknown>;

    // The one exception, and it is the opposite case: this is the example
    // of what to type into "your country", not a country whose cards fail.
    delete alt.countryPlaceholder;

    const text = [...collect(alt), ...collect(dictionary.payment)]
      .join("\n")
      .toLowerCase();

    for (const country of COUNTRIES) {
      expect(text, `a country is named on a payment page: "${country}"`).not.toContain(
        country
      );
    }
  });

  it("still says whose fault it is not", () => {
    const t = getDictionary(locale).altPayment;
    const expected = locale === "ru" ? "не связано ни с вашим счётом" : "nothing to do with your balance";

    expect(t.blockedText).toContain(expected);
  });
});

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

    expect(ru.altTitle.toLowerCase()).toContain("не проходит");
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
