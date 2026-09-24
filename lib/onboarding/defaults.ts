import type { DeliveryProfile } from "@/lib/delivery/types";
import type { CareRecipientType, OnboardingProfileDefaults } from "@/lib/onboarding/types";

type SavedProfile = Partial<DeliveryProfile> & {
  full_name?: unknown;
  phone?: unknown;
  country_code?: unknown;
};

export function buildOnboardingDefaults(profileInput: unknown, savedPayload: unknown): OnboardingProfileDefaults {
  const profile = profileInput && typeof profileInput === "object" && !Array.isArray(profileInput)
    ? profileInput as SavedProfile
    : null;
  const payload = savedPayload && typeof savedPayload === "object" && !Array.isArray(savedPayload)
    ? savedPayload as Record<string, unknown>
    : {};
  const text = (key: string) => typeof payload[key] === "string" ? String(payload[key]) : "";
  const checked = (key: string) => payload[key] === true;
  const savedRecipient = text("care_recipient_type");
  const careRecipientType: CareRecipientType = savedRecipient === "family_member" || savedRecipient === "minor"
    ? savedRecipient
    : "self";

  return {
    fullName: text("full_name") || (typeof profile?.full_name === "string" ? profile.full_name : ""),
    phone: text("phone") || (typeof profile?.phone === "string" ? profile.phone : ""),
    countryCode: text("country_code") || (typeof profile?.country_code === "string" ? profile.country_code : ""),
    careRecipientType,
    patientFullName: text("patient_full_name"),
    patientBirthDate: text("patient_birth_date"),
    patientRelationship: text("patient_relationship"),
    accountOwnerRole: text("account_owner_role"),
    representationReason: text("representation_reason"),
    primaryGoal: text("primary_goal"),
    situationDescription: text("situation_description"),
    ageConfirmed: checked("age_confirmed"),
    representativeConfirmed: checked("representative_confirmed"),
    patientDataConsent: checked("patient_data_consent"),
    responsibilityAcknowledged: checked("responsibility_acknowledged"),
    offerAccepted: checked("offer_accepted"),
    consentAccepted: checked("consent_accepted")
  };
}

export function savedDeliveryDefaults(profileInput: unknown, savedPayload: unknown): Partial<DeliveryProfile> {
  const profile = profileInput && typeof profileInput === "object" && !Array.isArray(profileInput)
    ? profileInput as SavedProfile
    : {};
  const payload = savedPayload && typeof savedPayload === "object" && !Array.isArray(savedPayload)
    ? savedPayload as Record<string, unknown>
    : {};
  const saved = payload.delivery && typeof payload.delivery === "object" && !Array.isArray(payload.delivery)
    ? payload.delivery as Partial<DeliveryProfile>
    : {};
  return { ...profile, ...saved };
}
