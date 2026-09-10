import type { AssistantResult, ChatMessage } from "@/lib/assistant/claude";
import { isExplicitPolicyError, isFilteredChoice, providerPolicyRefusal } from "@/lib/assistant/policy-refusal";

import { withFactualHonesty } from "@/lib/assistant/factual-honesty";
import { conversationArchiveScope } from "./conversation-archive";
import { askOpenAiArchive } from "./openai-archive";

// Quality-first flagship. Deployments may pin another available model, but
// the private expert assistant must not silently fall back to a legacy one.
const DEFAULT_OPENAI_MODEL = "gpt-5.6-sol";
const CONTINUE_INSTRUCTION =
  "Продолжи ответ ровно с того места, где он оборвался. Не повторяй уже написанное, сохрани язык и закончи мысль кратко и естественно.";

export function hasOpenAiEnv(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

// The failure texts below reach a person's screen: the chat routes return
// `message` verbatim. They name no vendor on purpose — a client whose reply
// failed over would otherwise learn which company was busy, which is exactly
// what the founder decided nobody outside her own view should see. Which
// provider actually failed belongs in the logs, not in the answer.
export async function askOpenAi(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  options: { reasoningEffort?: "high" } = {}
): Promise<AssistantResult> {
  system = withFactualHonesty(system);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { status: "unavailable" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const baseUrl =
    process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.openai.com";

  if (conversationArchiveScope()) return askOpenAiArchive({ apiKey, baseUrl, model, system, messages, maxTokens, reasoningEffort: options.reasoningEffort });

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        ...(options.reasoningEffort
          ? { reasoning_effort: options.reasoningEffort }
          : {}),
        messages: [
          { role: "system", content: system },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        ]
      })
    });

    if (response.status === 429) {
      return {
        status: "error",
        code: "overloaded",
        message: "Ассистент перегружен. Попробуйте через минуту."
      };
    }

    if (!response.ok) {
      if (await isExplicitPolicyError(response)) return providerPolicyRefusal();
      return {
        status: "error",
        code: "temporarilyDown",
        message: "Ассистент временно недоступен. Попробуйте позже."
      };
    }

    const data = (await response.json()) as {
      choices?: {
        finish_reason?: string | null;
        message?: { content?: string | null; refusal?: string | null };
      }[];
    };

    if (isFilteredChoice(data.choices?.[0])) return providerPolicyRefusal();
    let reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return {
        status: "error",
        code: "emptyReply",
        message: "Пустой ответ ассистента."
      };
    }

    if (data.choices?.[0]?.finish_reason === "length") {
      try {
        const continuationResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            max_completion_tokens: maxTokens,
            ...(options.reasoningEffort
              ? { reasoning_effort: options.reasoningEffort }
              : {}),
            messages: [
              { role: "system", content: system },
              ...messages.map((message) => ({
                role: message.role,
                content: message.content
              })),
              { role: "assistant", content: reply },
              { role: "user", content: CONTINUE_INSTRUCTION }
            ]
          })
        });

        if (!continuationResponse.ok && await isExplicitPolicyError(continuationResponse)) {
          return providerPolicyRefusal();
        }
        if (continuationResponse.ok) {
          const continuationData = (await continuationResponse.json()) as {
            choices?: { finish_reason?: string | null; message?: { content?: string | null; refusal?: string | null } }[];
          };
          if (isFilteredChoice(continuationData.choices?.[0])) return providerPolicyRefusal();
          const ending = continuationData.choices?.[0]?.message?.content?.trim();

          if (ending) {
            reply = `${reply}\n${ending}`;
          }
        }
      } catch {
        // Preserve the useful first part if only the continuation call fails.
      }
    }

    return { status: "ok", reply };
  } catch {
    return {
      status: "error",
      code: "unreachable",
      message: "Не удалось связаться с ассистентом. Попробуйте позже."
    };
  }
}
