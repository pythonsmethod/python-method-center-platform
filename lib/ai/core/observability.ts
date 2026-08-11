import type {
  AICapability,
  AIErrorCode,
  AIProviderId,
  AITaskType,
  AIUsage
} from "@/lib/ai/core/types";

// What one AI call leaves behind.
//
// Deliberately shaped so that it *cannot* carry the conversation. There is no
// field for the question, the reply, the system prompt or a file name, and
// the recorder below writes only these fields — so a well-meaning `...rest`
// somewhere else cannot leak a client's analyses into the server log. What
// remains is enough to answer the operational questions: who was asked, how
// long it took, what broke, and whether somebody had to be asked twice.
export type AICallRecord = {
  requestId: string;
  correlationId?: string;
  taskType: AITaskType;
  capabilities: readonly AICapability[];
  providerId?: AIProviderId;
  model?: string;
  latencyMs: number;
  outcome: "ok" | "error";
  errorCode?: AIErrorCode;
  fallbackOccurred: boolean;
  fallbackFrom?: AIProviderId;
  fallbackReason?: AIErrorCode;
  usage?: AIUsage;
};

// Exhaustive by construction: the record is rebuilt field by field rather
// than spread, which is what keeps the promise above true.
export function serializeAICall(record: AICallRecord): Record<string, unknown> {
  const line: Record<string, unknown> = {
    event: "ai_call",
    requestId: record.requestId,
    taskType: record.taskType,
    capabilities: [...record.capabilities],
    latencyMs: record.latencyMs,
    outcome: record.outcome,
    fallbackOccurred: record.fallbackOccurred
  };

  if (record.correlationId) {
    line.correlationId = record.correlationId;
  }

  if (record.providerId) {
    line.providerId = record.providerId;
  }

  if (record.model) {
    line.model = record.model;
  }

  if (record.errorCode) {
    line.errorCode = record.errorCode;
  }

  if (record.fallbackFrom) {
    line.fallbackFrom = record.fallbackFrom;
  }

  if (record.fallbackReason) {
    line.fallbackReason = record.fallbackReason;
  }

  if (record.usage?.inputTokens !== undefined) {
    line.inputTokens = record.usage.inputTokens;
  }

  if (record.usage?.outputTokens !== undefined) {
    line.outputTokens = record.usage.outputTokens;
  }

  return line;
}

// A failed call is a warning, not an error the process should shout about:
// the router has already turned it into a typed result and the caller decides
// what the person sees.
export function recordAICall(record: AICallRecord): void {
  const line = JSON.stringify(serializeAICall(record));

  if (record.outcome === "ok") {
    console.info(line);
    return;
  }

  console.warn(line);
}

export function newRequestId(): string {
  return globalThis.crypto.randomUUID();
}
