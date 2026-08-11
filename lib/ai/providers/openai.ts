import { aiFailure, errorCodeFromStatus } from "@/lib/ai/core/errors";
import type {
  AICapability,
  AIProvider,
  AIRequest,
  AIResult
} from "@/lib/ai/core/types";

// The OpenAI adapter.
//
// Spoken to over plain HTTP rather than through an SDK, which is why the
// address is configurable: anything answering the chat-completions shape —
// OpenAI itself, a gateway, or a self-hosted model behind a compatible
// server — is reachable by setting OPENAI_BASE_URL, without a line of code
// changing anywhere above this file.

export const DEFAULT_OPENAI_MODEL = "gpt-5.1";

// Vision and documents are absent on purpose, and their absence is the honest
// state of this file rather than a judgement about the vendor: nothing here
// carries an attachment yet, so the router must not send it one. Phase 3 adds
// the image and file parts and this set grows with them.
const CAPABILITIES: ReadonlySet<AICapability> = new Set<AICapability>([
  "text",
  "reasoning",
  "structured_output"
]);

export function openAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function openAiBaseUrl(): string {
  return (
    process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") || "https://api.openai.com"
  );
}

export function hasOpenAiEnv(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export const openAiProvider: AIProvider = {
  id: "openai",
  label: "GPT",

  capabilities() {
    return CAPABILITIES;
  },

  async isAvailable() {
    return hasOpenAiEnv();
  },

  async generate(request: AIRequest, signal?: AbortSignal): Promise<AIResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return aiFailure("NO_PROVIDER", "Помощник сейчас не подключён.", "openai");
    }

    // Reaching this point with files attached would mean the router ignored
    // the capability set. It is cheaper to say so than to quietly answer a
    // question about documents nobody read — the one failure mode the
    // center's safety rules single out by name.
    if (request.attachments && request.attachments.length > 0) {
      return aiFailure(
        "CAPABILITY_UNAVAILABLE",
        "GPT сейчас не читает вложения.",
        "openai"
      );
    }

    const model = openAiModel();

    try {
      const response = await fetch(`${openAiBaseUrl()}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_completion_tokens: request.maxTokens,
          messages: [
            { role: "system", content: request.system },
            ...request.messages.map((message) => ({
              role: message.role,
              content: message.content
            }))
          ]
        }),
        ...(signal ? { signal } : {})
      });

      if (response.status === 429) {
        return aiFailure(
          "RATE_LIMIT",
          "GPT перегружен. Попробуйте через минуту.",
          "openai"
        );
      }

      if (!response.ok) {
        return aiFailure(
          errorCodeFromStatus(response.status),
          "GPT временно недоступен. Попробуйте позже.",
          "openai"
        );
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content?.trim();

      if (!text) {
        return aiFailure("INVALID_RESPONSE", "Пустой ответ GPT.", "openai");
      }

      return {
        ok: true,
        response: {
          text,
          providerId: "openai",
          model,
          usage: {
            inputTokens: data.usage?.prompt_tokens,
            outputTokens: data.usage?.completion_tokens
          }
        }
      };
    } catch (error) {
      // An abort is our own timeout coming back, not a broken provider, and
      // it is labelled as such so the log does not accuse OpenAI of being
      // down when it was simply asked to stop.
      if (error instanceof Error && error.name === "AbortError") {
        return aiFailure(
          "TIMEOUT",
          "GPT не ответил вовремя. Попробуйте ещё раз.",
          "openai"
        );
      }

      return aiFailure(
        "UNKNOWN",
        "Не удалось связаться с GPT. Попробуйте позже.",
        "openai"
      );
    }
  }
};
