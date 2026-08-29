"use client";

import NextLink from "next/link";
import { createContext, useContext, type ComponentProps } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { localizedHref } from "@/lib/i18n/routing";

// The language of the page being rendered, as the address states it.
//
// A link on /en/payment that points at "/support" would take an English
// reader into the Russian site: nothing about the target says which language
// it is in, so somebody has to say it, on every link. Rather than repeat that
// at a hundred call sites, the layout announces the language once and every
// link asks.
const LocaleContext = createContext<Locale>("ru");

export function LocaleProvider({
  children,
  locale
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

type LinkProps = ComponentProps<typeof NextLink>;

// Drop-in for next/link. Safe on every href: a path with no English twin —
// /login, /cabinet, an outside address — comes back untouched, so this can
// replace the import wholesale without deciding link by link.
export function Link({ href, ...rest }: LinkProps) {
  const locale = useLocale();
  const localized =
    typeof href === "string" ? localizedHref(href, locale) : href;

  return <NextLink href={localized} {...rest} />;
}
