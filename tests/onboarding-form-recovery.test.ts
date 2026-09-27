import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildOnboardingDefaults, savedDeliveryDefaults } from "@/lib/onboarding/defaults";

describe("questionnaire recovery", () => {
  const payload = {
    full_name: "Saved Owner", phone: "+15550001111", country_code: "US",
    care_recipient_type: "family_member", patient_full_name: "Saved Patient",
    patient_birth_date: "1980-05-06", patient_relationship: "mother",
    account_owner_role: "daughter", representation_reason: "Needs help communicating",
    primary_goal: "Recovery", situation_description: "Detailed history",
    representative_confirmed: true, patient_data_consent: true,
    responsibility_acknowledged: true, offer_accepted: true, consent_accepted: true,
    delivery: { delivery_city: "Seattle", delivery_postal_code: "98101" }
  };

  it("restores reusable answers from the latest stored submission", () => {
    expect(buildOnboardingDefaults({ full_name: "Old", phone: "+1" }, payload)).toMatchObject({
      fullName: "Saved Owner", phone: "+15550001111", countryCode: "US",
      careRecipientType: "family_member", patientFullName: "Saved Patient",
      patientBirthDate: "1980-05-06", primaryGoal: "Recovery",
      situationDescription: "Detailed history", representativeConfirmed: true,
      consentAccepted: true
    });
  });

  it("uses saved delivery data over older profile data", () => {
    expect(savedDeliveryDefaults({ delivery_city: "Portland", delivery_street: "Profile St" }, payload))
      .toMatchObject({ delivery_city: "Seattle", delivery_street: "Profile St", delivery_postal_code: "98101" });
  });

  it("keeps questionnaire and delivery inputs controlled across action errors", () => {
    const questionnaire = readFileSync("app/(client)/onboarding/OnboardingForm.tsx", "utf8");
    const delivery = readFileSync("components/delivery/DeliveryAddressFields.tsx", "utf8");
    expect(questionnaire).toContain("useState(profileDefaults)");
    expect(questionnaire).not.toContain("defaultValue=");
    expect(delivery).toContain("useState(() =>");
    expect(delivery).not.toContain("defaultValue=");
  });
});
