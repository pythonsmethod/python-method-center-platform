export type CareRecipientType = "self" | "family_member";

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
};
