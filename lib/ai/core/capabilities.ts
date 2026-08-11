import type {
  AICapability,
  AIProvider,
  AIRequest,
  AITaskType
} from "@/lib/ai/core/types";

// What each job needs a provider to be able to do.
//
// This table is the whole reason routing stops being "Claude or GPT?". A
// caller names the job it is doing; the requirements of that job are written
// once, here, where they can be read and argued with — rather than implied by
// which function somebody happened to import three years ago.
export const TASK_CAPABILITIES: Readonly<
  Record<AITaskType, readonly AICapability[]>
> = {
  client_chat: ["text"],
  staff_chat: ["text"],
  // Reading a photographed analysis needs both: an image page and a PDF page
  // arrive in the same message and the reader must survive either.
  attachment_reading: ["text", "vision", "documents"],
  case_transcription: ["vision", "documents"],
  // The final review reasons over what was already transcribed, so it needs
  // thinking rather than eyes.
  case_review: ["text", "reasoning"],
  metrics_extraction: ["documents", "structured_output"],
  supplement_timing: ["text", "reasoning"],
  evaluation: ["text", "reasoning"]
};

// A request may ask for more than its task implies, never for less: an
// explicit list is merged with the task's own requirements rather than
// replacing them, so no caller can quietly drop "vision" from a job that
// reads photographs.
export function requiredCapabilities(
  request: Pick<AIRequest, "taskType" | "capabilities">
): AICapability[] {
  const required = new Set<AICapability>(TASK_CAPABILITIES[request.taskType]);

  for (const capability of request.capabilities ?? []) {
    required.add(capability);
  }

  return [...required];
}

export function missingCapabilities(
  provider: AIProvider,
  required: readonly AICapability[]
): AICapability[] {
  const supported = provider.capabilities();

  return required.filter((capability) => !supported.has(capability));
}

export function supportsAll(
  provider: AIProvider,
  required: readonly AICapability[]
): boolean {
  return missingCapabilities(provider, required).length === 0;
}
