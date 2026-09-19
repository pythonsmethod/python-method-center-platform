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
  it("accepts an email with consent and a current shop product", () => {
    const result = validateShopWaitlistInput(
      { email: " Anna@Example.com ", itemId: "cream", consent: true, honeypot: "" },
      MESSAGES
    );
    expect(result).toEqual({ email: "Anna@Example.com", itemId: "cream" });
  });

  it("does not create new formula-shop demand because the formula is gift-only", () => {
    const result = validateShopWaitlistInput(
      { email: "a@b.co", itemId: "formula", consent: true, honeypot: "" },
      MESSAGES
    );
    expect(result).toEqual({ email: "a@b.co", itemId: null });
    expect(SHOP_ITEM_IDS).not.toContain("formula");
  });

  it("treats an empty or unknown product as the line as a whole", () => {
    expect(
      validateShopWaitlistInput(
        { email: "a@b.co", itemId: "", consent: true, honeypot: "" },
        MESSAGES
      )
    ).toEqual({ email: "a@b.co", itemId: null });
    expect(
      validateShopWaitlistInput(
        { email: "a@b.co", itemId: "no-such-thing", consent: true, honeypot: "" },
        MESSAGES
      )
    ).toEqual({ email: "a@b.co", itemId: null });
  });

  it("validates address, consent and honeypot", () => {
    for (const email of ["", "  ", "anna", "anna@", "anna@example", "a b@c.co"]) {
      expect(
        validateShopWaitlistInput(
          { email, itemId: "", consent: true, honeypot: "" },
          MESSAGES
        )
      ).toEqual({ error: MESSAGES.invalidEmail });
    }
    expect(
      validateShopWaitlistInput(
        { email: "a@b.co", itemId: "", consent: false, honeypot: "" },
        MESSAGES
      )
    ).toEqual({ error: MESSAGES.consentRequired });
    expect(
      validateShopWaitlistInput(
        { email: "a@b.co", itemId: "", consent: true, honeypot: "bot" },
        MESSAGES
      )
    ).toEqual({ error: MESSAGES.generic });
  });
});

describe("shop catalogue", () => {
  it("has bilingual wording for every remaining product and section", () => {
    for (const locale of ["ru", "en"] as const) {
      for (const id of SHOP_ITEM_IDS) {
        expect(SHOP_CATALOG[locale].items[id].title.length).toBeGreaterThan(0);
        expect(SHOP_CATALOG[locale].items[id].text.length).toBeGreaterThan(0);
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

  it("lists every product exactly once and offers none for sale yet", () => {
    const items = listShopItems();
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...SHOP_ITEM_IDS].sort());
    expect(items.every((item) => item.status !== "available")).toBe(true);
  });

  it("recognises its own identifiers and rejects the retired formula shop id", () => {
    for (const id of SHOP_ITEM_IDS) expect(isShopItemId(id)).toBe(true);
    for (const other of ["", "formula", "formulas", "FORMULA", "drop table"]) {
      expect(isShopItemId(other)).toBe(false);
    }
  });
});
