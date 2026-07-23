"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/auth/actions";
import type { AuthActionState } from "@/lib/auth/types";

const initialState: AuthActionState = { status: "idle", message: "" };

export function RecoveryForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  if (state.status === "success") {
    return <p className="form-message form-message--success">{state.message}</p>;
  }

  return (
    <form action={action} className="auth-form">
      <label className="field">
        <span>Email вашего аккаунта</span>
        <input
          autoComplete="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Отправляю…" : "Отправить ссылку для смены пароля"}
      </button>
      {state.status === "error" ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}
    </form>
  );
}
