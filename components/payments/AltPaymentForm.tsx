"use client";

import { useActionState } from "react";
import { submitAltPaymentRequest } from "@/lib/payments/alt-request-action";
import {
  ALT_PAYMENT_METHODS,
  ALT_PAYMENT_PLANS,
  altPaymentMethodLabels,
  altPaymentPlanLabels
} from "@/lib/payments/alt-validation";
import { initialSupportRequestActionState } from "@/lib/support/types";

export function AltPaymentForm({ consentLabel }: { consentLabel: string }) {
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
        <span>Email для ответа</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>
      <label className="field">
        <span>Ваша страна</span>
        <input
          autoComplete="country-name"
          maxLength={100}
          name="country"
          placeholder="Например: Казахстан"
          required
          type="text"
        />
      </label>
      <label className="field">
        <span>Какой тариф вы хотите оплатить</span>
        <select defaultValue="undecided" name="plan">
          {ALT_PAYMENT_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {altPaymentPlanLabels[plan]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Как вам удобно платить</span>
        <select defaultValue="bank" name="method">
          {ALT_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {altPaymentMethodLabels[method]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Комментарий (необязательно)</span>
        <textarea
          maxLength={2000}
          name="comment"
          placeholder="Что не получилось с картой, какой банк или сервис вам доступен"
          rows={4}
        />
      </label>
      <label className="offer-gate__label">
        <input name="consent" required type="checkbox" />
        <span>{consentLabel}</span>
      </label>

      {state.status === "error" ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Отправляем…" : "Запросить реквизиты"}
      </button>
    </form>
  );
}
