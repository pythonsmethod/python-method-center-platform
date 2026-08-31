"use client";

import { useActionState } from "react";
import { assignDeliveryTask } from "@/lib/delivery/actions";
import { initialDeliveryActionState, type DeliveryVolunteer } from "@/lib/delivery/types";

export function AssignVolunteerForm({ taskId, currentId, volunteers, locale }: {
  taskId: string;
  currentId?: string | null;
  volunteers: DeliveryVolunteer[];
  locale: "ru" | "en";
}) {
  const [state, action, pending] = useActionState(assignDeliveryTask, initialDeliveryActionState);
  const ru = locale === "ru";
  return <form action={action} className="panel-actions">
    <input name="taskId" type="hidden" value={taskId} />
    <label className="field">
      <span>{ru ? "Ответственный волонтёр" : "Assigned volunteer"}</span>
      <select defaultValue={currentId ?? ""} name="volunteerId" required>
        <option disabled value="">{ru ? "Выберите волонтёра" : "Select a volunteer"}</option>
        {volunteers.map(volunteer => <option key={volunteer.id} value={volunteer.id}>
          {volunteer.full_name || volunteer.email || volunteer.id}
        </option>)}
      </select>
    </label>
    <button className="button button--secondary button--compact" disabled={pending}>
      {pending ? (ru ? "Сохраняем…" : "Saving…") : currentId ? (ru ? "Переназначить" : "Reassign") : (ru ? "Назначить" : "Assign")}
    </button>
    {state.message ? <p className={`form-message form-message--${state.status}`}>{state.message}</p> : null}
  </form>;
}
