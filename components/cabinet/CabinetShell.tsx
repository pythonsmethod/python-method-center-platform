"use client";

import { Link } from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logoutAction } from "@/lib/auth/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  IconAnkh, IconEyeOfHorus, IconLotus, IconPapyrus,
  IconScales, IconScarab, IconWater, IconWingedSun
} from "@/components/icons/EgyptianIcons";

type CabinetShellProps = {
  children: ReactNode; email: string | null; greetingName: string;
  unread: number; tokens: number; supplementsDue: number;
  locale: "ru" | "en"; preview?: boolean; labels: Dictionary["cabinet"];
};

type NavItem = {
  href: string; label: string; hint: string;
  icon: (props: { className?: string }) => React.ReactElement; badge?: number;
};

export function CabinetShell({ children, email, greetingName, unread, tokens,
  supplementsDue, locale, preview = false, labels: t }: CabinetShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const ru = locale === "ru";
  const root = preview ? "/app-preview" : "/cabinet";

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.classList.toggle("cabinet-menu-open", menuOpen);
    return () => document.body.classList.remove("cabinet-menu-open");
  }, [menuOpen]);

  const nav: Array<{ title: string; items: NavItem[] }> = [
    { title: ru ? "Веб-сайт" : "Website", items: [
      { href: "/", label: ru ? "Главная страница сайта" : "Main website", hint: ru ? "О центре и сопровождении" : "About the center and its support", icon: IconAnkh }
    ] },
    { title: ru ? "Главное" : "Overview", items: [
      { href: root, label: t.sections.home.title, hint: t.sections.home.hint, icon: IconWingedSun },
      { href: `${root}/account`, label: t.sections.account.title, hint: t.sections.account.hint, icon: IconScales }
    ] },
    { title: ru ? "Материалы и трекеры" : "Files and trackers", items: [
      { href: `${root}/documents`, label: t.sections.documents.title, hint: t.sections.documents.hint, icon: IconPapyrus },
      { href: `${root}/metrics`, label: t.sections.metrics.title, hint: t.sections.metrics.hint, icon: IconWater },
      { href: `${root}/supplements`, label: t.sections.supplements.title, hint: t.sections.supplements.hint, icon: IconLotus, badge: supplementsDue }
    ] },
    { title: ru ? "Общение" : "Communication", items: [
      { href: `${root}/dialog`, label: "Professor Python", hint: ru ? "Личное сопровождение" : "Personal guidance", icon: IconEyeOfHorus, badge: unread },
      { href: `${root}/chat`, label: t.sections.chat.title, hint: t.sections.chat.hint, icon: IconAnkh }
    ] },
    { title: ru ? "Возможности" : "Benefits", items: [
      { href: `${root}/chess`, label: ru ? "Шахматы с Anham" : "Chess with Anham", hint: ru ? "Сыграть онлайн-партию" : "Play an online game", icon: IconEyeOfHorus },
      { href: `${root}/tokens`, label: t.sections.tokens.title, hint: t.sections.tokens.hint, icon: IconScarab }
    ] }
  ];

  const isCurrent = (href: string) => href === root
    ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return <div className="web-cab">
    <aside aria-label={t.navLabel} className={`web-cab__sidebar${menuOpen ? " is-open" : ""}`}>
      <div className="web-cab__sidebar-head">
        <Link aria-label={ru ? "Перейти на главную страницу сайта" : "Go to the main website"} className="web-cab__brand" href="/">
          <span className="web-cab__brand-symbol"><IconAnkh /></span>
          <span><strong>Python Method</strong><small>Center</small></span>
        </Link>
        <button aria-label={ru ? "Закрыть меню" : "Close menu"} className="web-cab__close" onClick={() => setMenuOpen(false)} type="button">×</button>
      </div>
      <nav className="web-cab__nav">
        {nav.map((group) => <div className="web-cab__nav-group" key={group.title}>
          <span className="web-cab__nav-title">{group.title}</span>
          {group.items.map((item) => {
            const Icon = item.icon; const active = isCurrent(item.href);
            return <Link aria-current={active ? "page" : undefined} aria-label={item.label} className={`web-cab__nav-link${active ? " is-active" : ""}`} href={item.href} key={item.href}>
              <span className="web-cab__nav-icon"><Icon />{item.badge ? <b>{item.badge}</b> : null}</span>
              <span><strong>{item.label}</strong><small>{item.hint}</small></span><i aria-hidden="true">›</i>
            </Link>;
          })}
        </div>)}
      </nav>
      <div className="web-cab__sidebar-foot">
        <Link className="web-cab__emergency" href="/support#emergency">{t.sos}</Link>
        {preview ? null : <form action={logoutAction}><button type="submit">{t.logout}</button></form>}
      </div>
    </aside>
    {menuOpen ? <button aria-label={ru ? "Закрыть меню" : "Close menu"} className="web-cab__backdrop" onClick={() => setMenuOpen(false)} type="button" /> : null}
    <div className="web-cab__workspace">
      <header className="web-cab__topbar">
        <button aria-expanded={menuOpen} aria-label={ru ? "Открыть меню кабинета" : "Open cabinet menu"} className="web-cab__menu" onClick={() => setMenuOpen(true)} type="button"><span /><span /><span /></button>
        <Link aria-label={ru ? "Перейти на главную страницу сайта" : "Go to the main website"} className="web-cab__mobile-brand" href="/"><IconAnkh /><span>Python Method Center</span></Link>
        <div className="web-cab__welcome"><strong>{ru ? `Добрый день, ${greetingName}` : `Good day, ${greetingName}`}</strong><span>{ru ? "Ваш личный кабинет" : "Your personal cabinet"}</span></div>
        <div className="web-cab__top-actions">
          <LanguageSwitcher locale={locale} />
          <Link aria-label={ru ? `Токены: ${tokens}` : `Tokens: ${tokens}`} className="web-cab__token" href={`${root}/tokens`}><IconScarab /><span>{tokens}</span></Link>
          <Link className="web-cab__account" href={`${root}/account`}><span>{greetingName.slice(0, 1).toUpperCase()}</span><span><strong>{greetingName}</strong><small>{email ?? t.clientFallback}</small></span></Link>
        </div>
      </header>
      <main className="web-cab__content">{children}</main>
    </div>
  </div>;
}
