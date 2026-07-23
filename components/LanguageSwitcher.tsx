"use client";

import type { Locale } from "@/lib/i18n/locale";

type LanguageSwitcherProps = {
  locale: Locale;
};

function setLocale(locale: Locale) {
  document.cookie = `pm-locale=${locale};path=/;max-age=31536000;samesite=lax`;
  window.location.reload();
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  return (
    <div aria-label="Язык / Language" className="lang-switch" role="group">
      <button
        aria-pressed={locale === "ru"}
        className={locale === "ru" ? "lang-switch__btn lang-switch__btn--on" : "lang-switch__btn"}
        onClick={() => setLocale("ru")}
        type="button"
      >
        RU
      </button>
      <button
        aria-pressed={locale === "en"}
        className={locale === "en" ? "lang-switch__btn lang-switch__btn--on" : "lang-switch__btn"}
        onClick={() => setLocale("en")}
        type="button"
      >
        EN
      </button>
    </div>
  );
}
