"use client";

import { useActionState } from "react";
import { PAYMENT_PRODUCTS } from "@/lib/cases/constants";
import { recordCasePayment } from "@/lib/cases/staff-actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import { paymentProductLabel } from "@/lib/i18n/status-labels";

type PaymentRecordFormProps = {
  caseId: string;
};

export function PaymentRecordForm({ caseId }: PaymentRecordFormProps) {
  const [state, formAction, pending] = useActionState(
    recordCasePayment,
    initialStaffActionState
  );

  return (
    <form action={formAction} className="onboarding-form">
      <input name="caseId" type="hidden" value={caseId} />
      <label className="field">
        <span>Продукт</span>
        <select defaultValue="support_5_weeks" name="product">
          {PAYMENT_PRODUCTS.map((product) => (
            <option key={product} value={product}>
              {paymentProductLabel(product)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Сумма (без разделителей тысяч, например 490 или 490.50)</span>
        <input
          inputMode="decimal"
          name="amount"
          pattern="\d{1,7}([.,]\d{1,2})?"
          placeholder="490"
          required
          type="text"
        />
      </label>
      <label className="field">
        <span>Валюта</span>
        <input
          defaultValue="USD"
          maxLength={3}
          name="currency"
          required
          type="text"
        />
      </label>
      <label className="field">
        <span>Референс платежа (Stripe ID, № счёта)</span>
        <input name="processorReference" type="text" />
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Запись..." : "Записать оплату"}
      </button>
      {state.message ? (
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
