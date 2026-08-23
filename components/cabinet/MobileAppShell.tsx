"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/auth/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type MobileAppShellProps = {
  children: ReactNode;
  email: string | null;
  greetingName: string;
  unread: number;
  tokens: number;
  supplementsDue: number;
  locale: "ru" | "en";
  preview?: boolean;
  labels: Dictionary["cabinet"];
};

const icons = {
  today: "◯",
  case: "▰",
  dialog: "▣",
  anham: "✣",
  chess: "♞"
} as const;

export function MobileAppShell({
  children,
  email,
  greetingName,
  unread,
  supplementsDue,
  locale,
  preview = false,
  labels: t
}: MobileAppShellProps) {
  const pathname = usePathname();
  const ru = locale === "ru";
  const root = preview ? "/app-preview" : "/cabinet";
  const nav = [
    { href: root, label: ru ? "Сегодня" : "Today", icon: icons.today },
    { href: `${root}/case`, label: ru ? "Случай" : "Case", icon: icons.case },
    { href: `${root}/dialog`, label: ru ? "Диалог" : "Dialogue", icon: icons.dialog, badge: unread },
    { href: `${root}/anham`, label: "Anham", icon: icons.anham },
    { href: `${root}/chess`, label: ru ? "Шахматы" : "Chess", icon: icons.chess }
  ];

  const current = (href: string) => href === root
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="pm-app">
      <header className="pm-app__header">
        <Link aria-label={ru ? "На главный экран" : "Go to home"} className="pm-app__mark" href={root}>P</Link>
        <div className="pm-app__identity">
          <strong>{ru ? `Добрый день, ${greetingName}` : `Good day, ${greetingName}`}</strong>
          <span>{email ?? t.clientFallback}</span>
        </div>
        <div className="pm-app__header-actions">
          <LanguageSwitcher locale={locale} />
          {supplementsDue > 0 ? <span className="pm-app__alert" title={ru ? "Есть напоминание" : "You have a reminder"}>●</span> : null}
          {preview ? <span aria-hidden="true" className="pm-app__profile">A</span> : <form action={logoutAction}>
            <button aria-label={t.logout} className="pm-app__profile" title={t.logout} type="submit">
              {greetingName.slice(0, 1).toUpperCase()}
            </button>
          </form>}
        </div>
      </header>

      <main className="pm-app__content">{children}</main>

      <nav aria-label={ru ? "Основные разделы приложения" : "Main app sections"} className="pm-app__nav">
        {nav.map((item) => {
          const active = current(item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className={`pm-app__nav-link${active ? " is-active" : ""}`} href={item.href} key={item.href}>
              <span aria-hidden="true" className="pm-app__nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <b className="pm-app__nav-badge">{item.badge}</b> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
