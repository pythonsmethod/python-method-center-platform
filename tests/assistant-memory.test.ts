import { describe, expect, it } from "vitest";
import { audienceForMemory, buildApprovedMemory, isMemoryCollection } from "@/lib/assistant/memory";

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
});
