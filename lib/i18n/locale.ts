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
