"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { PaymentPlan } from "@/lib/payments/config";
import { recordPaymentOfferAcceptance } from "@/lib/payments/actions";

type PaymentPlanLabels = {
  planLabel: string;
  payButton: string;
  unavailable: string;
  offerCheckboxPrefix: string;
  offerCheckboxLink: string;
  offerHint: string;
};

export function PaymentPlans({
  plans,
  labels,
  children
}: {
  plans: PaymentPlan[];
  labels: PaymentPlanLabels;
  children?: ReactNode;
}) {
  const [accepted, setAccepted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  return (
    <>
      <div
        className={`offer-gate${
          showHint && !accepted ? " offer-gate--alert" : ""
        }`}
      >
        <label className="offer-gate__label">
          <input
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked);
              if (event.target.checked) {
                setShowHint(false);
              }
            }}
            type="checkbox"
          />
          <span>
            {labels.offerCheckboxPrefix}
            <Link href="/legal/offer" target="_blank">
              {labels.offerCheckboxLink}
            </Link>
          </span>
        </label>
        {showHint && !accepted ? (
          <p className="offer-gate__hint" role="alert">
            {labels.offerHint}
          </p>
        ) : null}
      </div>

      <section className="panel-grid">
        {children}
        {plans.map((plan) => (
          <div className="panel" key={plan.product}>
            <span className="panel__label">{labels.planLabel}</span>
            <h2>{plan.title}</h2>
            <p>{plan.description}</p>
            <p className="price-line">{plan.priceLine}</p>
            <div className="panel-actions">
              {plan.paymentLinkUrl ? (
                accepted ? (
                  <a
                    className="button"
                    href={plan.paymentLinkUrl}
                    onClick={() => {
                      void recordPaymentOfferAcceptance(plan.product);
                    }}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {labels.payButton}
                  </a>
                ) : (
                  <button
                    aria-disabled="true"
                    className="button button--locked"
                    onClick={() => setShowHint(true)}
                    type="button"
                  >
                    {labels.payButton}
                  </button>
                )
              ) : (
                <span className="status-badge">{labels.unavailable}</span>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
