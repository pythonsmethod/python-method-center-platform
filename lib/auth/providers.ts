// Which ways of signing in the site actually offers.
//
// The rule this file exists to enforce: a button appears only when the
// thing behind it is configured. An offer to "continue with Google" that
// ends on a Supabase error page is worse than no offer at all — the person
// concludes the site is broken, and they are not wrong.
//
// Turning one on is one environment variable, on purpose. Setting up the
// provider itself takes fifteen minutes in someone else's console, and the
// switch here is what says that work is finished.

export const SOCIAL_PROVIDERS = ["google", "apple"] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export function isSocialProvider(value: unknown): value is SocialProvider {
  return SOCIAL_PROVIDERS.includes(value as SocialProvider);
}

// AUTH_PROVIDERS="google,apple". Empty, missing or nonsense means none —
// the site falls back to email and password, which always works.
export function enabledSocialProviders(
  raw: string | undefined = process.env.AUTH_PROVIDERS
): SocialProvider[] {
  const requested = (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  // Kept in the declared order rather than the order they were typed, so
  // the buttons do not move around when the variable is edited.
  return SOCIAL_PROVIDERS.filter((provider) => requested.includes(provider));
}

// Where the provider sends the person back to. The next path is sanitized
// here as well as at the callback: this value is put into a URL that leaves
// our site and comes back, and an open redirect is exactly what an
// attacker looks for in a returning link.
export function oauthRedirectTo(origin: string, nextPath: string): string {
  const safe =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/cabinet";

  return `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(safe)}`;
}
