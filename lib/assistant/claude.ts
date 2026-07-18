import Anthropic from "@anthropic-ai/sdk";

export const ASSISTANT_MODEL = "claude-opus-4-8";

export const MAX_HISTORY_MESSAGES = 24;
export const MAX_MESSAGE_CHARS = 4000;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

let client: Anthropic | null = null;

export function hasAssistantEnv(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function getClient(): Anthropic | null {
  if (!hasAssistantEnv()) {
    return null;
  }

  client ??= new Anthropic();

  return client;
}

// Validates and normalizes an untrusted chat history from the browser.
export function sanitizeChatMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const messages: ChatMessage[] = [];

  for (const item of value.slice(-MAX_HISTORY_MESSAGES)) {
    if (typeof item !== "object" || item === null) {
      return null;
    }

    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;

    if (role !== "user" && role !== "assistant") {
      return null;
    }

    if (typeof content !== "string" || !content.trim()) {
      return null;
    }

    messages.push({
      role,
      content: content.trim().slice(0, MAX_MESSAGE_CHARS)
    });
  }

  if (messages[0]?.role !== "user" || messages[messages.length - 1]?.role !== "user") {
    return null;
  }

  return messages;
}

export type AssistantResult =
  | { status: "ok"; reply: string }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export async function askAssistant(
  system: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<AssistantResult> {
  const anthropic = getClient();

  if (!anthropic) {
    return { status: "unavailable" };
  }

  try {
    const response = await anthropic.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: maxTokens,
      system,
      messages
    });

    if (response.stop_reason === "refusal") {
      return {
        status: "ok",
        reply:
          "Я не могу помочь с этим вопросом. Пожалуйста, напишите команде через страницу «Поддержка» — живой человек ответит вам."
      };
    }

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!reply) {
      return { status: "error", message: "Пустой ответ ассистента." };
    }

    return { status: "ok", reply };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return {
        status: "error",
        message: "Ассистент перегружен. Попробуйте через минуту."
      };
    }

    if (error instanceof Anthropic.APIError) {
      return {
        status: "error",
        message: "Ассистент временно недоступен. Попробуйте позже."
      };
    }

    return {
      status: "error",
      message: "Не удалось связаться с ассистентом. Попробуйте позже."
    };
  }
}
