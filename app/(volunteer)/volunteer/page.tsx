import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DeliveryTaskCard } from "@/components/delivery/DeliveryTaskCard";
import { getRequiredVolunteer } from "@/lib/auth/require-volunteer";
import { getVolunteerDeliveryTasks } from "@/lib/delivery/queries";
import { getLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";
export default async function VolunteerPage() {
  const [auth, locale] = await Promise.all([getRequiredVolunteer("/volunteer"), getLocale()]);
  if (auth.status === "forbidden") notFound();
  const ru = locale === "ru";
  if (auth.status !== "authorized") return <div className="page-shell"><p>Service unavailable.</p></div>;
  const data = await getVolunteerDeliveryTasks(auth.userId);
  return <div className="page-shell page-shell--wide"><PageHeader eyebrow={ru ? "Доставка" : "Delivery"} title={ru ? "Задания на отправку" : "Shipment tasks"} description={ru ? "После отправки прикрепите одну фотографию документа, где виден трек-номер. Комментарий нужен только если клиенту нужно что-то сообщить." : "After shipping, attach one photo of the document showing the tracking number. Add a comment only when the client needs extra information."} />
    {data.error ? <p className="form-message form-message--error">{data.error}</p> : null}
    <div className="fulfillment-list">{data.tasks.map(task => <DeliveryTaskCard key={task.id} task={task} locale={locale} volunteer />)}</div>
    {!data.tasks.length ? <p className="empty-state">{ru ? "Заданий пока нет." : "There are no tasks yet."}</p> : null}
  </div>;
}
