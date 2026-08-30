"use client";

import { useActionState } from "react";
import {
  refreshMedicalDigest,
  type DigestRefreshState
} from "@/app/(admin)/admin/medical-digest/actions";

const initialState: DigestRefreshState = { status: "idle", message: "" };

export function DigestRefreshButton({ locale }: { locale: "ru" | "en" }) {
  const [state, action, pending] = useActionState(refreshMedicalDigest, initialState);
  const ru = locale === "ru";

  return (
    <form action={action} className="medical-digest__refresh">
      <button disabled={pending} type="submit">
        <span aria-hidden="true">↻</span>
        {pending ? (ru ? "Собираем источники…" : "Collecting sources…") : (ru ? "Обновить сейчас" : "Refresh now")}
      </button>
      {state.status !== "idle" ? (
        <p className={state.status === "error" ? "is-error" : "is-success"} role="status">
          {ru
            ? state.message
            : state.status === "success"
              ? "Today’s digest has been updated."
              : "Could not build the digest. Check the connection and try again later."}
        </p>
      ) : null}
    </form>
  );
}


