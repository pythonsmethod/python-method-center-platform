import { Link } from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";
import { LogoutButton } from "@/components/LogoutButton";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { getStaffUnreadCounts } from "@/lib/messages/queries";
import { getDeliveryAttentionCounts } from "@/lib/delivery/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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
        assistant: "ИИ и знания",
        digest: "Онкологический обзор",
        chess: "Шахматы",
        requests: "Обращения",
        delivery: "Доставки",
        founder: "Обзор",
        home: "На главную сайта",
        logout: "Выйти"
      }
    : {
        workspace: "Team workspace",
        navigation: "Workspace sections",
        today: "Today",
        clients: "Clients",
        documents: "Documents",
        assistant: "AI & knowledge",
        digest: "Oncology digest",
        chess: "Chess",
        requests: "Requests",
        delivery: "Deliveries",
        founder: "Overview",
        home: "Website home",
        logout: "Sign out"
      };

  const privateAssistantRole = auth.status === "authorized"
    ? resolvePrivateAssistantRole(auth.email)
    : null;
  const db = createSupabaseServiceClient();
  const [messageCounts, deliveryCounts, documentAttention] = auth.status === "authorized"
    ? await Promise.all([
        getStaffUnreadCounts(),
        getDeliveryAttentionCounts(),
        db?.from("uploaded_documents").select("id", { count: "exact", head: true }).in("document_status", ["needs_reupload", "failed"])
      ])
    : [{ total: 0, byCase: {} }, { admin: 0 }, undefined];
  const adminNavRoutes = [
    { href: "/admin", label: labels.today, icon: "⌂" },
    { href: "/admin/cases", label: labels.clients, icon: "♙", badge: messageCounts.total },
    { href: "/admin/documents", label: labels.documents, icon: "▤", badge: documentAttention?.count ?? 0 },
    { href: "/admin/fulfillment", label: labels.delivery, icon: "▣", badge: deliveryCounts.admin },
    ...(privateAssistantRole
      ? [{ href: "/admin/assistant", label: labels.assistant, icon: "✦" }]
      : []),
    ...(privateAssistantRole
      ? [{ href: "/admin/medical-digest", label: labels.digest, icon: "⌁" }]
      : []),
    ...(auth.status === "authorized"
      ? [{ href: "/admin/chess", label: labels.chess, icon: "♞" }]
      : []),
    ...(auth.status === "authorized"
      ? [{ href: "/admin/requests", label: labels.requests, icon: "✉" }]
      : [])
  ];

  return (
    <>
      {auth.status === "authorized" ? (
        <div className="admin-mobile-utility" aria-label={labels.workspace}>
          <Link href="/">← {labels.home}</Link>
          <LogoutButton label={labels.logout} />
        </div>
      ) : null}
      <div className="admin-nav">
        <span className="admin-nav__label">{labels.workspace}</span>
        <nav aria-label={labels.navigation}>
          {adminNavRoutes.map((route) => (
            <Link href={route.href} key={route.href}>
              <span className="admin-nav__icon" aria-hidden="true">{route.icon}</span>
              <span>{route.label}</span>
              {route.badge ? <b className="unread-badge unread-badge--inline">{route.badge}</b> : null}
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
