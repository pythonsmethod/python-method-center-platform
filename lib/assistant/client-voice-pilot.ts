export function isClientVoicePilot(email: string | null | undefined): boolean {
  return Boolean(email && (process.env.ANHAM_CLIENT_VOICE_TEST_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase()));
}

// Owner-authorized preview of client assistant capabilities, not a service or
// payment entitlement. Call only with the user returned by auth.getUser().
export function hasFullClientAssistantPreview(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
}): boolean {
  return !user.is_anonymous && Boolean(user.email_confirmed_at) && isClientVoicePilot(user.email);
}
