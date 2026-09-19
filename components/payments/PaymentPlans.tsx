"use client";

import { Link } from "@/components/LocaleLink";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { PaymentPlan } from "@/lib/payments/config";
import { PERSONAL_SUPPORT_PRODUCT } from "@/lib/payments/config";
import { recordPaymentOfferAcceptance } from "@/lib/payments/actions";

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
  durationLabel: string;
  durationOption: string;
  selectedTotal: string;
  giftIncluded: string;
  autoRenewLabel: string;
  autoRenewText: string;
  autoRenewUnavailable: string;
  taxNote: string;
};

function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (value, [key, replacement]) =>
      value.replaceAll(`{${key}}`, String(replacement)),
    template
  );
}

function money(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amountUsd);
}

// Payment happens after registration. Prices remain public, while a signed-in
// profile id is carried to Stripe so the webhook can attach money to the right
// account. Personal Support is one product; duration and renewal are choices,
// not separate products in our domain model.
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
  const [startAccepted, setStartAccepted] = useState(false);
  const [supportMonths, setSupportMonths] = useState(1);
  const [autoRenew, setAutoRenew] = useState(false);
  const accepted = offerAccepted && startAccepted;
  const [showHint, setShowHint] = useState(false);
  const gateRef = useRef<HTMLDivElement | null>(null);

  const supportPlan = plans.find(
    (plan) => plan.product === PERSONAL_SUPPORT_PRODUCT
  );
  const supportOption = useMemo(
    () =>
      supportPlan?.supportOptions?.find(
        (option) => option.months === supportMonths
      ) ?? supportPlan?.supportOptions?.[0] ?? null,
    [supportPlan, supportMonths]
  );

  function pointAtConsent() {
    setShowHint(true);
    gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function purchaseButton(plan: PaymentPlan, href: string | null) {
    if (!signedIn) {
      return (
        <Link className="button" href={signInHref}>
          {labels.signInToPay}
        </Link>
      );
    }

    if (!href) {
      return <span className="status-badge">{labels.unavailable}</span>;
    }

    if (!accepted) {
      return (
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
      );
    }

    return (
      <a
        className="button"
        href={href}
        onClick={() => {
          void recordPaymentOfferAcceptance(plan.product);
          void recordPaymentOfferAcceptance(plan.product, true);
        }}
        rel="noreferrer"
        target="_blank"
      >
        {labels.payButton}
      </a>
    );
  }

  return (
    <>
      {signedIn ? (
        <div
          className={`offer-gate${showHint && !accepted ? " offer-gate--alert" : ""}`}
          ref={gateRef}
        >
          <label className="offer-gate__label">
            <input
              checked={offerAccepted}
              onChange={(event) => {
                setOfferAccepted(event.target.checked);
                if (event.target.checked && startAccepted) setShowHint(false);
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
                if (event.target.checked && offerAccepted) setShowHint(false);
              }}
              type="checkbox"
            />
            <span>{labels.startCheckbox}</span>
          </label>

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
      ) : null}

      <section className="panel-grid payment-plans">
        {children}
        {plans.map((plan) => {
          if (plan.product !== PERSONAL_SUPPORT_PRODUCT) {
            return (
              <div className="panel" key={plan.product}>
                <span className="panel__label">{labels.planLabel}</span>
                <h2>{plan.title}</h2>
                <p>{plan.description}</p>
                <p className="price-line">{plan.priceLine}</p>
                <div className="panel-actions">
                  {purchaseButton(plan, plan.paymentLinkUrl)}
                </div>
              </div>
            );
          }

          const selected = supportOption;
          const selectedHref = selected
            ? autoRenew
              ? selected.autoRenewPaymentLinkUrl
              : selected.paymentLinkUrl
            : null;

          return (
            <div className="panel personal-support-plan" key={plan.product}>
              <span className="panel__label">{labels.planLabel}</span>
              <h2>{plan.title}</h2>
              <p>{plan.description}</p>
              <p className="price-line">{plan.priceLine}</p>

              <div className="personal-support-plan__controls">
                <label className="personal-support-plan__field">
                  <span>{labels.durationLabel}</span>
                  <select
                    onChange={(event) =>
                      setSupportMonths(Number.parseInt(event.target.value, 10))
                    }
                    value={supportMonths}
                  >
                    {plan.supportOptions?.map((option) => (
                      <option key={option.months} value={option.months}>
                        {interpolate(labels.durationOption, {
                          months: option.months,
                          days: option.durationDays,
                          amount: money(option.amountUsd)
                        })}
                      </option>
                    ))}
                  </select>
                </label>

                {selected ? (
                  <div className="personal-support-plan__summary" aria-live="polite">
                    <strong>
                      {labels.selectedTotal} {money(selected.amountUsd)}
                    </strong>
                    <span>{labels.giftIncluded}</span>
                  </div>
                ) : null}

                <label className="personal-support-plan__renew">
                  <input
                    checked={autoRenew}
                    onChange={(event) => setAutoRenew(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{labels.autoRenewLabel}</strong>
                    <small>{labels.autoRenewText}</small>
                  </span>
                </label>

                {autoRenew && selected && !selected.autoRenewPaymentLinkUrl ? (
                  <p className="personal-support-plan__notice" role="status">
                    {labels.autoRenewUnavailable}
                  </p>
                ) : null}

                <p className="personal-support-plan__tax">{labels.taxNote}</p>
              </div>

              <div className="panel-actions">
                {purchaseButton(plan, selectedHref)}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
