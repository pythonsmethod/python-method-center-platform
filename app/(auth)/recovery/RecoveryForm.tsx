"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/auth/actions";
import type { AuthActionState } from "@/lib/auth/types";

const initialState: AuthActionState = { status: "idle", message: "" };

type RecoveryFormProps = {
  labels: Dictionary["recovery"];
};

export function RecoveryForm({ labels }: RecoveryFormProps) {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  if (state.status === "success") {
    return <p aria-live="polite" className="form-message form-message--success" role="status">{state.message}</p>;
  }

  return (
    <form action={action} className="auth-form">
      <label className="field">
        <span>{labels.emailField}</span>
        <input
          autoComplete="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>
      {state.status === "error" ? (
        <p aria-live="assertive" className="form-message form-message--error" role="alert">{state.message}</p>
      ) : null}
    </form>
  );
}
