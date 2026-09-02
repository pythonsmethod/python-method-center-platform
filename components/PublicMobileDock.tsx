import { Link } from "@/components/LocaleLink";
import {
  IconAnkh,
  IconEyeOfHorus,
  IconScales,
  IconWater,
  IconWingedSun
} from "@/components/icons/EgyptianIcons";
import type { Locale } from "@/lib/i18n/locale";
import type { NavViewer } from "@/components/SiteNav";

type PublicMobileDockProps = {
  locale: Locale;
  viewer: NavViewer;
};

export function PublicMobileDock({ locale, viewer }: PublicMobileDockProps) {
  const ru = locale === "ru";
  const account = viewer === "staff"
    ? { href: "/admin", label: ru ? "Рабочее место" : "Workspace" }
    : viewer === "client"
      ? { href: "/cabinet", label: ru ? "Кабинет" : "Account" }
      : { href: "/login", label: ru ? "Вход / Регистрация" : "Sign in / Sign up" };
  const items = [
    { href: "/", label: ru ? "Главная" : "Home", Icon: IconWingedSun },
    { href: "/payment", label: ru ? "Тарифы" : "Plans", Icon: IconScales },
    { href: "/shop", label: ru ? "Магазин" : "Shop", Icon: IconEyeOfHorus },
    { href: "/support", label: ru ? "Поддержка" : "Support", Icon: IconWater },
    { ...account, Icon: IconAnkh }
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
