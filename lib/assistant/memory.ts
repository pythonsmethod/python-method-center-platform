import type { KnowledgeAudience } from "@/lib/assistant/knowledge";

export const MEMORY_COLLECTIONS = ["book", "method", "client_answers"] as const;
export type MemoryCollection = (typeof MEMORY_COLLECTIONS)[number];

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
  const lastAssistant = messages.findLast((message) => message.role === "assistant")?.content.trim();
  const lastUser = messages.findLast((message) => message.role === "user")?.content.trim();
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
