import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DeliveryTaskCard } from "@/components/delivery/DeliveryTaskCard";
import { InviteVolunteerForm } from "@/components/delivery/InviteVolunteerForm";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getDeliveryOverview } from "@/lib/delivery/queries";
import { getLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";
export default async function FulfillmentPage() {
  const [auth, locale] = await Promise.all([getRequiredStaffUser("/admin/fulfillment"), getLocale()]);
  if (auth.status === "forbidden") notFound();
  const ru = locale === "ru";
  const data = await getDeliveryOverview();
  return <div className="page-shell page-shell--wide"><PageHeader eyebrow={ru ? "Рабочее место Анны" : "Anna's workspace"} title={ru ? "Доставки" : "Deliveries"} description={ru ? "Адреса, состояния, документы с трек-номерами и комментарии волонтёров." : "Addresses, statuses, tracking documents, and volunteer comments."} />
    {auth.status === "authorized" && auth.role === "admin" ? <section className="panel"><span className="panel__label">{ru ? "Волонтёры" : "Volunteers"}</span><h2>{ru ? "Назначить страну" : "Assign a country"}</h2><InviteVolunteerForm locale={locale} /></section> : null}
    {data.error ? <p className="form-message form-message--error">{data.error}</p> : null}
    <div className="fulfillment-list">{data.tasks.map(task => <DeliveryTaskCard key={task.id} task={task} locale={locale} documentUrl={task.documentUrl} />)}</div>
    {!data.tasks.length ? <p className="empty-state">{ru ? "Доставок пока нет." : "There are no deliveries yet."}</p> : null}
  </div>;
}
