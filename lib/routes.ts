export type AppRoute = {
  href: string;
  label: string;
};

export const navRoutes: AppRoute[] = [
  { href: "/", label: "Главная" },
  { href: "/shop", label: "Магазин" },
  { href: "/cabinet", label: "Кабинет" },
  { href: "/payment", label: "Оплата" },
  { href: "/login", label: "Вход" }
];
