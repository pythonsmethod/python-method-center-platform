import Link from "next/link";
import {
  IconAnkh,
  IconEyeOfHorus,
  IconPapyrus,
  IconScales,
  IconWater,
  IconWingedSun
} from "@/components/icons/EgyptianIcons";
import type { NavViewer } from "@/components/SiteNav";
import type { Locale } from "@/lib/i18n/locale";

type PublicMobileDockProps = {
  locale: Locale;
  // The dock is the whole of the site navigation on a phone, so it has to
  // name the right door for whoever is holding the phone. It used to be
  // rendered for guests only; signing in then took the dock away and left
  // a signed-in person with the desktop nav stacked into a 300px-tall
  // block — a third of the screen before any content, and a completely
  // different-looking site than the one they registered on.
  viewer: NavViewer;
};

export function PublicMobileDock({ locale, viewer }: PublicMobileDockProps) {
  const ru = locale === "ru";

  // One slot, three names — the same rule the top bar follows, so the two
  // navigations never disagree about where a person's own door is.
  const account =
    viewer === "staff"
      ? { href: "/admin", label: ru ? "Рабочее место" : "Workspace" }
      : viewer === "client"
        ? { href: "/cabinet", label: ru ? "Кабинет" : "Cabinet" }
        : {
            href: "/login",
            label: ru ? "Вход / Регистрация" : "Sign in / Sign up"
          };

  const items = [
    { href: "/", label: ru ? "Главная" : "Home", Icon: IconWingedSun },
    { href: "/payment", label: ru ? "Сопровождение" : "Program", Icon: IconScales },
    { href: "/shop", label: ru ? "Магазин" : "Shop", Icon: IconEyeOfHorus },
    { href: "/review", label: ru ? "Бесплатный разбор" : "Free review", Icon: IconPapyrus },
    { href: "/support", label: ru ? "Поддержка" : "Support", Icon: IconWater },
    { href: account.href, label: account.label, Icon: IconAnkh }
  ];

  return (
    <nav
      aria-label={ru ? "Быстрая навигация" : "Quick navigation"}
      className="public-mobile-dock"
    >
      {items.map(({ href, label, Icon }) => (
        <Link href={href} key={href}>
          <Icon className="public-mobile-dock__icon" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
