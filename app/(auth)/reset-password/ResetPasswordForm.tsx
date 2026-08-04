"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import type { AuthActionState } from "@/lib/auth/types";

const initialState: AuthActionState = { status: "idle", message: "" };

type ResetPasswordFormProps = {
  labels: Dictionary["resetPassword"];
};

export function ResetPasswordForm({ labels }: ResetPasswordFormProps) {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  if (state.status === "success") {
    return (
      <div className="auth-form">
        <p className="form-message form-message--success">{state.message}</p>
        <Link className="button" href="/cabinet">
          {labels.toCabinet}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="auth-form">
      <label className="field">
        <span>{labels.passwordField}</span>
        <input
          autoComplete="new-password"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="field">
        <span>{labels.repeatField}</span>
        <input
          autoComplete="new-password"
          minLength={6}
          name="confirm"
          required
          type="password"
        />
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>
      {state.status === "error" ? (
        <p className="form-message form-message--error">
          {state.message} <Link href="/recovery">{labels.requestNew}</Link>
        </p>
      ) : null}
    </form>
  );
}
