"use client";

import { useActionState } from "react";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import { supportStatusLabel } from "@/lib/i18n/status-labels";
import { updateSupportRequestStatus } from "@/lib/support/actions";
import { STAFF_ASSIGNABLE_SUPPORT_STATUSES } from "@/lib/support/types";

type RequestStatusButtonsProps = {
  requestId: string;
  currentStatus: string;
};

export function RequestStatusButtons({
  requestId,
  currentStatus
}: RequestStatusButtonsProps) {
  const [state, formAction, pending] = useActionState(
    updateSupportRequestStatus,
    initialStaffActionState
  );

  return (
    <div>
      <div className="panel-actions">
        {STAFF_ASSIGNABLE_SUPPORT_STATUSES.filter(
          (status) => status !== currentStatus
        ).map((status) => (
          <form action={formAction} key={status}>
            <input name="requestId" type="hidden" value={requestId} />
            <input name="nextStatus" type="hidden" value={status} />
            <button
              className="button button--secondary button--compact"
              disabled={pending}
              type="submit"
            >
              {supportStatusLabel(status)}
            </button>
          </form>
        ))}
      </div>
      {state.message ? (
        <p
          className={`form-message form-message--${
            state.status === "success" ? "success" : "error"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
