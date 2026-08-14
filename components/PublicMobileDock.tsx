import Link from "next/link";
import {
  IconAnkh,
  IconEyeOfHorus,
  IconPapyrus,
  IconScales,
  IconWater,
  IconWingedSun
} from "@/components/icons/EgyptianIcons";
import type { Locale } from "@/lib/i18n/locale";

type PublicMobileDockProps = {
  locale: Locale;
};

export function PublicMobileDock({ locale }: PublicMobileDockProps) {
  const ru = locale === "ru";
  const items = [
    { href: "/", label: ru ? "Главная" : "Home", Icon: IconWingedSun },
    { href: "/payment", label: ru ? "Сопровождение" : "Program", Icon: IconScales },
    { href: "/shop", label: ru ? "Магазин" : "Shop", Icon: IconEyeOfHorus },
    { href: "/review", label: ru ? "Бесплатный разбор" : "Free review", Icon: IconPapyrus },
    { href: "/support", label: ru ? "Поддержка" : "Support", Icon: IconWater },
    { href: "/login", label: ru ? "Вход / Регистрация" : "Sign in / Sign up", Icon: IconAnkh }
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
