import { PageHeader } from "@/components/PageHeader";
import { DeliveryTaskCard } from "@/components/delivery/DeliveryTaskCard";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientDelivery } from "@/lib/delivery/queries";
import { getLocale } from "@/lib/i18n/locale";
import { DeliveryProfileForm } from "./DeliveryProfileForm";

export const dynamic = "force-dynamic";
export default async function DeliveryPage() {
  const [auth, locale] = await Promise.all([getRequiredUser("/cabinet/delivery"), getLocale()]);
  const ru = locale === "ru";
  if (auth.status === "missing-env") return <div className="page-shell"><p>Service unavailable.</p></div>;
  const data = await getClientDelivery(auth.userId);
  return <div className="page-shell"><PageHeader eyebrow={ru ? "Личный кабинет" : "Personal cabinet"} title={ru ? "Доставка" : "Delivery"} description={ru ? "Проверьте адрес и состояние отправления. После отправки здесь появится фотография документа с трек-номером." : "Review your address and shipment status. Once shipped, the document showing the tracking number will appear here."} />
    {data.error ? <p className="form-message form-message--error">{data.error}</p> : null}
    <section className="form-section"><DeliveryProfileForm locale={locale} profile={data.profile} /></section>
    <section><span className="panel__label">{ru ? "Отправления" : "Shipments"}</span>{data.tasks.length ? <div className="fulfillment-list">{data.tasks.map(task => <DeliveryTaskCard key={task.id} task={task} locale={locale} documentUrl={task.documentUrl} />)}</div> : <p className="empty-state">{ru ? "Отправлений пока нет." : "There are no shipments yet."}</p>}</section>
  </div>;
}
