// Owner-managed assistant access only; never a platform administrator grant.
export function isAssistantDelegate(email: string | null | undefined): boolean {
  void email;
  // Owner revoked client access to staff capabilities, even with stale env.
  return false;
}
