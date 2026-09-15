export type CaseSubjectSource = {
  profiles?: { full_name?: string | null } | null;
  care_recipients?: Array<{ full_name?: string | null; birth_date?: string | null; relationship_to_client?: string | null; client_role_for_recipient?: string | null; reason_for_representation?: string | null; is_current?: boolean }> | null;
};

export function resolveCaseSubject(source: CaseSubjectSource) {
  const patient = source.care_recipients?.find((item) => item.is_current !== false);
  if (patient?.full_name?.trim()) return {
    kind: "care_recipient" as const,
    fullName: patient.full_name.trim(),
    birthDate: patient.birth_date ?? null,
    relationshipToClient: patient.relationship_to_client?.trim() || null,
    clientRoleForRecipient: patient.client_role_for_recipient?.trim() || null,
    representationReason: patient.reason_for_representation?.trim() || null
  };
  return { kind: "account_owner" as const, fullName: source.profiles?.full_name?.trim() || null, birthDate: null, relationshipToClient: null, clientRoleForRecipient: null, representationReason: null };
}
