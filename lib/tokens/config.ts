// Referral token economics. All values live here so the founder can change
// the programme by changing one number.

// 1 token = 1 USD of discount at checkout.
export const TOKEN_VALUE_USD = 1;

// Awarded to the referrer when an invited person pays for a support plan
// for the first time. Rewarding on payment (not on sign-up) keeps the
// programme free of fake-registration farming.
export const TOKENS_PER_PAID_REFERRAL = 100;

// Guard rails for redemption.
export const MIN_REDEEM_TOKENS = 10;
export const REDEEM_CODE_VALID_DAYS = 60;

export function tokensToUsd(tokens: number): number {
  return tokens * TOKEN_VALUE_USD;
}

export function formatTokens(tokens: number): string {
  return `${tokens} (${tokensToUsd(tokens)} $)`;
}

// Russian plural for "токен" — 1 токен, 2 токена, 5 токенов.
export function pluralTokens(count: number): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;

  if (mod100 >= 11 && mod100 <= 14) {
    return "токенов";
  }

  if (mod10 === 1) {
    return "токен";
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return "токена";
  }

  return "токенов";
}
