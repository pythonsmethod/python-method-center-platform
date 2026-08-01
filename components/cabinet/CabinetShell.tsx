"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  IconAnkh,
  IconEyeOfHorus,
  IconPapyrus,
  IconScales,
  IconScarab,
  IconWater,
  IconWingedSun
} from "@/components/icons/EgyptianIcons";

type CabinetSection = {
  href: string;
  title: string;
  hint: string;
  icon: (props: { className?: string }) => React.ReactElement;
  soon?: boolean;
};

const sections: CabinetSection[] = [
  {
    href: "/cabinet",
    title: "Главная",
    hint: "Что сейчас важно",
    icon: IconWingedSun
  },
  {
    href: "/cabinet/documents",
    title: "Мои документы",
    hint: "Анализы и выписки",
    icon: IconPapyrus
  },
  {
    href: "/cabinet/chat",
    title: "Связь с центром",
    hint: "Professor Python и команда",
    icon: IconWater
  },
  {
    href: "/cabinet/account",
    title: "Мой кейс",
    hint: "Статус, оплаты, история",
    icon: IconScales
  },
  {
    href: "/cabinet/tokens",
    title: "Токены",
    hint: "Приглашения и скидки",
    icon: IconScarab
  }
];

type CabinetShellProps = {
  children: ReactNode;
  email: string | null;
  greetingName: string;
  unread: number;
  tokens: number;
};

// The cabinet as a workspace: a column of destinations on the left, the
// person's own state along the top, the work in the middle. Built to be
// opened every day without re-reading anything.
export function CabinetShell({
  children,
  email,
  greetingName,
  unread,
  tokens
}: CabinetShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isCurrent(href: string): boolean {
    return href === "/cabinet"
      ? pathname === "/cabinet"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="cab">
      <aside className={`cab__side${menuOpen ? " cab__side--open" : ""}`}>
        <nav aria-label="Разделы кабинета" className="cab__nav">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = isCurrent(section.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`cab__link${active ? " cab__link--active" : ""}`}
                href={section.href}
                key={section.href}
                onClick={() => setMenuOpen(false)}
              >
                <span className="cab__link-icon">
                  <Icon />
                </span>
                <span className="cab__link-body">
                  <strong>{section.title}</strong>
                  <em>{section.hint}</em>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Always reachable, always last: the one button that must never be
            hunted for. */}
        <Link className="cab__sos" href="/support#emergency">
          ☎ Экстренная помощь
        </Link>
      </aside>

      <div className="cab__main">
        <header className="cab__top">
          <button
            aria-expanded={menuOpen}
            aria-label="Разделы кабинета"
            className="cab__burger"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            ☰
          </button>

          <div className="cab__hello">
            <strong>Здравствуйте, {greetingName}!</strong>
            <span>Мы рады видеть вас сегодня</span>
          </div>

          <div className="cab__chips">
            <Link className="cab__chip" href="/cabinet/chat">
              <span className="cab__chip-icon">
                <IconWater />
              </span>
              <span>Сообщения</span>
              {unread > 0 ? <b className="cab__badge">{unread}</b> : null}
            </Link>
            <Link className="cab__chip" href="/cabinet/tokens">
              <span className="cab__chip-icon cab__chip-icon--coin">⊙</span>
              <span>{tokens}</span>
            </Link>
            <Link className="cab__chip cab__chip--user" href="/cabinet/account">
              <span className="cab__chip-icon">
                <IconAnkh />
              </span>
              <span className="cab__chip-user">
                <strong>{greetingName}</strong>
                <em>{email ?? "Клиент центра"}</em>
              </span>
            </Link>
          </div>
        </header>

        <div className="cab__content">{children}</div>
      </div>
    </div>
  );
}

export { IconEyeOfHorus };
