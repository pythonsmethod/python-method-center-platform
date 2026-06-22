"use client";

import { useActionState } from "react";
import { submitOnboarding } from "@/lib/onboarding/actions";
import {
  initialOnboardingActionState,
  type OnboardingProfileDefaults
} from "@/lib/onboarding/types";

type OnboardingFormProps = {
  profileDefaults: OnboardingProfileDefaults;
};

export function OnboardingForm({ profileDefaults }: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    submitOnboarding,
    initialOnboardingActionState
  );

  return (
    <form action={formAction} className="onboarding-form">
      <label className="field">
        <span>Full name</span>
        <input
          autoComplete="name"
          defaultValue={profileDefaults.fullName}
          name="fullName"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Phone</span>
        <input
          autoComplete="tel"
          defaultValue={profileDefaults.phone}
          name="phone"
          required
          type="tel"
        />
      </label>

      <label className="field">
        <span>Care recipient type</span>
        <select defaultValue="self" name="careRecipientType" required>
          <option value="self">Self</option>
          <option value="family_member">Family member</option>
        </select>
      </label>

      <label className="field">
        <span>Primary goal</span>
        <input name="primaryGoal" required type="text" />
      </label>

      <label className="field">
        <span>Short situation description</span>
        <textarea name="situationDescription" required rows={5} />
      </label>

      <label className="checkbox-field">
        <input name="consentAccepted" required type="checkbox" />
        <span>
          I consent to storing this onboarding information for case preparation.
        </span>
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? "Submitting..." : "Submit onboarding"}
      </button>

      {state.message ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}
    </form>
  );
}
