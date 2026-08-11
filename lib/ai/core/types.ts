// The vocabulary the rest of the product uses to ask for intelligence.
//
// Nothing here mentions Anthropic or OpenAI. That is the entire point: a
// business module says "I need a document read and a structured answer back",
// and it is the router's job — not the caller's — to know who can do that
// today. When a provider is added, replaced or falls over, these types do not
// move.

import type { ChatAttachment } from "@/lib/assistant/attachments";

// What a request needs a provider to be able to do.
//
// A capability is a claim about the adapter, not about the vendor's website:
// an adapter declares "documents" only when it actually carries a PDF
// through. Declaring a capability that is not wired up is how the router
// starts sending files to a provider that silently drops them.
export type AICapability =
  | "text"
  | "reasoning"
  | "vision"
  | "documents"
  | "structured_output"
  | "tool_use";

// Open on purpose: a self-hosted or third provider is added by naming it,
// not by editing this union.
export type AIProviderId = "anthropic" | "openai" | (string & {});

// The jobs the center actually asks a model to do. Each one is mapped to the
// capabilities it needs in capabilities.ts, so a caller never lists them by
// hand and two callers doing the same job cannot disagree about it.
export type AITaskType =
  | "client_chat"
  | "staff_chat"
  | "attachment_reading"
  | "case_transcription"
  | "case_review"
  | "metrics_extraction"
  | "supplement_timing"
  | "evaluation";

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIRequest = {
  taskType: AITaskType;
  system: string;
  messages: AIMessage[];
  maxTokens: number;
  // Files travel with the request that owns them and are never stored.
  attachments?: ChatAttachment[];
  // Normally derived from taskType. Set only to ask for more than the task
  // implies — never to ask for less.
  capabilities?: readonly AICapability[];
  // Ties every provider attempt of one user action together in the log, so a
  // failover can be read as one story instead of two unrelated lines.
  correlationId?: string;
  timeoutMs?: number;
};

export type AIUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type AIResponse = {
  text: string;
  providerId: AIProviderId;
  model: string;
  usage?: AIUsage;
};

// Normalized failure. Business modules branch on `code`, never on an
// exception class belonging to one vendor's SDK.
export type AIErrorCode =
  | "NO_PROVIDER"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "PROVIDER_DOWN"
  | "INVALID_RESPONSE"
  | "CAPABILITY_UNAVAILABLE"
  | "SAFETY_REFUSAL"
  | "UNKNOWN";

export type AIError = {
  code: AIErrorCode;
  // Already written for a person, in Russian, by the adapter that failed.
  // Kept per-provider so the wording a client sees today does not change
  // when the call moves behind this interface.
  message: string;
  providerId?: AIProviderId;
  // Whether asking *someone else* is worth doing. Never a licence to ask the
  // same provider again inside one request.
  retryable: boolean;
};

// A result is either an answer or a reason. There is no third shape, and in
// particular no shape that lets a failure travel as if it were an answer.
export type AIResult =
  | { ok: true; response: AIResponse }
  | { ok: false; error: AIError };

export type ProviderHealth = {
  id: AIProviderId;
  label: string;
  configured: boolean;
  capabilities: AICapability[];
};

export interface AIProvider {
  readonly id: AIProviderId;
  // Shown to staff in comparison mode; never to clients.
  readonly label: string;

  capabilities(): ReadonlySet<AICapability>;

  // "Can this provider be asked at all" — a key check today, a health probe
  // later. Async so a self-hosted node can be pinged without changing callers.
  isAvailable(): Promise<boolean>;

  generate(request: AIRequest, signal?: AbortSignal): Promise<AIResult>;
}
