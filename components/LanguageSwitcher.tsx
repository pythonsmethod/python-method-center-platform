"use client";

import { useTransition } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { setLocale } from "@/lib/i18n/set-locale";

type LanguageSwitcherProps = {
  locale: Locale;
};

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const [pending, startTransition] = useTransition();

  // The cookie is written by the server, then the page is fetched again from
  // scratch. router.refresh() would be lighter, but every page here reads
  // the language on the server, and a full load is the one thing that
  // cannot leave half the screen in the old language.
  const choose = (next: Locale) => {
    if (next === locale || pending) {
      return;
    }

    startTransition(async () => {
      await setLocale(next);
      window.location.reload();
    });
  };

  const button = (value: Locale, label: string) => (
    <button
      aria-pressed={locale === value}
      className={
        locale === value ? "lang-switch__btn lang-switch__btn--on" : "lang-switch__btn"
      }
      disabled={pending}
      onClick={() => choose(value)}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div aria-busy={pending} aria-label="Язык / Language" className="lang-switch" role="group">
      {button("ru", "RU")}
      {button("en", "EN")}
    </div>
  );
}
