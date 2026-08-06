"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import type { PaymentPlan } from "@/lib/payments/config";
import { recordPaymentOfferAcceptance } from "@/lib/payments/actions";
import { announcePaypalIntent } from "@/lib/payments/paypal-intent";

type PaymentPlanLabels = {
  planLabel: string;
  payButton: string;
  unavailable: string;
  startCheckbox: string;
  offerCheckboxPrefix: string;
  offerCheckboxLink: string;
  offerHint: string;
  refundLink: string;
  signInToPay: string;
  signInWhy: string;
};

// Payment happens after registration, never before.
//
// A payment link is public, so anyone could pay without an account — and
// then there was no account to attach the money to. The webhook fell back
// to matching the payer's email, which fails whenever someone pays with a
// different address from the one they registered with, and the money ended
// up in a Telegram message with nobody to give it to.
//
// Signed in, the account id travels with the payment and the match cannot
// fail. So the button asks for an account first, and the prices stay
// visible to everyone: the point is not to hide what things cost.
export function PaymentPlans({
  plans,
  labels,
  signedIn = true,
  signInHref = "/login",
  children
}: {
  plans: PaymentPlan[];
  labels: PaymentPlanLabels;
  signedIn?: boolean;
  signInHref?: string;
  children?: ReactNode;
}) {
  const [offerAccepted, setOfferAccepted] = useState(false);
  // Clause 8 of the offer requires a separate confirmation that the work
  // begin immediately — the refusal of refunds rests on it. One combined
  // tick cannot carry two different statements.
  const [startAccepted, setStartAccepted] = useState(false);
  const accepted = offerAccepted && startAccepted;
  const [showHint, setShowHint] = useState(false);
  const gateRef = useRef<HTMLDivElement | null>(null);

  // The consent checkbox sits above the plans, so on a phone a locked
  // button and the reason it is locked are on different screens. Clicking
  // a locked button brings the visitor back to the checkbox instead of
  // doing nothing.
  function pointAtConsent() {
    setShowHint(true);
    gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <>
      {signedIn ? (
      <div
        className={`offer-gate${
          showHint && !accepted ? " offer-gate--alert" : ""
        }`}
        ref={gateRef}
      >
        <label className="offer-gate__label">
          <input
            checked={offerAccepted}
            onChange={(event) => {
              setOfferAccepted(event.target.checked);
              if (event.target.checked && startAccepted) {
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

        <label className="offer-gate__label">
          <input
            checked={startAccepted}
            onChange={(event) => {
              setStartAccepted(event.target.checked);
              if (event.target.checked && offerAccepted) {
                setShowHint(false);
              }
            }}
            type="checkbox"
          />
          <span>{labels.startCheckbox}</span>
        </label>

        {/* The tick above is where the refusal of refunds is agreed to, so
            the terms it rests on are one click away from it — not only in
            the footer. */}
        <p className="offer-gate__aside">
          <Link href="/legal/refund" target="_blank">
            {labels.refundLink}
          </Link>
        </p>

        {showHint && !accepted ? (
          <p className="offer-gate__hint" role="alert">
            {labels.offerHint}
          </p>
        ) : null}
      </div>
      ) : (
        <div className="offer-gate offer-gate--signin">
          <p>{labels.signInWhy}</p>
          <Link className="button" href={signInHref}>
            {labels.signInToPay}
          </Link>
        </div>
      )}

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
                !signedIn ? (
                  <Link className="button" href={signInHref}>
                    {labels.signInToPay}
                  </Link>
                ) : accepted ? (
                  <a
                    className="button"
                    href={plan.paymentLinkUrl}
                    onClick={() => {
                      void recordPaymentOfferAcceptance(plan.product);
                      void recordPaymentOfferAcceptance(plan.product, true);
                    }}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {labels.payButton}
                  </a>
                ) : (
                  <div className="plan-locked">
                    <button
                      aria-disabled="true"
                      className="button button--locked"
                      onClick={pointAtConsent}
                      type="button"
                    >
                      {labels.payButton}
                    </button>
                    <span className="plan-locked__note">🔒 {labels.offerHint}</span>
                  </div>
                )
              ) : (
                <span className="status-badge">{labels.unavailable}</span>
              )}
            </div>

            {plan.paypalUrl ? (
              <div className="plan-paypal">
                {!signedIn ? (
                  <Link className="button button--paypal" href={signInHref}>
                    {labels.signInToPay}
                  </Link>
                ) : accepted ? (
                  <a
                    className="button button--paypal"
                    href={plan.paypalUrl}
                    onClick={() => {
                      void recordPaymentOfferAcceptance(plan.product);
                      void recordPaymentOfferAcceptance(plan.product, true);
                      void announcePaypalIntent(plan.product);
                    }}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Оплатить через PayPal
                  </a>
                ) : (
                  <button
                    aria-disabled="true"
                    className="button button--paypal button--locked"
                    onClick={pointAtConsent}
                    type="button"
                  >
                    Оплатить через PayPal
                  </button>
                )}
                <span className="plan-paypal__note">
                  Оплата через PayPal подтверждается человеком — доступ
                  открывается после проверки, обычно в тот же рабочий день.
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </>
  );
}
