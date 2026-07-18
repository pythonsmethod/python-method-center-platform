import type { AssistantResult, ChatMessage } from "@/lib/assistant/claude";

const DEFAULT_OPENAI_MODEL = "gpt-5.1";

export function hasOpenAiEnv(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

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
        message: "GPT перегружен. Попробуйте через минуту."
      };
    }

    if (!response.ok) {
      return {
        status: "error",
        message: "GPT временно недоступен. Попробуйте позже."
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return { status: "error", message: "Пустой ответ GPT." };
    }

    return { status: "ok", reply };
  } catch {
    return {
      status: "error",
      message: "Не удалось связаться с GPT. Попробуйте позже."
    };
  }
}
