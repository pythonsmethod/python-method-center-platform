import { afterEach, describe, expect, it } from "vitest";
import {
  capsulePriceUsd,
  formatUsd,
  MIN_REDEEM_TOKENS,
  pluralCapsules,
  pluralTokens,
  MIN_REFERRAL_TOKENS,
  REFERRAL_SHARE,
  referralTokensForAmount,
  tokensToCapsules,
  tokensToUsd
} from "@/lib/tokens/config";

// One token is one capsule of the formula, and that is the whole promise.
//
// The dollar figure is only today's translation of it. When the capsule
// costs more, every token already held is worth more on the same day —
// which is the point, and also a liability that grows, so the arithmetic is
// pinned here rather than left to be re-derived by hand.

const ENV_KEY = "TOKEN_CAPSULE_PRICE_USD";

afterEach(() => {
  delete process.env[ENV_KEY];
});

describe("what a token is", () => {
  it("is one capsule, whatever a capsule costs", () => {
    expect(tokensToCapsules(1)).toBe(1);
    expect(tokensToCapsules(250)).toBe(250);

    // Unchanged by a price rise: this is the part that never moves.
    process.env[ENV_KEY] = "40";
    expect(tokensToCapsules(250)).toBe(250);
  });

  it("is six dollars today", () => {
    expect(capsulePriceUsd()).toBe(6);
    expect(tokensToUsd(1)).toBe(6);
    expect(tokensToUsd(100)).toBe(600);
    expect(tokensToUsd(0)).toBe(0);
  });
});

describe("when the capsule goes up in price", () => {
  it("every token held goes up with it", () => {
    process.env[ENV_KEY] = "9";

    expect(capsulePriceUsd()).toBe(9);
    expect(tokensToUsd(100)).toBe(900);
  });

  it("never lands on a fraction of a cent", () => {
    process.env[ENV_KEY] = "6.335";

    expect(tokensToUsd(3)).toBe(19.01);
  });

  it("keeps whole dollars whole when written out", () => {
    expect(formatUsd(600)).toBe("600");
    expect(formatUsd(19.01)).toBe("19.01");
  });
});

describe("a bad price must never wipe out a balance", () => {
  // Every one of these would otherwise value every client's tokens at zero,
  // silently, on the next page load.
  it.each(["", "0", "-6", "шесть", "NaN", "Infinity"])(
    "falls back to the published price for %o",
    (value) => {
      process.env[ENV_KEY] = value;

      expect(capsulePriceUsd()).toBe(6);
      expect(tokensToUsd(100)).toBe(600);
    }
  );

  it("accepts a real rise from the environment", () => {
    process.env[ENV_KEY] = "7.5";

    expect(capsulePriceUsd()).toBe(7.5);
  });
});

describe("the referrer's share of a purchase", () => {
  it("is five percent, in capsules", () => {
    expect(REFERRAL_SHARE).toBe(0.05);

    // The two support plans, at today's prices and today's capsule price.
    // Written out so a change to either is visible as a change here.
    expect(referralTokensForAmount(144000)).toBe(12); // $1,440 → $72 → 12
    expect(referralTokensForAmount(367500)).toBe(30); // $3,675 → $183.75 → 30
  });

  it("follows the capsule price, like every other token figure", () => {
    process.env[ENV_KEY] = "12";

    // The same $1,440 purchase now buys the referrer half as many capsules,
    // each worth twice as much. The share of the money is unchanged.
    expect(referralTokensForAmount(144000)).toBe(6);
    expect(tokensToUsd(referralTokensForAmount(144000))).toBe(72);
  });

  it("never rounds a real purchase down to nothing", () => {
    // A reward that disappears on a small purchase reads as a trick, and
    // the person still did the work of bringing someone who paid.
    expect(referralTokensForAmount(300)).toBe(MIN_REFERRAL_TOKENS);
    expect(referralTokensForAmount(1)).toBe(MIN_REFERRAL_TOKENS);
  });

  it("pays nothing for a payment that is not one", () => {
    expect(referralTokensForAmount(0)).toBe(0);
    expect(referralTokensForAmount(-144000)).toBe(0);
    expect(referralTokensForAmount(Number.NaN)).toBe(0);
  });

  it("rounds the leftover fraction of a capsule down, not up", () => {
    // $700 → $35 → 5.83 capsules. Six would be us paying more than the
    // rule says; the remainder is ours to give away later, not a debt to
    // guess at now.
    expect(referralTokensForAmount(70000)).toBe(5);
  });

  it("is worth redeeming after a plan purchase", () => {
    expect(referralTokensForAmount(144000)).toBeGreaterThanOrEqual(MIN_REDEEM_TOKENS);
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

describe("pluralCapsules", () => {
  it("agrees with the number in front of it", () => {
    expect(pluralCapsules(1)).toBe("капсула");
    expect(pluralCapsules(21)).toBe("капсула");
    expect(pluralCapsules(3)).toBe("капсулы");
    expect(pluralCapsules(24)).toBe("капсулы");
    expect(pluralCapsules(0)).toBe("капсул");
    expect(pluralCapsules(11)).toBe("капсул");
    expect(pluralCapsules(100)).toBe("капсул");
  });
});
