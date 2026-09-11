"use client";

import { useActionState } from "react";
import {
  markGapEventRead,
  markGapEventUnread
} from "@/lib/assistant/escalation-actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";

type GapReadToggleProps = {
  eventId: string;
  read: boolean;
  labels: {
    markRead: string;
    markUnread: string;
  };
};

// One button, both directions. Which action it submits is decided by the
// event's current state, so a founder who has read something can always put
// it back — their own list only, never anyone else's.
export function GapReadToggle({ eventId, read, labels }: GapReadToggleProps) {
  const [state, formAction, pending] = useActionState(
    read ? markGapEventUnread : markGapEventRead,
    initialStaffActionState
  );
  const label = read ? labels.markUnread : labels.markRead;

  return (
    <form action={formAction} className="gap-read-toggle">
      <input name="eventId" type="hidden" value={eventId} />
      <button
        className="button button--secondary button--compact"
        disabled={pending}
        type="submit"
      >
        {label}
      </button>
      {state.status === "error" && state.message ? (
        <p aria-live="polite" className="form-message form-message--error" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
