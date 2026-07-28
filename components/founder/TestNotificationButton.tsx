"use client";

import { useActionState } from "react";
import {
  initialTestNotificationState,
  sendTestNotification,
  type TestNotificationState
} from "@/lib/notifications/test-action";

async function runTest(): Promise<TestNotificationState> {
  return sendTestNotification();
}

export function TestNotificationButton() {
  const [state, action, pending] = useActionState(
    runTest,
    initialTestNotificationState
  );

  return (
    <form action={action}>
      <button className="button button--secondary" disabled={pending} type="submit">
        {pending ? "Отправляю…" : "Отправить проверочный сигнал"}
      </button>
      {state.status !== "idle" ? (
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
