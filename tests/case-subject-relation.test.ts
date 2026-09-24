import { describe, expect, it } from "vitest";
import { resolveCaseSubject, type CaseSubjectSource } from "@/lib/cases/case-subject";

const patient = { full_name: " Synthetic patient ", birth_date: "1980-01-02", relationship_to_client: " relative ", client_role_for_recipient: " representative ", reason_for_representation: " assistance ", is_current: true };
const owner = { full_name: "Synthetic account owner" };

describe("case subject relation normalization", () => {
  it("accepts the singular UNIQUE relation returned by PostgREST", () => {
    expect(resolveCaseSubject({ profiles: owner, care_recipients: patient })).toEqual({ kind: "care_recipient", fullName: "Synthetic patient", birthDate: "1980-01-02", relationshipToClient: "relative", clientRoleForRecipient: "representative", representationReason: "assistance" });
  });
  it("returns identical results for object and array representations", () => {
    expect(resolveCaseSubject({ profiles: owner, care_recipients: patient })).toEqual(resolveCaseSubject({ profiles: owner, care_recipients: [patient] }));
  });
  it("skips inactive recipients in arrays", () => {
    expect(resolveCaseSubject({ profiles: owner, care_recipients: [{ full_name: "Old subject", is_current: false }, patient] }).fullName).toBe("Synthetic patient");
  });
  it.each([null, undefined, []])("handles an absent relation (%s)", (care_recipients) => {
    expect(resolveCaseSubject({ profiles: owner, care_recipients }).kind).toBe("account_owner");
  });
  it("does not use an inactive singular recipient", () => {
    expect(resolveCaseSubject({ profiles: owner, care_recipients: { ...patient, is_current: false } }).fullName).toBe(owner.full_name);
  });
  it("does not throw on malformed nullable relation elements", () => {
    const source = { profiles: owner, care_recipients: [null, patient] } as unknown as CaseSubjectSource;
    expect(resolveCaseSubject(source).fullName).toBe("Synthetic patient");
  });
  it("does not throw on a non-string name", () => {
    const source = { profiles: owner, care_recipients: { full_name: 7 } } as unknown as CaseSubjectSource;
    expect(() => resolveCaseSubject(source)).not.toThrow();
  });
});
