import { describe, expect, it } from "vitest";
import {
  MIN_REDEEM_TOKENS,
  pluralTokens,
  TOKENS_PER_PAID_REFERRAL,
  TOKEN_VALUE_USD,
  tokensToUsd
} from "@/lib/tokens/config";

describe("token economics", () => {
  it("keeps 1 token = 1 USD", () => {
    expect(TOKEN_VALUE_USD).toBe(1);
    expect(tokensToUsd(120)).toBe(120);
    expect(tokensToUsd(0)).toBe(0);
  });

  it("rewards a meaningful amount per paid referral", () => {
    expect(TOKENS_PER_PAID_REFERRAL).toBeGreaterThan(0);
    expect(TOKENS_PER_PAID_REFERRAL).toBeGreaterThanOrEqual(MIN_REDEEM_TOKENS);
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
