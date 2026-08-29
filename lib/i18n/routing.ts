import type { Locale } from "@/lib/i18n/locale";

// Russian keeps the bare addresses it has always had, so every link that
// exists in the world today still points where it did and nothing loses the
// history it has earned. English gets its own, under /en.
export const EN_PREFIX = "/en";

// The pages that exist in both languages: everything a stranger can reach
// without signing in. The cabinet, the sign-in door and the workspace are
// not here — they are closed to search engines, so a second address for
// them would buy nothing and cost a great deal, and the language a signed-in
// person reads in stays in their cookie.
export const LOCALIZED_PATHS = [
  "/",
  "/payment",
  "/payment/other",
  "/payment/success",
  "/professor",
  "/review",
  "/shop",
  "/support",
  "/legal/offer",
  "/legal/privacy",
  "/legal/refund"
] as const;

const LOCALIZED = new Set<string>(LOCALIZED_PATHS);

function normalize(path: string): string {
  if (!path.startsWith("/")) {
    return path;
  }

  // "/payment/" and "/payment" are the same page.
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;

  return trimmed === "" ? "/" : trimmed;
}

// Whether a path has an English twin. Anything else — /login, /cabinet, an
// API route, a file — is left exactly as it is.
export function hasEnglishTwin(path: string): boolean {
  return LOCALIZED.has(normalize(path));
}

// Splits an incoming address into the language it asks for and the path the
// application actually serves. /en/payment is the English rendering of
// /payment; /en on its own is the English home page.
export function readLocaleFromPath(pathname: string): {
  locale: Locale;
  path: string;
} {
  if (pathname === EN_PREFIX || pathname === `${EN_PREFIX}/`) {
    return { locale: "en", path: "/" };
  }

  if (pathname.startsWith(`${EN_PREFIX}/`)) {
    return { locale: "en", path: normalize(pathname.slice(EN_PREFIX.length)) };
  }

  return { locale: "ru", path: normalize(pathname) };
}

// The address of a path in a given language. Safe to call on every link in
// the codebase: a path with no English twin comes back untouched, so the
// sign-in door and the cabinet keep their single address.
export function localizedHref(href: string, locale: Locale): string {
  if (locale !== "en" || !href.startsWith("/")) {
    return href;
  }

  // A link may carry a query or a fragment; only the path decides.
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? "" : href.slice(cut);

  if (!hasEnglishTwin(path)) {
    return href;
  }

  return normalize(path) === "/"
    ? `${EN_PREFIX}${rest}`
    : `${EN_PREFIX}${normalize(path)}${rest}`;
}

// Both addresses of one page, for the hreflang pair and the sitemap.
export function alternatesFor(path: string): { ru: string; en: string } | null {
  if (!hasEnglishTwin(path)) {
    return null;
  }

  return {
    ru: normalize(path),
    en: localizedHref(normalize(path), "en")
  };
}
