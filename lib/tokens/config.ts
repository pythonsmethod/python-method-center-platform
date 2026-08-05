// Referral token economics. All values live here so the founder can change
// the programme by changing one number.

// What one capsule of the formula costs today.
//
// This is the anchor of the whole programme: one token is one capsule, and
// nothing else. Every dollar figure shown anywhere is derived from it, so
// when the capsule becomes more expensive, every token held by every client
// becomes more valuable on the same day.
//
// That is deliberate, and it is a promise with a cost: unspent balances are
// a liability that grows with the price. Codes already issued do not move —
// Stripe fixes the discount in dollars at the moment of redemption — so
// only unspent tokens revalue.
//
// TOKEN_CAPSULE_PRICE_USD in the environment overrides it without a
// deployment. A missing, zero, negative or unparseable value falls back to
// the number below rather than quietly making every balance worthless.
const CAPSULE_PRICE_FALLBACK_USD = 6;

// Price history, so any balance can be explained after the fact:
//   2026-08-05 — $6, the first published price.

export function capsulePriceUsd(): number {
  const raw = process.env.TOKEN_CAPSULE_PRICE_USD?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : CAPSULE_PRICE_FALLBACK_USD;
}

// One token is one capsule. Kept as its own function because it answers a
// different question from the dollar one — and it is the only one of the
// two that can never change.
export function tokensToCapsules(tokens: number): number {
  return tokens;
}

export function tokensToUsd(tokens: number): number {
  // Money, so never a fraction of a cent.
  return Math.round(tokens * capsulePriceUsd() * 100) / 100;
}

// The referrer's share of what the person they invited pays. Awarded on
// payment, never on sign-up: a reward for registering is a reward for
// creating empty accounts.
//
// It applies to everything the invited person buys — a support programme
// or capsules from the shop — and to every purchase they make, not only
// the first. The capsules included in a support programme need no separate
// rule: their cost is inside the price the share is taken from.
export const REFERRAL_SHARE = 0.05;

// Never nothing. Someone who brought a paying client has earned at least
// one capsule, however small the purchase was, and a reward that rounds
// down to zero reads as the programme being a trick.
export const MIN_REFERRAL_TOKENS = 1;

// The share, expressed in capsules — because that is what a token is.
// Rounded down: the fraction of a capsule that is left over is ours to
// give away later, not a debt to be guessed at now.
export function referralTokensForAmount(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return 0;
  }

  const shareUsd = (amountCents / 100) * REFERRAL_SHARE;

  return Math.max(MIN_REFERRAL_TOKENS, Math.floor(shareUsd / capsulePriceUsd()));
}

// Guard rails for redemption.
export const MIN_REDEEM_TOKENS = 10;
export const REDEEM_CODE_VALID_DAYS = 60;

// Money is written the way people read it: whole dollars stay whole.
export function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function formatTokens(tokens: number): string {
  return `${tokens} (${formatUsd(tokensToUsd(tokens))} $)`;
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

// Russian plural for "капсула" — 1 капсула, 2 капсулы, 5 капсул.
export function pluralCapsules(count: number): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;

  if (mod100 >= 11 && mod100 <= 14) {
    return "капсул";
  }

  if (mod10 === 1) {
    return "капсула";
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return "капсулы";
  }

  return "капсул";
}
