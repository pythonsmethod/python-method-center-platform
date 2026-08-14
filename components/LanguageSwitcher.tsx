"use client";

import { useFormStatus } from "react-dom";
import type { Locale } from "@/lib/i18n/locale";
import { setLocale } from "@/lib/i18n/set-locale";

type LanguageSwitcherProps = {
  locale: Locale;
};

function LocaleButton({
  active,
  label
}: {
  active: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-pressed={active}
      className={
        active ? "lang-switch__btn lang-switch__btn--on" : "lang-switch__btn"
      }
      disabled={active || pending}
      type="submit"
    >
      {label}
    </button>
  );
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const button = (value: Locale, label: string) => (
    <form action={setLocale.bind(null, value)} key={value}>
      <LocaleButton active={locale === value} label={label} />
    </form>
  );

  return (
    <div
      aria-label={locale === "ru" ? "Язык интерфейса" : "Interface language"}
      className="lang-switch"
      role="group"
    >
      {button("ru", "RU")}
      {button("en", "EN")}
    </div>
  );
}
