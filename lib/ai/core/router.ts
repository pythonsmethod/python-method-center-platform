import {
  missingCapabilities,
  requiredCapabilities,
  supportsAll
} from "@/lib/ai/core/capabilities";
import { aiError, aiFailure, mostInformative } from "@/lib/ai/core/errors";
import {
  newRequestId,
  recordAICall,
  type AICallRecord
} from "@/lib/ai/core/observability";
import type {
  AIError,
  AIProvider,
  AIProviderId,
  AIRequest,
  AIResult
} from "@/lib/ai/core/types";

// The provider router.
//
// It answers one question — "which healthy provider can supply what this
// request needs, and who is asked next if that one falls over" — and it
// answers it the same way every time. Everything it is deliberately not
// allowed to do is as much the design as what it does: it never asks the same
// provider twice, never waits without a limit, and never turns a pile of
// failures into something that reads like an answer.

// A provider that has not replied by now is not about to. Sixty seconds is
// longer than any real answer and shorter than the platform's own request
// limit, so the timeout is ours to observe rather than a truncated response
// somebody else decides to send.
export const DEFAULT_TIMEOUT_MS = 60_000;

export function configuredTimeoutMs(): number {
  const raw = Number(process.env.AI_REQUEST_TIMEOUT_MS?.trim());

  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

export type RouteOptions = {
  // The providers to consider, already in preference order. Injected rather
  // than imported so tests — and later a per-task configuration — can decide
  // the field without the router reaching for a global.
  providers: readonly AIProvider[];
  // A preference, never a demand: a named provider is tried first and the
  // others still catch it when it falls. This is what the current `claude`
  // and `gpt` modes mean, and it stays true here.
  prefer?: AIProviderId;
  timeoutMs?: number;
  correlationId?: string;
  log?: (record: AICallRecord) => void;
};

// Which providers could serve this request, in the order they will be asked.
// Exported because "why did it not use GPT" is a question the team will ask,
// and it should be answerable without reading the router.
export async function eligibleProviders(
  request: AIRequest,
  options: Pick<RouteOptions, "providers" | "prefer">
): Promise<{
  eligible: AIProvider[];
  lackingCapability: AIProvider[];
  notConfigured: AIProvider[];
}> {
  const required = requiredCapabilities(request);
  const lackingCapability: AIProvider[] = [];
  const notConfigured: AIProvider[] = [];
  const eligible: AIProvider[] = [];

  for (const provider of options.providers) {
    if (!supportsAll(provider, required)) {
      lackingCapability.push(provider);
      continue;
    }

    // Availability is asked after capability so an unconfigured provider is
    // never probed for a job it could not have done anyway.
    if (!(await provider.isAvailable())) {
      notConfigured.push(provider);
      continue;
    }

    eligible.push(provider);
  }

  if (options.prefer) {
    const index = eligible.findIndex((provider) => provider.id === options.prefer);

    if (index > 0) {
      const [preferred] = eligible.splice(index, 1);
      eligible.unshift(preferred);
    }
  }

  return { eligible, lackingCapability, notConfigured };
}

async function generateWithTimeout(
  provider: AIProvider,
  request: AIRequest,
  timeoutMs: number
): Promise<AIResult> {
  // The signal is what actually stops the work; the race only stops us
  // waiting for it. Aborting matters as much as returning: an abandoned
  // request that keeps running is billed, and on a slow provider it is still
  // holding the connection when the second provider needs one.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const expiry = new Promise<AIResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(
        aiFailure(
          "TIMEOUT",
          "Ассистент не ответил вовремя. Попробуйте ещё раз.",
          provider.id
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([provider.generate(request, controller.signal), expiry]);
  } finally {
    clearTimeout(timer);
  }
}

// Run one request against the field of providers.
//
// Bounded by construction: the loop walks a list that was fixed before the
// first call, so there is no path on which a provider is asked twice and no
// path on which failing over goes round in a circle.
export async function runAIRequest(
  request: AIRequest,
  options: RouteOptions
): Promise<AIResult> {
  const required = requiredCapabilities(request);
  const requestId = newRequestId();
  const correlationId = request.correlationId ?? options.correlationId;
  const log = options.log ?? recordAICall;
  const startedAt = Date.now();

  const base = {
    requestId,
    ...(correlationId ? { correlationId } : {}),
    taskType: request.taskType,
    capabilities: required
  };

  const { eligible, lackingCapability } = await eligibleProviders(request, options);

  if (eligible.length === 0) {
    // Two different silences, told apart because the fixes are different.
    // Nobody can do this job at all is an architecture problem; nobody is
    // configured is an operations problem, and a person reading the log at
    // three in the morning should not have to guess which one they have.
    const nobodyCanDoIt =
      lackingCapability.length > 0 && lackingCapability.length === options.providers.length;

    const error = nobodyCanDoIt
      ? aiError(
          "CAPABILITY_UNAVAILABLE",
          `Ни один подключённый провайдер не умеет: ${missingCapabilities(
            lackingCapability[0],
            required
          ).join(", ")}.`
        )
      : aiError("NO_PROVIDER", "Помощник сейчас не подключён.");

    log({
      ...base,
      latencyMs: Date.now() - startedAt,
      outcome: "error",
      errorCode: error.code,
      fallbackOccurred: false
    });

    return { ok: false, error };
  }

  const timeoutMs = request.timeoutMs ?? options.timeoutMs ?? configuredTimeoutMs();
  const failures: AIError[] = [];

  for (const provider of eligible) {
    const attemptStartedAt = Date.now();
    const previous = failures[failures.length - 1];
    const result = await generateWithTimeout(provider, request, timeoutMs);
    const latencyMs = Date.now() - attemptStartedAt;

    const attempt: AICallRecord = {
      ...base,
      providerId: provider.id,
      latencyMs,
      outcome: result.ok ? "ok" : "error",
      fallbackOccurred: failures.length > 0,
      ...(previous?.providerId ? { fallbackFrom: previous.providerId } : {}),
      ...(previous ? { fallbackReason: previous.code } : {})
    };

    if (result.ok) {
      log({
        ...attempt,
        model: result.response.model,
        ...(result.response.usage ? { usage: result.response.usage } : {})
      });

      return result;
    }

    log({ ...attempt, errorCode: result.error.code });

    failures.push({ ...result.error, providerId: result.error.providerId ?? provider.id });

    // A refusal, or anything else another provider cannot help with, ends the
    // request here rather than being carried to the next model.
    if (!result.error.retryable) {
      return { ok: false, error: failures[failures.length - 1] };
    }
  }

  // Everyone eligible has been asked once and nobody answered. The caller
  // gets the most useful account of why — and, by the shape of AIResult,
  // cannot mistake it for a reply.
  const error =
    mostInformative(failures) ?? aiError("NO_PROVIDER", "Помощник сейчас не подключён.");

  return { ok: false, error };
}
