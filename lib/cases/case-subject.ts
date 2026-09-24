export type CareRecipientSubject = {
  full_name?: string | null;
  birth_date?: string | null;
  relationship_to_client?: string | null;
  client_role_for_recipient?: string | null;
  reason_for_representation?: string | null;
  is_current?: boolean;
};

export type CaseSubjectSource = {
  profiles?: { full_name?: string | null } | null;
  // A UNIQUE case_id relationship can be embedded as one object by PostgREST.
  // Older queries and fixtures return arrays. Normalize both at this boundary.
  care_recipients?: CareRecipientSubject | CareRecipientSubject[] | null;
};

function text(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

export function resolveCaseSubject(source: CaseSubjectSource) {
  const relation = source.care_recipients;
  const recipients = Array.isArray(relation) ? relation : relation ? [relation] : [];
  const patient = recipients.find((item) => item && typeof item === "object" && item.is_current !== false);
  const fullName = text(patient?.full_name);
  if (patient && fullName) return {
    kind: "care_recipient" as const,
    fullName,
    birthDate: text(patient.birth_date),
    relationshipToClient: text(patient.relationship_to_client),
    clientRoleForRecipient: text(patient.client_role_for_recipient),
    representationReason: text(patient.reason_for_representation)
  };
  return { kind: "account_owner" as const, fullName: text(source.profiles?.full_name), birthDate: null, relationshipToClient: null, clientRoleForRecipient: null, representationReason: null };
}
