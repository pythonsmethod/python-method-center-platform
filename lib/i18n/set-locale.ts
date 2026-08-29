"use server";

import { cookies, headers } from "next/headers";
import { localeCookieDomain } from "@/lib/i18n/cookie-domain";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";

// Switching the language, done by the server rather than by the browser.
//
// It used to be one line of document.cookie in the switcher component. That
// worked everywhere it was tested — and was reported as not working on the
// live site. Three things can break a cookie written that way, none of
// which reproduces on a development machine:
//
//   * it is scoped to the exact host, so a choice made on
//     pythonmethodcenter.com is not sent to www.pythonmethodcenter.com, and
//     the switch appears to do nothing after a redirect between the two;
//   * a browser in a privacy mode can refuse the write from a script;
//   * nothing guarantees Path or SameSite once a redirect is involved.
//
// A cookie set on a server response has none of those problems, and the
// domain is widened deliberately so the apex and www share one choice.
// Writes the choice and nothing else. Where to go with it is decided by the
// switcher, which is on the client and can load the page afresh.
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }

  const host = (await headers()).get("host") ?? "";
  const domain = localeCookieDomain(host);

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    // Secure everywhere except local development, where there is no https.
    secure: Boolean(domain) || !host.startsWith("localhost"),
    ...(domain ? { domain } : {})
  });

  // Deliberately no redirect from here.
  //
  // Every rendered page depends on this cookie, and the browser's router
  // cache is keyed on the address alone — it has no idea the language just
  // changed. A redirect issued by this action is followed client-side and
  // served from that cache: pressing RU from /en/professor landed on
  // /professor still in English, menu, footer and the lang attribute
  // included. revalidatePath does not reach that cache either.
  //
  // So the switcher navigates for itself, with a full load. Without
  // JavaScript the form still posts here and the cookie is still written;
  // the next request is then redirected by the middleware, which reads it.
}
