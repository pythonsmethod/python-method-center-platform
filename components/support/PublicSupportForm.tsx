"use client";

import { useActionState } from "react";
import { submitPublicSupportRequest } from "@/lib/support/public-actions";
import { initialSupportRequestActionState } from "@/lib/support/types";

type PublicSupportFormLabels = {
  email: string;
  category: string;
  categoryLogin: string;
  categoryPayment: string;
  categoryTechnical: string;
  categoryOther: string;
  message: string;
  consent: string;
  submit: string;
  submitting: string;
};

export function PublicSupportForm({ labels }: { labels: PublicSupportFormLabels }) {
  const [state, action, pending] = useActionState(
    submitPublicSupportRequest,
    initialSupportRequestActionState
  );

  if (state.status === "success") {
    return <p className="form-message form-message--success">{state.message}</p>;
  }

  return (
    <form action={action} className="auth-form">
      {/* Honeypot: humans never see it, bots fill it. */}
      <input
        aria-hidden="true"
        autoComplete="off"
        name="website"
        style={{ display: "none" }}
        tabIndex={-1}
        type="text"
      />
      <label className="field">
        <span>{labels.email}</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>
      <label className="field">
        <span>{labels.category}</span>
        <select defaultValue="other" name="category">
          <option value="login">{labels.categoryLogin}</option>
          <option value="payment">{labels.categoryPayment}</option>
          <option value="technical">{labels.categoryTechnical}</option>
          <option value="other">{labels.categoryOther}</option>
        </select>
      </label>
      <label className="field">
        <span>{labels.message}</span>
        <textarea maxLength={4000} minLength={10} name="message" required rows={5} />
      </label>
      <label className="offer-gate__label">
        <input name="consent" required type="checkbox" />
        <span>{labels.consent}</span>
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>
      {state.status === "error" ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}
    </form>
  );
}
