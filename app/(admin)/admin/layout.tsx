import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";

type AdminLayoutProps = {
  children: React.ReactNode;
};

const adminNavRoutes = [
  { href: "/admin", label: "Панель" },
  { href: "/admin/cases", label: "Кейсы" },
  { href: "/admin/documents", label: "Документы" },
  { href: "/admin/requests", label: "Обращения" }
];

// Defense in depth for every /admin/* page: a future page that forgets its
// own getRequiredStaffUser call still fails closed here. Pages keep their
// per-status UI (setup notices, error panels) for the non-forbidden states.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const auth = await getRequiredStaffUser("/admin");

  if (auth.status === "forbidden") {
    notFound();
  }

  return (
    <>
      <div className="admin-nav">
        <span className="admin-nav__label">Рабочее место команды</span>
        <nav aria-label="Разделы рабочего места">
          {adminNavRoutes.map((route) => (
            <Link href={route.href} key={route.href}>
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </>
  );
}
