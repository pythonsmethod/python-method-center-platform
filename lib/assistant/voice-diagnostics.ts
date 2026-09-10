// Never retain provider messages: they can contain user speech or tool arguments.
export const VOICE_DIAGNOSTIC_CODES = ["unknown", "transport", "protocol", "playback", "rate_limit_exceeded", "insufficient_quota", "server_error", "invalid_request_error", "conversation_already_has_active_response", "invalid_value", "session_expired"] as const;
export function safeVoiceDiagnosticCode(code: unknown): typeof VOICE_DIAGNOSTIC_CODES[number] {
  return VOICE_DIAGNOSTIC_CODES.find(value => value === code) ?? "unknown";
}
