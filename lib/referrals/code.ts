// Referral token helpers (pure, unit-tested).

// Crockford-style alphabet without look-alikes (0/O, 1/I/L): the code has
// to survive being read aloud, retyped from a screenshot, or dictated by
// phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 6;
const PREFIX = "PM-";

export function generateReferralCode(
  randomInt: (max: number) => number = (max) =>
    Math.floor(Math.random() * max)
): string {
  let body = "";

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `${PREFIX}${body}`;
}

// Accepts what a human might paste: lower case, missing prefix, stray
// spaces. Returns the canonical form or null when it cannot be a code.
export function normalizeReferralCode(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().toUpperCase().replace(/\s+/g, "");
  const body = cleaned.startsWith(PREFIX) ? cleaned.slice(PREFIX.length) : cleaned;

  if (body.length !== CODE_LENGTH) {
    return null;
  }

  for (const char of body) {
    if (!ALPHABET.includes(char)) {
      return null;
    }
  }

  return `${PREFIX}${body}`;
}

export function referralLink(code: string, siteUrl?: string): string {
  const base = (
    siteUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://pythonmethodcenter.com"
  ).replace(/\/$/, "");

  return `${base}/?ref=${encodeURIComponent(code)}`;
}
