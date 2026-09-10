// Owner-managed assistant access only; never a platform administrator grant.
export function isAssistantDelegate(email: string | null | undefined): boolean {
  return Boolean(email && (process.env.ANHAM_ASSISTANT_DELEGATE_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase()));
}
