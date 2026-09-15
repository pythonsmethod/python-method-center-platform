import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCaseSubject } from "@/lib/cases/case-subject";

describe("account owner and patient separation", () => {
  it("uses the represented patient as the medical subject", () => {
    expect(resolveCaseSubject({ profiles: { full_name: "Owner" }, care_recipients: [{ full_name: "Patient", relationship_to_client: "husband", client_role_for_recipient: "wife", reason_for_representation: "cannot communicate", is_current: true }] })).toMatchObject({ kind: "care_recipient", fullName: "Patient", relationshipToClient: "husband", clientRoleForRecipient: "wife" });
  });

  it("requires separate identity, relationship, reason and confirmations", () => {
    const form = readFileSync("app/(client)/onboarding/OnboardingForm.tsx", "utf8");
    for (const name of ["patientFullName", "patientBirthDate", "patientRelationship", "accountOwnerRole", "representationReason", "representativeConfirmed", "patientDataConsent", "responsibilityAcknowledged"]) expect(form).toContain(`name="${name}"`);
  });

  it("keeps represented people in an owner-scoped table", () => {
    const sql = readFileSync("supabase/migrations/20260915010000_case_care_recipient_identity.sql", "utf8");
    expect(sql).toContain("auth.uid() = profile_id");
    expect(sql).toContain("c.profile_id = auth.uid()");
  });
});
