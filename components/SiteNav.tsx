"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAnkh,
  IconEyeOfHorus,
  IconScales,
  IconScarab,
  IconWingedSun
} from "@/components/icons/EgyptianIcons";
import { navRoutes } from "@/lib/routes";

const icons: Record<string, (props: { className?: string }) => React.ReactElement> = {
  "/": IconWingedSun,
  "/shop": IconScarab,
  "/cabinet": IconAnkh,
  "/payment": IconScales,
  "/login": IconEyeOfHorus
};

// The top bar is where a first-time visitor decides where to go. Words
// alone in a muted colour are easy to miss, so every destination gets its
// own sign and the current one is lit.
export function SiteNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Разделы сайта" className="site-nav">
      {navRoutes.map((route) => {
        const Icon = icons[route.href] ?? IconAnkh;
        const isActive =
          route.href === "/"
            ? pathname === "/"
            : pathname === route.href || pathname.startsWith(`${route.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`site-nav__item${isActive ? " site-nav__item--active" : ""}`}
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
    </nav>
  );
}
