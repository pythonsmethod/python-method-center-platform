"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/auth/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  IconAnkh,
  IconEyeOfHorus,
  IconLotus,
  IconMoon,
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

function buildSections(t: Dictionary["cabinet"]): CabinetSection[] {
  return [
    { href: "/cabinet", ...t.sections.home, icon: IconWingedSun },
    { href: "/cabinet/documents", ...t.sections.documents, icon: IconPapyrus },
    { href: "/cabinet/metrics", ...t.sections.metrics, icon: IconWater },
    { href: "/cabinet/supplements", ...t.sections.supplements, icon: IconLotus },
    { href: "/cabinet/sleep", ...t.sections.sleep, icon: IconMoon },
    { href: "/cabinet/chat", ...t.sections.chat, icon: IconEyeOfHorus },
    { href: "/cabinet/account", ...t.sections.account, icon: IconScales },
    { href: "/cabinet/tokens", ...t.sections.tokens, icon: IconScarab }
  ];
}

type CabinetShellProps = {
  children: ReactNode;
  email: string | null;
  greetingName: string;
  unread: number;
  tokens: number;
  supplementsDue: number;
  // The cabinet section of the dictionary, handed down by the layout: this
  // is a client component and cannot read cookies to find the locale.
  labels: Dictionary["cabinet"];
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
  tokens,
  supplementsDue,
  labels: t
}: CabinetShellProps) {
  const pathname = usePathname();
  const sections = buildSections(t);

  function isCurrent(href: string): boolean {
    return href === "/cabinet"
      ? pathname === "/cabinet"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="cab">
      <aside className="cab__side">
        <nav aria-label={t.navLabel} className="cab__nav">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = isCurrent(section.href);
            // Badges live where the action is: unread messages on the home
            // page, doses waiting to be taken on the tracker.
            const badge =
              section.href === "/cabinet"
                ? unread
                : section.href === "/cabinet/supplements"
                  ? supplementsDue
                  : 0;

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
          <span className="cab__sos-text">{t.sos}</span>
        </Link>

        {/* Leaving must never require searching. Quiet on purpose: an exit,
            not an invitation. */}
        <form action={logoutAction}>
          <button className="cab__logout" type="submit">
            <span aria-hidden="true">⎋</span>
            <span className="cab__logout-text">{t.logout}</span>
          </button>
        </form>
      </aside>

      <div className="cab__main">
        <header className="cab__top">
          <div className="cab__hello">
            <strong>
              {t.greeting}, {greetingName}!
            </strong>
            <span>{t.greetingNote}</span>
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
                <em>{email ?? t.clientFallback}</em>
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
