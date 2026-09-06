import { describe, expect, it } from "vitest";
import { validateValidationIntake, type ValidationIntakeCase } from "@/lib/verification-trust";

const validCase: ValidationIntakeCase = {
  caseAlias: "validation-case-002",
  authorizationReference: "owner-authorization-reference",
  authorizedPurpose: "PHASE_2_9_VALIDATION",
  deidentificationStatus: "MINIMIZED_PHI",
  independentReviewerId: null,
  documents: [{
    documentId: "validation-document-002-a",
    documentType: "LAB",
    language: "ru",
    sourceType: "SCAN",
    qualityBand: "MEDIUM",
    versionKind: "ORIGINAL",
    layoutFamily: "laboratory-table-ru",
  }, {
    documentId: "validation-document-002-b",
    documentType: "LAB",
    language: "ru",
    sourceType: "SCAN",
    qualityBand: "MEDIUM",
    versionKind: "ORIGINAL",
    layoutFamily: "laboratory-table-ru-immunoassay",
  }, {
    documentId: "validation-document-002-c",
    documentType: "LAB",
    language: "ru",
    sourceType: "SCAN",
    qualityBand: "MEDIUM",
    versionKind: "ORIGINAL",
    layoutFamily: "laboratory-table-ru-cbc",
  }],
};

describe("Phase 2.9 intake contract", () => {
  it("accepts an authorized metadata-only intake record", () => {
    expect(validateValidationIntake([validCase])).toEqual({ valid: true, errors: [] });
  });

  it("rejects missing authorization and duplicate document identities", () => {
    const duplicate = structuredClone(validCase);
    duplicate.caseAlias = "validation-case-003";
    duplicate.authorizationReference = "";
    expect(validateValidationIntake([validCase, duplicate])).toEqual({
      valid: false,
      errors: [
        "validation-case-003:authorization_reference_required",
        "validation-document-002-a:duplicate_document_id",
        "validation-document-002-b:duplicate_document_id",
        "validation-document-002-c:duplicate_document_id",
      ],
    });
  });
});
