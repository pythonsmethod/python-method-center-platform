import Anthropic from "@anthropic-ai/sdk";
import {
  isImageType,
  isTextType,
  PDF_TYPE,
  type ChatAttachment
} from "@/lib/assistant/attachments";

export const ASSISTANT_MODEL = "claude-opus-4-8";

export const MAX_HISTORY_MESSAGES = 24;
export const MAX_MESSAGE_CHARS = 4000;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

let client: Anthropic | null = null;

export function hasClaudeEnv(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function getClient(): Anthropic | null {
  if (!hasClaudeEnv()) {
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

// Prompt caching: the system prompt (rules + knowledge base) is the biggest
// and most repeated part of every request. Marking it as cacheable makes
// repeat reads roughly ten times cheaper than fresh input tokens. Short
// prompts are sent as-is — below the provider minimum caching does nothing.
const CACHEABLE_SYSTEM_MIN_CHARS = 4000;

function buildSystemParam(system: string) {
  if (system.length < CACHEABLE_SYSTEM_MIN_CHARS) {
    return system;
  }

  return [
    {
      type: "text" as const,
      text: system,
      cache_control: { type: "ephemeral" as const }
    }
  ];
}

// Turns the last user message into content blocks so the attached photos,
// PDFs and notes travel with the question they belong to.
function withAttachments(
  messages: ChatMessage[],
  attachments: ChatAttachment[]
): Anthropic.MessageParam[] {
  const params: Anthropic.MessageParam[] = messages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  const lastIndex = params.length - 1;
  const last = params[lastIndex];

  if (!last || last.role !== "user") {
    return params;
  }

  const blocks: Anthropic.ContentBlockParam[] = [];

  for (const file of attachments) {
    if (isImageType(file.mediaType)) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: file.data
        }
      });
      continue;
    }

    if (file.mediaType === PDF_TYPE) {
      blocks.push({
        type: "document",
        title: file.name,
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: file.data
        }
      });
      continue;
    }

    if (isTextType(file.mediaType)) {
      // Plain text goes in as text: it needs no document wrapper and stays
      // readable in the transcript.
      const decoded = Buffer.from(file.data, "base64")
        .toString("utf8")
        .slice(0, 100_000);

      blocks.push({
        type: "text",
        text: `Содержимое приложенного файла «${file.name}»:\n${decoded}`
      });
    }
  }

  blocks.push({ type: "text", text: String(last.content) });
  params[lastIndex] = { role: "user", content: blocks };

  return params;
}

export async function askClaude(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  attachments?: ChatAttachment[]
): Promise<AssistantResult> {
  const anthropic = getClient();

  if (!anthropic) {
    return { status: "unavailable" };
  }

  try {
    const response = await anthropic.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: maxTokens,
      system: buildSystemParam(system),
      messages:
        attachments && attachments.length > 0
          ? withAttachments(messages, attachments)
          : messages
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
