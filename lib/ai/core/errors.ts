import type { AIError, AIErrorCode, AIProviderId } from "@/lib/ai/core/types";

// Which failures are worth taking to another provider.
//
// The question this answers is not "was it our fault" but "would asking
// somebody else help". An expired key, an overloaded queue or an empty reply
// is a fact about one provider on one afternoon, so the next one is worth a
// try — that is exactly the case where the second model saves the answer.
const RETRYABLE_ELSEWHERE: ReadonlySet<AIErrorCode> = new Set<AIErrorCode>([
  "TIMEOUT",
  "RATE_LIMIT",
  "AUTH_ERROR",
  "PROVIDER_DOWN",
  "INVALID_RESPONSE",
  "UNKNOWN"
]);

// A refusal is deliberately absent from that set. When a model declines on
// safety grounds, shopping the same question around until one provider agrees
// is precisely the behaviour a rehabilitation center must not have.
export function isRetryableElsewhere(code: AIErrorCode): boolean {
  return RETRYABLE_ELSEWHERE.has(code);
}

export function aiError(
  code: AIErrorCode,
  message: string,
  providerId?: AIProviderId
): AIError {
  return {
    code,
    message,
    ...(providerId ? { providerId } : {}),
    retryable: isRetryableElsewhere(code)
  };
}

export function aiFailure(
  code: AIErrorCode,
  message: string,
  providerId?: AIProviderId
): { ok: false; error: AIError } {
  return { ok: false, error: aiError(code, message, providerId) };
}

// Maps an HTTP status onto the taxonomy. Shared by every adapter that speaks
// HTTP so the same status does not become two different codes depending on
// which file wrote the mapping.
export function errorCodeFromStatus(status: number): AIErrorCode {
  if (status === 401 || status === 403) {
    return "AUTH_ERROR";
  }

  if (status === 408) {
    return "TIMEOUT";
  }

  if (status === 429) {
    return "RATE_LIMIT";
  }

  if (status >= 500) {
    return "PROVIDER_DOWN";
  }

  return "UNKNOWN";
}

// When every eligible provider has failed, the caller gets the most
// informative failure rather than the last one. "No provider is configured"
// is true but useless next to "the key is rejected"; a concrete breakage
// tells the team what to go and fix.
const INFORMATIVENESS: readonly AIErrorCode[] = [
  "AUTH_ERROR",
  "SAFETY_REFUSAL",
  "INVALID_RESPONSE",
  "RATE_LIMIT",
  "TIMEOUT",
  "PROVIDER_DOWN",
  "UNKNOWN",
  "CAPABILITY_UNAVAILABLE",
  "NO_PROVIDER"
];

function rank(code: AIErrorCode): number {
  const index = INFORMATIVENESS.indexOf(code);

  return index === -1 ? INFORMATIVENESS.length : index;
}

// Ties go to the earlier error: the first provider tried is the one the
// product prefers, so its account of what went wrong is the primary one.
export function mostInformative(errors: readonly AIError[]): AIError | null {
  let best: AIError | null = null;

  for (const error of errors) {
    if (!best || rank(error.code) < rank(best.code)) {
      best = error;
    }
  }

  return best;
}
