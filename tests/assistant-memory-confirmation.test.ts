import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("explicit confirmation before durable AI memory", () => {
  const chat = readFileSync("components/assistant/AssistantChat.tsx", "utf8");
  const prompts = readFileSync("lib/assistant/prompts.ts", "utf8");

  it("never auto-saves a spoken save command", () => {
    const commandBranch = chat.slice(
      chat.indexOf("if (requestedMemory)"),
      chat.indexOf("const visible = attached.length")
    );
    expect(commandBranch).toContain('setMemoryState("offer")');
    expect(commandBranch).not.toContain("saveMemory(");
  });

  it("asks Karen to choose every available destination in both languages", () => {
    expect(chat).toContain("что сделать с этим результатом?");
    expect(chat).toContain("what should be done with this result?");
    for (const destination of ["book", "method", "client_answers"]) {
      expect(chat).toContain(`saveMemory("${destination}")`);
    }
    expect(chat).toContain("Не сохранять");
    expect(chat).toContain("Do not save");
  });

  it("forbids both private personas from claiming an unconfirmed save", () => {
    expect(prompts).toContain("никогда не решай назначение сам");
    expect(prompts).toContain("не выбирай назначение");
    expect(prompts.match(/обязательно/gi)?.length).toBeGreaterThanOrEqual(2);
  });
});
