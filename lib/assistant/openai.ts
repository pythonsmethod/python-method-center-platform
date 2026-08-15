import type { AssistantResult, ChatMessage } from "@/lib/assistant/claude";

const DEFAULT_OPENAI_MODEL = "gpt-5.1";
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
  maxTokens: number
): Promise<AssistantResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { status: "unavailable" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const baseUrl =
    process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.openai.com";

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
        message: "Ассистент перегружен. Попробуйте через минуту."
      };
    }

    if (!response.ok) {
      return {
        status: "error",
        message: "Ассистент временно недоступен. Попробуйте позже."
      };
    }

    const data = (await response.json()) as {
      choices?: {
        finish_reason?: string | null;
        message?: { content?: string | null };
      }[];
    };

    let reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return { status: "error", message: "Пустой ответ ассистента." };
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

        if (continuationResponse.ok) {
          const continuationData = (await continuationResponse.json()) as {
            choices?: { message?: { content?: string | null } }[];
          };
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
      message: "Не удалось связаться с ассистентом. Попробуйте позже."
    };
  }
}
