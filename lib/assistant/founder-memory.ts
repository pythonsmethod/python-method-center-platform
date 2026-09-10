import type { ChatMessage } from "@/lib/assistant/claude";

// Only a direct instruction by the authenticated founder can write memory.
// Quoted text, questions and negative instructions are ordinary conversation.
export function founderMemoryFromCommand(messages: ChatMessage[], english = false) {
  const last = messages.at(-1);
  if (last?.role !== "user") return null;
  const match = last.content.trim().match(/^(?:(?:анхам|anham)[,!]?\s+)?(?:(?:пожалуйста|please)[, ]+)?(?:запомни|сохрани|запиши|remember|save|record)(?=\s|:|$)[\s,:]*([\s\S]*)$/iu);
  if (!match) return null;
  let content = match[1].replace(/^(?:пожалуйста[, ]*|please[, ]*)/iu, "").trim();
  content = content.replace(/^(?:в (?:свою |твою )?(?:память|базу знаний)|(?:to|in) (?:your |the )?(?:memory|knowledge base))[\s,:]*/iu, "").trim();
  if (/^(?:(?:это|всё это|этот ответ|this|that|this answer)(?:\s+(?:в (?:память|базу знаний|книгу)|(?:to|in) (?:the )?(?:memory|knowledge base|book)))?)?[.!]?$/iu.test(content)) {
    content = messages.slice(0, -1).findLast(message => message.role === "assistant")?.content ?? "";
  }
  return {
    title: `${english ? "Anna's note" : "Заметка Анны"}: ${content.split(/\r?\n/)[0]}`.slice(0, 200),
    content,
  };
}
