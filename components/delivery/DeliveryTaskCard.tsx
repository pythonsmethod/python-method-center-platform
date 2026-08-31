"use client";

import { useActionState } from "react";
import { confirmShipment, deleteShipmentDocument } from "@/lib/delivery/actions";
import { deliveryStatusLabel } from "@/lib/delivery/profile";
import { initialDeliveryActionState, type DeliveryTask } from "@/lib/delivery/types";

export function DeliveryTaskCard({ task, locale, volunteer = false, admin = false, documentUrl }: { task: DeliveryTask; locale: "ru" | "en"; volunteer?: boolean; admin?: boolean; documentUrl?: string | null }) {
  const [state, action, pending] = useActionState(confirmShipment, initialDeliveryActionState);
  const ru = locale === "ru";
  return <article className="panel fulfillment-task">
    <div className="fulfillment-task__head"><div><span className="panel__label">{new Intl.DateTimeFormat(locale).format(new Date(task.created_at))}</span><h2>{task.recipient_name}</h2></div><strong>{deliveryStatusLabel(task.status, locale)}</strong></div>
    <p><strong>Email:</strong> {task.recipient_email}</p><p><strong>{ru ? "Телефон" : "Phone"}:</strong> {task.recipient_phone}</p>
    <address>{task.delivery_address}</address>
    {task.delivery_instructions ? <p><strong>{ru ? "Дополнительные инструкции" : "Additional instructions"}:</strong> {task.delivery_instructions}</p> : null}
    {task.shipped_at ? <p>{ru ? "Дата отправки" : "Shipped"}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(task.shipped_at))}</p> : null}
    {task.volunteer_comment ? <p><strong>{ru ? "Комментарий о доставке" : "Delivery comment"}:</strong> {task.volunteer_comment}</p> : null}
    {documentUrl ? <a className="button button--secondary" href={documentUrl} rel="noreferrer" target="_blank">{ru ? "Открыть документ с трек-номером" : "Open document with tracking number"}</a> : null}
    {task.shipment_document_path && (volunteer || admin) ? <form action={deleteShipmentDocument} onSubmit={(event) => { if (!window.confirm(ru ? "Удалить документ и вернуть отправление на повторную загрузку?" : "Delete the document and return the shipment for another upload?")) event.preventDefault(); }}>
      <input name="taskId" type="hidden" value={task.id} />
      <button className="button button--danger button--compact" type="submit">{ru ? "Удалить и загрузить заново" : "Delete and upload again"}</button>
    </form> : null}
    {volunteer && task.status === "preparing" ? <form action={action} className="onboarding-form" encType="multipart/form-data">
      <input name="taskId" type="hidden" value={task.id} />
      <label className="field"><span>{ru ? "Фотография документа, где виден трек-номер" : "Photo of the document showing the tracking number"}</span><input accept="image/jpeg,image/png,image/heic,image/heif,application/pdf" name="document" type="file" required /></label>
      <label className="field"><span>{ru ? "Комментарий для клиента (если нужно)" : "Comment for the client (if needed)"}</span><textarea name="comment" rows={3} maxLength={1000} /></label>
      <button className="button" disabled={pending}>{pending ? (ru ? "Отправляем…" : "Submitting…") : (ru ? "Подтвердить отправку" : "Confirm shipment")}</button>
      {state.message ? <p className={`form-message form-message--${state.status}`}>{state.message}</p> : null}
    </form> : null}
  </article>;
}
