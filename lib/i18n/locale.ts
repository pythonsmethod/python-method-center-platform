import { cookies, headers } from "next/headers";

export type Locale = "ru" | "en";

export const LOCALE_COOKIE = "pm-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "ru" || value === "en";
}

// Set by the middleware when the address itself names the language, which
// is the case for every page that exists in both: /en/payment is English
// whoever is asking and whatever they chose last time.
export const LOCALE_HEADER = "x-pm-locale";

// The path the application is serving, without the language prefix. The
// root layout uses it to write the hreflang pair, and the language switcher
// to find the same page in the other language.
export const PATH_HEADER = "x-pm-path";

// Which language to render in, and why no Vary header goes with it.
//
// Reading the cookie is what would normally demand "Vary: Cookie": without
// it a shared cache can hand one visitor the copy it stored for another, in
// the wrong language. Next 15 writes its own Vary for app-router responses
// and overwrites anything added beside it, in the middleware or in
// next.config, so that header cannot be set here at all.
//
// It is not needed. Calling cookies() and headers() makes every page that
// renders through the root layout dynamic, and Vercel serves those with
// "private, no-cache, no-store" — no shared cache keeps a copy, so there is
// none to hand to the wrong reader. Verified against production: every HTML
// response carries that header, and the only cached routes (robots.txt,
// sitemap.xml) read no cookie and are identical for everyone.
//
// The guarantee rests on those pages staying dynamic. Making a page that
// depends on the language static or publicly cacheable would bring the bug
// back with no header available to prevent it — give that page its own
// address under /en instead, the way the public pages already work.
export async function getLocale(): Promise<Locale> {
  const fromPath = (await headers()).get(LOCALE_HEADER);

  if (isLocale(fromPath)) {
    return fromPath;
  }

  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;

  return isLocale(value) ? value : "ru";
}

// Where we are, in the vocabulary of the Russian address space. Falls back
// to the home page: the only readers are the switcher and the metadata, and
// neither should throw because a header went missing.
export async function getCurrentPath(): Promise<string> {
  return (await headers()).get(PATH_HEADER) || "/";
}
