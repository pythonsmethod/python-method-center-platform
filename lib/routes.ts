export type AppRoute = {
  href: string;
  label: string;
  area: string;
  status: "scaffold";
};

export const appRoutes: AppRoute[] = [
  { href: "/", label: "Home", area: "Public website", status: "scaffold" },
  { href: "/login", label: "Login", area: "Authentication", status: "scaffold" },
  { href: "/onboarding", label: "Onboarding", area: "Client intake", status: "scaffold" },
  { href: "/cabinet", label: "Cabinet", area: "Client cabinet", status: "scaffold" },
  { href: "/admin", label: "Admin", area: "Admin workspace", status: "scaffold" },
  { href: "/payment", label: "Payment", area: "Payment entry", status: "scaffold" },
  { href: "/support", label: "Support", area: "Support workspace", status: "scaffold" }
];
