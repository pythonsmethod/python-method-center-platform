"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import { useActionState } from "react";
import { createSupportRequest } from "@/lib/support/actions";
import { initialSupportRequestActionState } from "@/lib/support/types";

type SupportRequestFormProps = {
  labels: Dictionary["cabinet"]["supportForm"];
};

export function SupportRequestForm({ labels }: SupportRequestFormProps) {
  const [state, formAction, pending] = useActionState(
    createSupportRequest,
    initialSupportRequestActionState
  );

  return (
    <form action={formAction} className="onboarding-form">
      <label className="field">
        <span>{labels.subject}</span>
        <input
          maxLength={200}
          name="subject"
          placeholder={labels.subjectPlaceholder}
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>{labels.message}</span>
        <textarea
          maxLength={5000}
          name="body"
          placeholder={labels.messagePlaceholder}
          required
          rows={4}
        />
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>

      {state.message ? (
        <p
          aria-live="polite"
          role="status"
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
