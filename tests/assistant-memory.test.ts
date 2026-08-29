import { describe, expect, it } from "vitest";
import { audienceForMemory, buildApprovedMemory, isMemoryCollection, memoryCollectionFromCommand, sanitizeMemoryMessages } from "@/lib/assistant/memory";

describe("approved assistant memory", () => {
  it("routes each destination to the intended assistants", () => {
    expect(audienceForMemory("book")).toBe("staff");
    expect(audienceForMemory("method")).toBe("both");
    expect(audienceForMemory("client_answers")).toBe("client");
  });

  it("accepts only explicit memory destinations", () => {
    expect(isMemoryCollection("method")).toBe(true);
    expect(isMemoryCollection("general")).toBe(false);
  });

  it("stores the final exchange as context and approved wording", () => {
    const memory = buildApprovedMemory([
      { role: "user", content: "Как отвечать на этот вопрос?" },
      { role: "assistant", content: "Отвечайте спокойно и конкретно." }
    ], "client_answers");

    expect(memory?.title).toContain("Проверенная основа ответа клиентам");
    expect(memory?.content).toContain("Как отвечать");
    expect(memory?.content).toContain("Отвечайте спокойно");
  });

  it("accepts a completed exchange ending in an assistant answer", () => {
    expect(sanitizeMemoryMessages([
      { role: "user", content: "Правило" },
      { role: "assistant", content: "Формулировка" }
    ])).toHaveLength(2);
  });

  it("recognizes direct save commands in both languages", () => {
    expect(memoryCollectionFromCommand("Запиши это в базу знаний")).toBe("method");
    expect(memoryCollectionFromCommand("Сохрани это в книгу")).toBe("book");
    expect(memoryCollectionFromCommand("Save this to the knowledge base")).toBe("method");
  });

  it("saves the substantive exchange before a save command and refusal", () => {
    const memory = buildApprovedMemory([
      { role: "user", content: "Как разбирать анализы?" },
      { role: "assistant", content: "Разбор готовится от первого лица." },
      { role: "user", content: "Сохрани это в базу знаний" },
      { role: "assistant", content: "Я не могу это сделать." }
    ], "method");

    expect(memory?.content).toContain("Как разбирать анализы?");
    expect(memory?.content).toContain("Разбор готовится от первого лица.");
    expect(memory?.content).not.toContain("Я не могу это сделать.");
  });
});
