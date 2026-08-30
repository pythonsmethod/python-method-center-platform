// "minor" is a third case rather than a flag on the other two: clause 7 of
// the offer allows participation under 21 only together with a parent or
// legal guardian, and that path collects the participant's own details
// separately from the person filling the form.
export type CareRecipientType = "self" | "family_member" | "minor";

export type OnboardingActionState = {
  status: "idle" | "error";
  message: string;
};

export const initialOnboardingActionState: OnboardingActionState = {
  status: "idle",
  message: ""
};

export type OnboardingProfileDefaults = {
  fullName: string;
  phone: string;
  countryCode: string;
};
