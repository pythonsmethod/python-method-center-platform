"use client";

import { Link } from "@/components/LocaleLink";
import { useActionState, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import { submitOnboarding } from "@/lib/onboarding/actions";
import { COUNTRY_CODES, countryFlag } from "@/lib/profile/identity";
import { DeliveryAddressFields } from "@/components/delivery/DeliveryAddressFields";
import type { DeliveryProfile } from "@/lib/delivery/types";
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
  deliveryDefaults: Partial<DeliveryProfile>;
};

export function OnboardingForm({
  profileDefaults,
  labels,
  locale,
  deliveryDefaults
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    submitOnboarding,
    initialOnboardingActionState
  );
  // Clause 7 of the offer: under 21 only with a parent or legal guardian.
  // Choosing that path swaps the age confirmation for the participant's own
  // details, so the person filling the form is never the person described.
  const [values, setValues] = useState(profileDefaults);
  const recipient = values.careRecipientType;
  const setValue = <Key extends keyof OnboardingProfileDefaults>(key: Key, value: OnboardingProfileDefaults[Key]) =>
    setValues((current) => ({ ...current, [key]: value }));
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
          onChange={(event) => setValue("fullName", event.target.value)}
          value={values.fullName}
          name="fullName"
          required
          type="text"
        />
        <small className="field__hint">{labels.fullNameHint}</small>
      </label>

      <label className="field">
        <span>{labels.country}</span>
        <select name="countryCode" onChange={(event) => setValue("countryCode", event.target.value)} required value={values.countryCode}>
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
          onChange={(event) => setValue("phone", event.target.value)}
          value={values.phone}
          name="phone"
          required
          type="tel"
        />
      </label>

      <DeliveryAddressFields locale={locale} defaults={{
        ...deliveryDefaults,
        delivery_first_name: deliveryDefaults.delivery_first_name ?? values.fullName.split(/\s+/)[0] ?? "",
        delivery_last_name: deliveryDefaults.delivery_last_name ?? values.fullName.split(/\s+/).slice(1).join(" "),
        delivery_country_code: deliveryDefaults.delivery_country_code ?? values.countryCode
      }} />

      <fieldset className="onboarding-guardian">
        <legend>{labels.recipient}</legend>
        {(["self", "family_member", "minor"] as const).map((value) => (
          <label className="checkbox-field" key={value}>
            <input checked={recipient === value} name="careRecipientType" onChange={() => setValue("careRecipientType", value)} type="radio" value={value} />
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
            <input maxLength={160} name="patientFullName" onChange={(event) => setValue("patientFullName", event.target.value)} required type="text" value={values.patientFullName} />
          </label>

          <label className="field">
            <span>{labels.patientBirthDate}</span>
            <input name="patientBirthDate" onChange={(event) => setValue("patientBirthDate", event.target.value)} required type="date" value={values.patientBirthDate} />
          </label>
          <label className="field">
            <span>{labels.patientRelationship}</span>
            <input maxLength={80} name="patientRelationship" onChange={(event) => setValue("patientRelationship", event.target.value)} placeholder={labels.patientRelationshipPlaceholder} required type="text" value={values.patientRelationship} />
          </label>
          <label className="field">
            <span>{labels.accountOwnerRole}</span>
            <input maxLength={80} name="accountOwnerRole" onChange={(event) => setValue("accountOwnerRole", event.target.value)} placeholder={labels.accountOwnerRolePlaceholder} required type="text" value={values.accountOwnerRole} />
          </label>
          <label className="field">
            <span>{labels.representationReason}</span>
            <textarea maxLength={600} name="representationReason" onChange={(event) => setValue("representationReason", event.target.value)} placeholder={labels.representationReasonPlaceholder} required rows={3} value={values.representationReason} />
          </label>

          <label className="checkbox-field">
            <input checked={values.representativeConfirmed} name="representativeConfirmed" onChange={(event) => setValue("representativeConfirmed", event.target.checked)} required type="checkbox" />
            <span>{isGuardian ? labels.guardianConfirm : labels.representativeConfirm}</span>
          </label>
          <label className="checkbox-field">
            <input checked={values.patientDataConsent} name="patientDataConsent" onChange={(event) => setValue("patientDataConsent", event.target.checked)} required type="checkbox" />
            <span>{labels.patientDataConsent}</span>
          </label>
          <label className="checkbox-field">
            <input checked={values.responsibilityAcknowledged} name="responsibilityAcknowledged" onChange={(event) => setValue("responsibilityAcknowledged", event.target.checked)} required type="checkbox" />
            <span>{labels.responsibilityAcknowledged}</span>
          </label>
        </fieldset>
      ) : (
        <label className="checkbox-field">
          <input checked={values.ageConfirmed} name="ageConfirmed" onChange={(event) => setValue("ageConfirmed", event.target.checked)} required type="checkbox" />
          <span>{labels.ageConfirm}</span>
        </label>
      )}

      <label className="field">
        <span>{labels.goal}</span>
        <input
          name="primaryGoal"
          onChange={(event) => setValue("primaryGoal", event.target.value)}
          placeholder={labels.goalPlaceholder}
          required
          type="text"
          value={values.primaryGoal}
        />
      </label>

      <label className="field">
        <span>{labels.situation}</span>
        <textarea
          name="situationDescription"
          onChange={(event) => setValue("situationDescription", event.target.value)}
          placeholder={labels.situationPlaceholder}
          required
          rows={5}
          value={values.situationDescription}
        />
      </label>

      <label className="checkbox-field">
        <input checked={values.offerAccepted} name="offerAccepted" onChange={(event) => setValue("offerAccepted", event.target.checked)} required type="checkbox" />
        <span>
          {labels.offerPrefix}
          <Link href="/legal/offer" target="_blank">
            {labels.offerLink}
          </Link>
          .
        </span>
      </label>

      <label className="checkbox-field">
        <input checked={values.consentAccepted} name="consentAccepted" onChange={(event) => setValue("consentAccepted", event.target.checked)} required type="checkbox" />
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
