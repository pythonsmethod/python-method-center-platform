"use client";

import { useActionState, useState } from "react";
import { resendConfirmationEmail } from "@/lib/auth/actions";
import {
  initialAuthActionState,
  type AuthActionState
} from "@/lib/auth/types";

type CheckEmailActionsLabels = {
  resend: string;
  resending: string;
  askEmail: string;
  emailLabel: string;
};

type CheckEmailActionsProps = {
  // Known when the letter was requested in this browser. Opened elsewhere
  // — a link forwarded to a relative, say — the address has to be asked
  // for, because without it there is nothing to send again.
  email: string | null;
  labels: CheckEmailActionsLabels;
};

function messageClassName(state: AuthActionState): string {
  return `form-message form-message--${state.status}`;
}

export function CheckEmailActions({ email, labels }: CheckEmailActionsProps) {
  const [state, action, pending] = useActionState(
    resendConfirmationEmail,
    initialAuthActionState
  );
  const [typedEmail, setTypedEmail] = useState("");

  return (
    <>
      <form action={action} className="check-email__resend">
        {email ? (
          <input name="email" type="hidden" value={email} />
        ) : (
          <label className="field">
            <span>{labels.emailLabel}</span>
            <input
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              name="email"
              onChange={(event) => setTypedEmail(event.target.value)}
              placeholder="client@example.com"
              required
              spellCheck={false}
              type="email"
              value={typedEmail}
            />
            <small className="field__hint">{labels.askEmail}</small>
          </label>
        )}

        <button
          className="button button--secondary"
          disabled={pending}
          type="submit"
        >
          {pending ? labels.resending : labels.resend}
        </button>
      </form>

      {state.message ? (
        <p className={messageClassName(state)}>{state.message}</p>
      ) : null}
    </>
  );
}
