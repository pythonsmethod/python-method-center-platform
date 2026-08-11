import type { AssistantResult, ChatMessage } from "@/lib/assistant/claude";

const DEFAULT_OPENAI_MODEL = "gpt-5.1";

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
      choices?: { message?: { content?: string | null } }[];
    };

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return { status: "error", message: "Пустой ответ ассистента." };
    }

    return { status: "ok", reply };
  } catch {
    return {
      status: "error",
      message: "Не удалось связаться с ассистентом. Попробуйте позже."
    };
  }
}
