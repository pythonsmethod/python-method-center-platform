"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/auth/actions";
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
};

const sections: CabinetSection[] = [
  {
    href: "/cabinet",
    title: "Главная",
    hint: "Переписка с Professor Python",
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
    hint: "Поддержка и ИИ-помощник",
    icon: IconWater
  },
  {
    href: "/cabinet/account",
    title: "Мой кейс",
    hint: "Аккаунт, оплаты, история",
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

// The cabinet as a workspace. The column of destinations is always on the
// screen — on a desktop with its explanations, on a phone as a narrow strip
// of signs — because a menu hidden behind a button is a menu a first-time
// visitor never finds.
export function CabinetShell({
  children,
  email,
  greetingName,
  unread,
  tokens
}: CabinetShellProps) {
  const pathname = usePathname();

  function isCurrent(href: string): boolean {
    return href === "/cabinet"
      ? pathname === "/cabinet"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="cab">
      <aside className="cab__side">
        <nav aria-label="Разделы кабинета" className="cab__nav">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = isCurrent(section.href);
            // The count of new messages belongs next to the place the
            // messages actually are: the home page.
            const badge = section.href === "/cabinet" ? unread : 0;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`cab__link${active ? " cab__link--active" : ""}`}
                href={section.href}
                key={section.href}
              >
                <span className="cab__link-icon">
                  <Icon />
                  {badge > 0 ? <b className="cab__badge">{badge}</b> : null}
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
          <span aria-hidden="true">☎</span>
          <span className="cab__sos-text">Экстренная помощь</span>
        </Link>

        {/* Leaving must never require searching. Quiet on purpose: an exit,
            not an invitation. */}
        <form action={logoutAction}>
          <button className="cab__logout" type="submit">
            <span aria-hidden="true">⎋</span>
            <span className="cab__logout-text">Выйти из аккаунта</span>
          </button>
        </form>
      </aside>

      <div className="cab__main">
        <header className="cab__top">
          <div className="cab__hello">
            <strong>Здравствуйте, {greetingName}!</strong>
            <span>Мы рады видеть вас сегодня</span>
          </div>

          <div className="cab__chips">
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
