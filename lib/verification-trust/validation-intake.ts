export type ValidationIntakeDocument = {
  documentId: string;
  documentType: "LAB" | "RADIOLOGY" | "PATHOLOGY" | "PROCEDURE" | "OTHER";
  language: string;
  sourceType: "PDF_TEXT" | "SCAN" | "MOBILE_PHOTO";
  qualityBand: "HIGH" | "MEDIUM" | "LOW";
  versionKind: "ORIGINAL" | "CORRECTED" | "ADDENDUM";
  layoutFamily: string;
};

export type ValidationIntakeCase = {
  caseAlias: string;
  authorizationReference: string;
  authorizedPurpose: "PHASE_2_9_VALIDATION";
  deidentificationStatus: "DEIDENTIFIED" | "MINIMIZED_PHI";
  independentReviewerId: string | null;
  documents: ValidationIntakeDocument[];
};

export function validateValidationIntake(cases: ValidationIntakeCase[]) {
  const errors: string[] = [];
  const aliases = new Set<string>();
  const documentIds = new Set<string>();
  for (const item of cases) {
    if (!item.caseAlias.trim()) errors.push("case_alias_required");
    if (aliases.has(item.caseAlias)) errors.push(`${item.caseAlias}:duplicate_case_alias`);
    aliases.add(item.caseAlias);
    if (!item.authorizationReference.trim()) errors.push(`${item.caseAlias}:authorization_reference_required`);
    if (item.authorizedPurpose !== "PHASE_2_9_VALIDATION") errors.push(`${item.caseAlias}:invalid_authorized_purpose`);
    if (!item.documents.length) errors.push(`${item.caseAlias}:document_required`);
    for (const document of item.documents) {
      if (documentIds.has(document.documentId)) errors.push(`${document.documentId}:duplicate_document_id`);
      documentIds.add(document.documentId);
      if (!document.layoutFamily.trim()) errors.push(`${document.documentId}:layout_family_required`);
      if (!document.language.trim()) errors.push(`${document.documentId}:language_required`);
    }
  }
  return { valid: errors.length === 0, errors };
}
