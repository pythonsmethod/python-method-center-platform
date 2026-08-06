// Referral token economics. All values live here so the founder can change
// the programme by changing one number.

// What one token is worth.
//
// A token used to be a capsule of the formula, and every dollar figure was
// derived from the capsule price. That peg is gone: the formula is a CBD
// product made under contract, it cannot be sold until the paperwork and
// the state-by-state rules are settled, and a reward payable only in a
// thing we may not be able to ship everywhere is a promise with a hole in
// it. A token is now a dollar of discount and nothing else.
//
// TOKEN_VALUE_USD in the environment overrides it without a deployment. A
// missing, zero, negative or unparseable value falls back to the number
// below rather than quietly making every balance worthless.
const TOKEN_VALUE_FALLBACK_USD = 1;

// Value history, so any balance can be explained after the fact:
//   2026-08-05 — 1 token = 1 capsule of the formula ($6 at the time).
//   2026-08-06 — 1 token = $1, the peg to the capsule dropped.
//
// Balances carried over unchanged in token count, which raised what a
// holder could redeem rather than lowering it. Nobody lost value on the
// change, and that is the only version of this change worth making.

export function tokenValueUsd(): number {
  const raw = process.env.TOKEN_VALUE_USD?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : TOKEN_VALUE_FALLBACK_USD;
}

export function tokensToUsd(tokens: number): number {
  // Money, so never a fraction of a cent.
  return Math.round(tokens * tokenValueUsd() * 100) / 100;
}

// What the referrer earns when somebody they invited registers.
//
// The old rule refused to pay for a sign-up at all, on the grounds that a
// reward for registering is a reward for creating empty accounts. That
// reasoning has not stopped being true — it is just now priced at a dollar
// and deliberately an order of magnitude below the reward for a purchase,
// so farming empty accounts pays a dollar a head for work that is not
// worth a dollar. It is still the line to watch if the balances ever look
// strange: see docs/yc/ and the note in awardReferralTokensForSignup.
export const REFERRAL_SIGNUP_TOKENS = 1;

// What the referrer earns when somebody they invited pays.
//
// A flat reward per payment, not a share of it: the share was expressed in
// capsules and died with the peg, and a flat number is one the person can
// hold in their head. It applies to every purchase the invited person
// makes, not only the first.
export const REFERRAL_PURCHASE_TOKENS = 10;

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
