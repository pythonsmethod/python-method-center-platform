import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";

type AdminLayoutProps = {
  children: React.ReactNode;
};

// Defense in depth for every /admin/* page: a future page that forgets its
// own getRequiredStaffUser call still fails closed here. Pages keep their
// per-status UI (setup notices, error panels) for the non-forbidden states.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const auth = await getRequiredStaffUser("/admin");
  const locale = await getLocale();

  if (auth.status === "forbidden") {
    notFound();
  }

  const labels = locale === "ru"
    ? {
        workspace: "Рабочее место команды",
        navigation: "Разделы рабочего места",
        today: "Сегодня",
        clients: "Клиенты",
        documents: "Документы",
        requests: "Обращения",
        founder: "Обзор"
      }
    : {
        workspace: "Team workspace",
        navigation: "Workspace sections",
        today: "Today",
        clients: "Clients",
        documents: "Documents",
        requests: "Requests",
        founder: "Overview"
      };

  const adminNavRoutes = [
    { href: "/admin", label: labels.today, icon: "⌂" },
    { href: "/admin/cases", label: labels.clients, icon: "♙" },
    { href: "/admin/documents", label: labels.documents, icon: "▤" },
    { href: "/admin/requests", label: labels.requests, icon: "✉" }
  ];

  return (
    <>
      <div className="admin-nav">
        <span className="admin-nav__label">{labels.workspace}</span>
        <nav aria-label={labels.navigation}>
          {adminNavRoutes.map((route) => (
            <Link href={route.href} key={route.href}>
              <span className="admin-nav__icon" aria-hidden="true">{route.icon}</span>
              <span>{route.label}</span>
            </Link>
          ))}
          {auth.status === "authorized" && auth.role === "admin" ? (
            <Link className="admin-nav__founder" href="/admin/founder">
              <span className="admin-nav__icon" aria-hidden="true">◉</span>
              <span>{labels.founder}</span>
            </Link>
          ) : null}
        </nav>
      </div>
      {children}
    </>
  );
}
