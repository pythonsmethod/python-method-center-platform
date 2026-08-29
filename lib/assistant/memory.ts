import type { KnowledgeAudience } from "@/lib/assistant/knowledge";

export const MEMORY_COLLECTIONS = ["book", "method", "client_answers"] as const;
export type MemoryCollection = (typeof MEMORY_COLLECTIONS)[number];

type MemoryMessage = { role: "user" | "assistant"; content: string };

const SAVE_TO_BOOK = /(?:\bbook\b|книг(?:а|у|е))/iu;
const SAVE_TO_CLIENT_ANSWERS = /(?:client(?:-|\s*)answer|ответ(?:ов|ы)?\s+клиент)/iu;
const SAVE_INSTRUCTION = /(?:\b(?:save|remember|record|add)\b[\s\S]{0,80}\b(?:knowledge|memory|method|book)\b|(?:сохрани|сохранить|запиши|записать|добавь|добавить|запомни)[\s\S]{0,80}(?:баз[уы]\s+знаний|памят|метод|книг))/iu;

export function memoryCollectionFromCommand(value: string): MemoryCollection | null {
  if (!SAVE_INSTRUCTION.test(value.trim())) return null;
  if (SAVE_TO_BOOK.test(value)) return "book";
  if (SAVE_TO_CLIENT_ANSWERS.test(value)) return "client_answers";
  return "method";
}

// Chat requests must end in a user message, but memory is normally captured
// immediately after the assistant has answered. Validate that transcript
// independently so a perfectly valid completed exchange is not rejected.
export function sanitizeMemoryMessages(value: unknown): MemoryMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const messages: MemoryMessage[] = [];
  for (const item of value.slice(-24)) {
    if (typeof item !== "object" || item === null) return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) return null;
    messages.push({ role, content: content.trim().slice(0, 4000) });
  }
  return messages;
}

export function isMemoryCollection(value: unknown): value is MemoryCollection {
  return typeof value === "string" && MEMORY_COLLECTIONS.includes(value as MemoryCollection);
}

export function audienceForMemory(collection: MemoryCollection): KnowledgeAudience {
  if (collection === "book") return "staff";
  if (collection === "client_answers") return "client";
  return "both";
}

export function buildApprovedMemory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  collection: MemoryCollection
): { title: string; content: string } | null {
  const commandIndex = messages.findLastIndex(
    (message) => message.role === "user" && memoryCollectionFromCommand(message.content) !== null
  );
  const source = commandIndex >= 0 ? messages.slice(0, commandIndex) : messages;
  const assistantIndex = source.findLastIndex((message) => message.role === "assistant");
  if (assistantIndex < 0) return null;
  const lastAssistant = source[assistantIndex]?.content.trim();
  const lastUser = source.slice(0, assistantIndex).findLast((message) => message.role === "user")?.content.trim();
  if (!lastAssistant || !lastUser) return null;

  const rawTitle = lastUser.split(/\r?\n|[.!?](?:\s|$)/, 1)[0]?.trim() || "Знание из диалога";
  const prefix = collection === "book" ? "Материал для внутренней книги"
    : collection === "method" ? "Утверждённый принцип метода"
      : "Проверенная основа ответа клиентам";

  return {
    title: `${prefix}: ${rawTitle}`.slice(0, 200),
    content: `Контекст Professor Python:\n${lastUser}\n\nУтверждённая формулировка:\n${lastAssistant}`.slice(0, 8000)
  };
}
