"use client";

import { Link } from "@/components/LocaleLink";
import { useActionState, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import { submitOnboarding } from "@/lib/onboarding/actions";
import { COUNTRY_CODES, countryFlag } from "@/lib/profile/identity";
import { DeliveryAddressFields } from "@/components/delivery/DeliveryAddressFields";
import {
  initialOnboardingActionState,
  type OnboardingProfileDefaults
} from "@/lib/onboarding/types";

type OnboardingFormProps = {
  profileDefaults: OnboardingProfileDefaults;
  // The whole onboarding section of the dictionary. This form carries both
  // consents, and a consent a person cannot read is not consent.
  labels: Dictionary["onboarding"];
  locale: Locale;
};

export function OnboardingForm({
  profileDefaults,
  labels,
  locale
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    submitOnboarding,
    initialOnboardingActionState
  );
  // Clause 7 of the offer: under 21 only with a parent or legal guardian.
  // Choosing that path swaps the age confirmation for the participant's own
  // details, so the person filling the form is never the person described.
  const [recipient, setRecipient] = useState("self");
  const isAnotherPerson = recipient !== "self";
  const isGuardian = recipient === "minor";
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const countries = COUNTRY_CODES
    .map((code) => ({ code, name: regionNames.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <form action={formAction} className="onboarding-form">
      <label className="field">
        <span>{labels.fullName}</span>
        <input
          autoComplete="name"
          defaultValue={profileDefaults.fullName}
          name="fullName"
          required
          type="text"
        />
        <small className="field__hint">{labels.fullNameHint}</small>
      </label>

      <label className="field">
        <span>{labels.country}</span>
        <select defaultValue={profileDefaults.countryCode} name="countryCode" required>
          <option disabled value="">{labels.countryPlaceholder}</option>
          {countries.map(({ code, name }) => (
            <option key={code} value={code}>{countryFlag(code)} {name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{labels.phone}</span>
        <input
          autoComplete="tel"
          defaultValue={profileDefaults.phone}
          name="phone"
          required
          type="tel"
        />
      </label>

      <DeliveryAddressFields locale={locale} defaults={{
        delivery_first_name: profileDefaults.fullName.split(/\s+/)[0] ?? "",
        delivery_last_name: profileDefaults.fullName.split(/\s+/).slice(1).join(" "),
        delivery_country_code: profileDefaults.countryCode
      }} />

      <fieldset className="onboarding-guardian">
        <legend>{labels.recipient}</legend>
        {(["self", "family_member", "minor"] as const).map((value) => (
          <label className="checkbox-field" key={value}>
            <input checked={recipient === value} name="careRecipientType" onChange={() => setRecipient(value)} type="radio" value={value} />
            <span>{value === "self" ? labels.recipientSelf : value === "family_member" ? labels.recipientFamily : labels.recipientMinor}</span>
          </label>
        ))}
      </fieldset>

      {isAnotherPerson ? (
        <fieldset className="onboarding-guardian">
          <legend>{labels.patientLabel}</legend>
          <p className="onboarding-guardian__note">{isGuardian ? labels.guardianNote : labels.patientNote}</p>

          <label className="field">
            <span>{labels.patientName}</span>
            <input maxLength={160} name="patientFullName" required type="text" />
          </label>

          <label className="field">
            <span>{labels.patientBirthDate}</span>
            <input name="patientBirthDate" required type="date" />
          </label>
          <label className="field">
            <span>{labels.patientRelationship}</span>
            <input maxLength={80} name="patientRelationship" placeholder={labels.patientRelationshipPlaceholder} required type="text" />
          </label>
          <label className="field">
            <span>{labels.accountOwnerRole}</span>
            <input maxLength={80} name="accountOwnerRole" placeholder={labels.accountOwnerRolePlaceholder} required type="text" />
          </label>
          <label className="field">
            <span>{labels.representationReason}</span>
            <textarea maxLength={600} name="representationReason" placeholder={labels.representationReasonPlaceholder} required rows={3} />
          </label>

          <label className="checkbox-field">
            <input name="representativeConfirmed" required type="checkbox" />
            <span>{isGuardian ? labels.guardianConfirm : labels.representativeConfirm}</span>
          </label>
          <label className="checkbox-field">
            <input name="patientDataConsent" required type="checkbox" />
            <span>{labels.patientDataConsent}</span>
          </label>
          <label className="checkbox-field">
            <input name="responsibilityAcknowledged" required type="checkbox" />
            <span>{labels.responsibilityAcknowledged}</span>
          </label>
        </fieldset>
      ) : (
        <label className="checkbox-field">
          <input name="ageConfirmed" required type="checkbox" />
          <span>{labels.ageConfirm}</span>
        </label>
      )}

      <label className="field">
        <span>{labels.goal}</span>
        <input
          name="primaryGoal"
          placeholder={labels.goalPlaceholder}
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>{labels.situation}</span>
        <textarea
          name="situationDescription"
          placeholder={labels.situationPlaceholder}
          required
          rows={5}
        />
      </label>

      <label className="checkbox-field">
        <input name="offerAccepted" required type="checkbox" />
        <span>
          {labels.offerPrefix}
          <Link href="/legal/offer" target="_blank">
            {labels.offerLink}
          </Link>
          .
        </span>
      </label>

      <label className="checkbox-field">
        <input name="consentAccepted" required type="checkbox" />
        <span>{labels.consent}</span>
      </label>

      {/* A consent to processing that does not say what the processing is
          is not informed consent. The policy sits next to the tick, not
          only in the footer. */}
      <p className="onboarding-form__aside">
        {labels.privacyPrefix}
        <Link href="/legal/privacy" target="_blank">
          {labels.privacyLink}
        </Link>
        .
      </p>

      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>

      {state.message ? (
        <p aria-live="assertive" className="form-message form-message--error" role="alert">{state.message}</p>
      ) : null}
    </form>
  );
}
