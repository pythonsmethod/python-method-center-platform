import { afterEach, describe, expect, it } from "vitest";
import {
  formatUsd,
  MIN_REDEEM_TOKENS,
  pluralTokens,
  REFERRAL_PURCHASE_TOKENS,
  REFERRAL_SIGNUP_TOKENS,
  tokenValueUsd,
  tokensToUsd
} from "@/lib/tokens/config";

// One token is one dollar of discount, and that is the whole promise.
//
// It used to be one capsule of the formula, and every dollar figure was
// derived from the capsule price. The formula is a CBD product that cannot
// be sold until the paperwork and the state rules are settled, so a balance
// denominated in it promised something the platform might not be able to
// hand over. The arithmetic is pinned here rather than left to be
// re-derived by hand.

const ENV_KEY = "TOKEN_VALUE_USD";

afterEach(() => {
  delete process.env[ENV_KEY];
});

describe("what a token is", () => {
  it("is a dollar of discount", () => {
    expect(tokenValueUsd()).toBe(1);
    expect(tokensToUsd(1)).toBe(1);
    expect(tokensToUsd(100)).toBe(100);
    expect(tokensToUsd(0)).toBe(0);
  });

  it("follows the published value if it is ever changed", () => {
    process.env[ENV_KEY] = "2";

    expect(tokenValueUsd()).toBe(2);
    expect(tokensToUsd(100)).toBe(200);
  });

  it("never lands on a fraction of a cent", () => {
    // A value with more precision than money has. Whatever it multiplies
    // out to, what reaches Stripe has to be a whole number of cents.
    process.env[ENV_KEY] = "1.005";

    for (const tokens of [1, 3, 7, 250]) {
      const usd = tokensToUsd(tokens);

      expect(Math.round(usd * 100), String(tokens)).toBeCloseTo(usd * 100, 6);
    }
  });

  it("keeps whole dollars whole when written out", () => {
    expect(formatUsd(600)).toBe("600");
    expect(formatUsd(19.01)).toBe("19.01");
  });
});

describe("a bad value must never wipe out a balance", () => {
  // Every one of these would otherwise value every client's tokens at zero,
  // silently, on the next page load.
  it.each(["", "0", "-1", "один", "NaN", "Infinity"])(
    "falls back to the published value for %o",
    (value) => {
      process.env[ENV_KEY] = value;

      expect(tokenValueUsd()).toBe(1);
      expect(tokensToUsd(100)).toBe(100);
    }
  );
});

describe("what an invitation earns", () => {
  it("pays a token for the registration and ten for a purchase", () => {
    expect(REFERRAL_SIGNUP_TOKENS).toBe(1);
    expect(REFERRAL_PURCHASE_TOKENS).toBe(10);
  });

  // The reason the sign-up reward is safe to pay at all. Paying for an
  // account is paying for the making of empty accounts, and the only thing
  // holding that down is the gap between the two numbers: a farm of empty
  // accounts earns a dollar a head, a real invitation earns ten.
  it("pays a real invitation many times what an empty account pays", () => {
    expect(REFERRAL_PURCHASE_TOKENS).toBeGreaterThanOrEqual(
      REFERRAL_SIGNUP_TOKENS * 10
    );
  });

  it("is worth redeeming after one invited person pays", () => {
    expect(REFERRAL_PURCHASE_TOKENS).toBeGreaterThanOrEqual(MIN_REDEEM_TOKENS);
  });
});

describe("pluralTokens", () => {
  it("uses the singular for 1, 21, 101", () => {
    for (const n of [1, 21, 101, 131]) {
      expect(pluralTokens(n), String(n)).toBe("токен");
    }
  });

  it("uses the paucal for 2-4, 22-24", () => {
    for (const n of [2, 3, 4, 22, 33, 104]) {
      expect(pluralTokens(n), String(n)).toBe("токена");
    }
  });

  it("uses the plural for 0, 5-20, 11-14", () => {
    for (const n of [0, 5, 9, 11, 12, 13, 14, 111, 25]) {
      expect(pluralTokens(n), String(n)).toBe("токенов");
    }
  });
});
