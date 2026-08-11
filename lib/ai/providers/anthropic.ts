import Anthropic from "@anthropic-ai/sdk";
import { aiFailure } from "@/lib/ai/core/errors";
import type {
  AICapability,
  AIErrorCode,
  AIProvider,
  AIRequest,
  AIResult
} from "@/lib/ai/core/types";
import {
  ASSISTANT_MODEL,
  buildAttachmentBlocks,
  buildSystemParam
} from "@/lib/assistant/claude";

// The Anthropic adapter.
//
// One of exactly two places in the product allowed to know that Anthropic
// exists. Everything above it asks for capabilities; this file turns that ask
// into an SDK call and turns whatever comes back — an answer, a refusal, a
// rate limit — into the shapes in core/types.ts.
//
// The attachment blocks and the cacheable system prompt are still imported
// from lib/assistant/claude.ts rather than copied. That logic carries the
// prompt-injection defence for client files, and two copies of a safety rule
// is two chances for one of them to drift. Phase 4 inverts the direction: the
// helpers move down here and the old module goes away.

const CAPABILITIES: ReadonlySet<AICapability> = new Set<AICapability>([
  "text",
  "reasoning",
  "vision",
  "documents",
  "structured_output"
]);

// Same default as the running site. The override exists so a model change is
// a deployment decision rather than a code change — which is the point of
// the whole migration.
export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || ASSISTANT_MODEL;
}

export function hasAnthropicEnv(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;
let clientKey: string | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const baseURL = process.env.ANTHROPIC_BASE_URL?.trim();
  // The cache key includes the address: a self-hosted or proxied endpoint
  // configured after the first call must not keep talking to the old one.
  const key = `${apiKey}|${baseURL ?? ""}`;

  if (!client || clientKey !== key) {
    client = new Anthropic(baseURL ? { apiKey, baseURL } : { apiKey });
    clientKey = key;
  }

  return client;
}

export const anthropicProvider: AIProvider = {
  id: "anthropic",
  label: "Claude",

  capabilities() {
    return CAPABILITIES;
  },

  async isAvailable() {
    return hasAnthropicEnv();
  },

  async generate(request: AIRequest, signal?: AbortSignal): Promise<AIResult> {
    const anthropic = getClient();

    if (!anthropic) {
      return aiFailure("NO_PROVIDER", "Помощник сейчас не подключён.", "anthropic");
    }

    const model = anthropicModel();

    try {
      const response = await anthropic.messages.create(
        {
          model,
          max_tokens: request.maxTokens,
          system: buildSystemParam(request.system),
          messages:
            request.attachments && request.attachments.length > 0
              ? buildAttachmentBlocks(request.messages, request.attachments)
              : request.messages
        },
        signal ? { signal } : undefined
      );

      if (response.stop_reason === "refusal") {
        // Kept as a typed refusal rather than an answer so no router can take
        // the same question to the next model until one agrees. The wording
        // is the one the site already shows, and the person still sees it.
        return aiFailure(
          "SAFETY_REFUSAL",
          "Я не могу помочь с этим вопросом. Пожалуйста, напишите команде через страницу «Поддержка» — живой человек ответит вам.",
          "anthropic"
        );
      }

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) {
        return aiFailure("INVALID_RESPONSE", "Пустой ответ ассистента.", "anthropic");
      }

      return {
        ok: true,
        response: {
          text,
          providerId: "anthropic",
          model,
          usage: {
            inputTokens: response.usage?.input_tokens,
            outputTokens: response.usage?.output_tokens
          }
        }
      };
    } catch (error) {
      return aiFailure(...classify(error));
    }
  }
};

// The one spot where an Anthropic exception class is allowed to be named.
// Above this line the rest of the product sees only the taxonomy.
function classify(error: unknown): [AIErrorCode, string, "anthropic"] {
  if (error instanceof Anthropic.APIUserAbortError) {
    return ["TIMEOUT", "Ассистент не ответил вовремя. Попробуйте ещё раз.", "anthropic"];
  }

  if (error instanceof Anthropic.RateLimitError) {
    return ["RATE_LIMIT", "Ассистент перегружен. Попробуйте через минуту.", "anthropic"];
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return ["AUTH_ERROR", "Ассистент временно недоступен. Попробуйте позже.", "anthropic"];
  }

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return ["TIMEOUT", "Ассистент не ответил вовремя. Попробуйте ещё раз.", "anthropic"];
  }

  if (error instanceof Anthropic.APIError) {
    return ["PROVIDER_DOWN", "Ассистент временно недоступен. Попробуйте позже.", "anthropic"];
  }

  return ["UNKNOWN", "Не удалось связаться с ассистентом. Попробуйте позже.", "anthropic"];
}
