"use client";

import { useActionState } from "react";
import {
  CASE_DIRECTIONS,
  CASE_STATUSES,
  CASE_URGENCIES
} from "@/lib/cases/constants";
import { updateCaseState } from "@/lib/cases/staff-actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel
} from "@/lib/i18n/status-labels";

type CaseManagementFormProps = {
  caseId: string;
  status: string;
  urgency: string;
  direction: string;
};

export function CaseManagementForm({
  caseId,
  status,
  urgency,
  direction
}: CaseManagementFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCaseState,
    initialStaffActionState
  );

  return (
    <form action={formAction} className="onboarding-form">
      <input name="caseId" type="hidden" value={caseId} />
      <label className="field">
        <span>Статус</span>
        <select defaultValue={status} name="status">
          {CASE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {caseStatusLabel(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Срочность</span>
        <select defaultValue={urgency} name="urgency">
          {CASE_URGENCIES.map((value) => (
            <option key={value} value={value}>
              {caseUrgencyLabel(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Направление</span>
        <select defaultValue={direction} name="direction">
          {CASE_DIRECTIONS.map((value) => (
            <option key={value} value={value}>
              {caseDirectionLabel(value)}
            </option>
          ))}
        </select>
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Сохранение..." : "Сохранить изменения"}
      </button>
      {state.message ? (
        <p
          className={`form-message form-message--${
            state.status === "success" ? "success" : "error"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
