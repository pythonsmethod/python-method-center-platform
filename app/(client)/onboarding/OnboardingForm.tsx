"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { submitOnboarding } from "@/lib/onboarding/actions";
import {
  initialOnboardingActionState,
  type OnboardingProfileDefaults
} from "@/lib/onboarding/types";

type OnboardingFormProps = {
  profileDefaults: OnboardingProfileDefaults;
  // The whole onboarding section of the dictionary. This form carries both
  // consents, and a consent a person cannot read is not consent.
  labels: Dictionary["onboarding"];
};

export function OnboardingForm({
  profileDefaults,
  labels
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    submitOnboarding,
    initialOnboardingActionState
  );

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

      <label className="field">
        <span>{labels.recipient}</span>
        <select defaultValue="self" name="careRecipientType" required>
          <option value="self">{labels.recipientSelf}</option>
          <option value="family_member">{labels.recipientFamily}</option>
        </select>
      </label>

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

      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>

      {state.message ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}
    </form>
  );
}
