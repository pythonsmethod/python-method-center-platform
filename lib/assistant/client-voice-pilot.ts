export function isClientVoicePilot(email: string | null | undefined): boolean {
  return Boolean(email && (process.env.ANHAM_CLIENT_VOICE_TEST_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase()));
}
