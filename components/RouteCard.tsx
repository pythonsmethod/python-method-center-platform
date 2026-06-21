import Link from "next/link";
import type { AppRoute } from "@/lib/routes";

type RouteCardProps = {
  route: AppRoute;
};

export function RouteCard({ route }: RouteCardProps) {
  return (
    <Link className="route-card" href={route.href}>
      <span className="route-card__area">{route.area}</span>
      <span className="route-card__label">{route.label}</span>
      <span className="route-card__status">{route.status}</span>
    </Link>
  );
}
