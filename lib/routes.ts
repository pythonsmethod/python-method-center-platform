export type AppRoute = {
  href: string;
  label: string;
};

// The account is one door, not two: the last item says "Вход" to a guest
// and "Кабинет" to someone signed in, so it is rendered separately.
export const navRoutes: AppRoute[] = [
  { href: "/", label: "Главная" },
  { href: "/payment", label: "Тарифы" },
  { href: "/shop", label: "Магазин" },
  { href: "/support", label: "Поддержка" }
];
