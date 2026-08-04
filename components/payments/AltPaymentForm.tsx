"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import { useActionState } from "react";
import { submitAltPaymentRequest } from "@/lib/payments/alt-request-action";
import {
  ALT_PAYMENT_METHODS,
  ALT_PAYMENT_PLANS
} from "@/lib/payments/alt-validation";
import { initialSupportRequestActionState } from "@/lib/support/types";

export function AltPaymentForm({ labels }: { labels: Dictionary["altPayment"] }) {
  const [state, action, pending] = useActionState(
    submitAltPaymentRequest,
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
        <span>{labels.country}</span>
        <input
          autoComplete="country-name"
          maxLength={100}
          name="country"
          placeholder={labels.countryPlaceholder}
          required
          type="text"
        />
      </label>
      <label className="field">
        <span>{labels.plan}</span>
        <select defaultValue="undecided" name="plan">
          {ALT_PAYMENT_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {labels.planLabels[plan]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{labels.method}</span>
        <select defaultValue="bank" name="method">
          {ALT_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {labels.methodLabels[method]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{labels.comment}</span>
        <textarea
          maxLength={2000}
          name="comment"
          placeholder={labels.commentPlaceholder}
          rows={4}
        />
      </label>
      <label className="offer-gate__label">
        <input name="consent" required type="checkbox" />
        <span>{labels.consent}</span>
      </label>

      {state.status === "error" ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
