"use client";

import { useFormStatus } from "react-dom";
import type { Locale } from "@/lib/i18n/locale";
import { setLocale } from "@/lib/i18n/set-locale";
import { localizedHref } from "@/lib/i18n/routing";

type LanguageSwitcherProps = {
  locale: Locale;
  // The page being read, in Russian address terms. Given where a page has
  // an address in each language, so the switch lands on the same page rather
  // than the home one; omitted inside the cabinet, which has one address and
  // follows the cookie.
  path?: string;
};

function LocaleButton({
  active,
  label,
  onChoose
}: {
  active: boolean;
  label: string;
  onChoose: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-pressed={active}
      className={
        active ? "lang-switch__btn lang-switch__btn--on" : "lang-switch__btn"
      }
      disabled={active || pending}
      onClick={(event) => {
        // Handled here rather than by the form action: the language decides
        // what every page renders, and a client-side navigation would serve
        // the page it already has in the other language. A full load is the
        // only thing that reliably re-renders everything, and switching
        // language is a deliberate, once-in-a-visit act.
        event.preventDefault();
        onChoose();
      }}
      type="submit"
    >
      {label}
    </button>
  );
}

export function LanguageSwitcher({ locale, path }: LanguageSwitcherProps) {
  const choose = (value: Locale) => {
    // The cookie is written on the server, where it cannot be refused by a
    // privacy mode and cannot end up scoped to the wrong host. Then the page
    // is loaded afresh, at the address that page has in the chosen language.
    void setLocale(value).then(() => {
      window.location.assign(
        path ? localizedHref(path, value) : window.location.pathname
      );
    });
  };

  const button = (value: Locale, label: string) => (
    // The action stays for a browser without JavaScript: the cookie is still
    // written, and the middleware moves the next request to the right
    // address.
    <form action={setLocale.bind(null, value)} key={value}>
      <LocaleButton
        active={locale === value}
        label={label}
        onChoose={() => choose(value)}
      />
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
