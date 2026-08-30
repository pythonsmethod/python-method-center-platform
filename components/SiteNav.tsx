"use client";

import { Link } from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import {
  IconAnkh,
  IconScales,
  IconScarab,
  IconWingedSun
} from "@/components/icons/EgyptianIcons";
import { navRoutes } from "@/lib/routes";

const icons: Record<string, (props: { className?: string }) => React.ReactElement> = {
  "/": IconWingedSun,
  "/payment": IconScales,
  "/shop": IconScarab
};

export type NavViewer = "anonymous" | "client" | "staff";

type SiteNavProps = {
  labels: Record<string, string>;
  // Decides the last item: one door, three names. Staff need it to be
  // their own door — leaving the workspace used to drop them onto the
  // client-facing site with no way back except the footer, which reads
  // exactly like having been logged out and returned as a client.
  viewer: NavViewer;
};

// The top bar is what a visitor returns to all day long, so it is built to
// be aimed at: a sign, a word, and a lit frame on the page you are on.
export function SiteNav({ labels, viewer }: SiteNavProps) {
  const pathname = usePathname();

  function isCurrent(href: string): boolean {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  const isStaff = viewer === "staff";
  const accountHref = isStaff ? "/admin" : viewer === "client" ? "/cabinet" : "/login";
  const accountActive =
    isCurrent("/cabinet") || isCurrent("/login") || isCurrent("/admin");

  return (
    <nav aria-label={labels.sections ?? "Разделы сайта"} className="site-nav">
      {navRoutes.map((route) => {
        const Icon = icons[route.href] ?? IconAnkh;
        const active = isCurrent(route.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`site-nav__item${active ? " site-nav__item--active" : ""}`}
            href={route.href}
            key={route.href}
          >
            <span className="site-nav__icon">
              <Icon />
            </span>
            <span className="site-nav__label">
              {labels[route.href] ?? route.label}
            </span>
          </Link>
        );
      })}

      {viewer !== "anonymous" ? (
        <Link
          aria-current={accountActive ? "page" : undefined}
          className={`site-nav__item${accountActive ? " site-nav__item--active" : ""}`}
          href={accountHref}
        >
          <span className="site-nav__icon">
            <IconAnkh />
          </span>
          <span className="site-nav__label">
            {isStaff
              ? (labels["/admin"] ?? "Рабочее место")
              : (labels["/cabinet"] ?? "Кабинет")}
          </span>
        </Link>
      ) : (
        // A guest sees the two doors named apart. "Регистрация" opens the
        // signup tab directly — landing on the login form would make the
        // second button a lie.
        <span className="site-nav__auth">
          <Link className="site-nav__signin" href="/login">
            {labels["/login"] ?? "Вход"}
          </Link>
          <Link className="site-nav__signup" href="/login?mode=signup">
            {labels.signup ?? "Регистрация"}
          </Link>
        </span>
      )}
    </nav>
  );
}
