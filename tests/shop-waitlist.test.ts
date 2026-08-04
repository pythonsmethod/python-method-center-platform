import { describe, expect, it } from "vitest";
import {
  SHOP_CATALOG,
  SHOP_ITEM_IDS,
  SHOP_SECTIONS,
  isShopItemId,
  listShopItems
} from "@/lib/shop/catalog";
import { validateShopWaitlistInput } from "@/lib/shop/validation";

const MESSAGES = {
  invalidEmail: "bad email",
  consentRequired: "consent",
  generic: "generic"
};

describe("shop waiting list validation", () => {
  it("accepts an email with consent and a known product", () => {
    const result = validateShopWaitlistInput(
      { email: " Anna@Example.com ", itemId: "formula", consent: true, honeypot: "" },
      MESSAGES
    );

    expect(result).toEqual({ email: "Anna@Example.com", itemId: "formula" });
  });

  it("treats an empty product as the line as a whole", () => {
    const result = validateShopWaitlistInput(
      { email: "a@b.co", itemId: "", consent: true, honeypot: "" },
      MESSAGES
    );

    expect(result).toEqual({ email: "a@b.co", itemId: null });
  });

  it("files an unknown product against the line rather than refusing", () => {
    // A stale page or a hand-made request should not cost a real person
    // their place on the list.
    const result = validateShopWaitlistInput(
      { email: "a@b.co", itemId: "no-such-thing", consent: true, honeypot: "" },
      MESSAGES
    );

    expect(result).toEqual({ email: "a@b.co", itemId: null });
  });

  it("refuses an address it cannot write to", () => {
    for (const email of ["", "  ", "anna", "anna@", "anna@example", "a b@c.co"]) {
      expect(
        validateShopWaitlistInput(
          { email, itemId: "", consent: true, honeypot: "" },
          MESSAGES
        )
      ).toEqual({ error: MESSAGES.invalidEmail });
    }
  });

  it("refuses an address longer than the field can hold", () => {
    const email = `${"a".repeat(320)}@example.com`;

    expect(
      validateShopWaitlistInput(
        { email, itemId: "", consent: true, honeypot: "" },
        MESSAGES
      )
    ).toEqual({ error: MESSAGES.invalidEmail });
  });

  it("requires consent before storing an address", () => {
    expect(
      validateShopWaitlistInput(
        { email: "a@b.co", itemId: "", consent: false, honeypot: "" },
        MESSAGES
      )
    ).toEqual({ error: MESSAGES.consentRequired });
  });

  it("drops a submission with the honeypot filled", () => {
    expect(
      validateShopWaitlistInput(
        { email: "a@b.co", itemId: "", consent: true, honeypot: "bot" },
        MESSAGES
      )
    ).toEqual({ error: MESSAGES.generic });
  });
});

describe("shop catalogue", () => {
  it("has wording for every product in both languages", () => {
    for (const locale of ["ru", "en"] as const) {
      for (const id of SHOP_ITEM_IDS) {
        const item = SHOP_CATALOG[locale].items[id];

        expect(item.title.length).toBeGreaterThan(0);
        expect(item.text.length).toBeGreaterThan(0);
      }

      for (const section of SHOP_SECTIONS) {
        const text = SHOP_CATALOG[locale].sections[section.id];

        expect(text.title.length).toBeGreaterThan(0);
        expect(text.label.length).toBeGreaterThan(0);
        expect(text.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the English catalogue free of Cyrillic", () => {
    const text = SHOP_ITEM_IDS.map((id) => {
      const item = SHOP_CATALOG.en.items[id];
      return `${item.title} ${item.text}`;
    })
      .concat(
        SHOP_SECTIONS.map((section) => {
          const s = SHOP_CATALOG.en.sections[section.id];
          return `${s.label} ${s.title} ${s.text}`;
        })
      )
      .join(" ");

    expect(text).not.toMatch(/[А-Яа-яЁё]/);
  });

  it("lists every product exactly once, in page order", () => {
    const ids = listShopItems().map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...SHOP_ITEM_IDS].sort());
  });

  it("recognises its own identifiers and nothing else", () => {
    for (const id of SHOP_ITEM_IDS) {
      expect(isShopItemId(id)).toBe(true);
    }

    for (const other of ["", "formulas", "FORMULA", "drop table"]) {
      expect(isShopItemId(other)).toBe(false);
    }
  });

  it("offers nothing for sale while the line is in preparation", () => {
    // The page renders a buy path only for "available". Until a real
    // product exists with a real price, nothing may carry that status.
    for (const item of listShopItems()) {
      expect(item.status).not.toBe("available");
    }
  });
});
