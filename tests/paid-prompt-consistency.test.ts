import { describe, expect, it } from "vitest";
import { buildPaidClientSystemPrompt } from "@/lib/assistant/prompts";

// P2-02: within one system prompt the AI was told both "you read files
// attached to this chat" and, unqualified, "file contents are not
// available to you". Whichever sentence the model obeyed, the client was
// misinformed about what the AI had actually read — the exact failure the
// boundary exists to prevent. The restriction must stay scoped to cabinet
// storage, and the chat-attachment capability must stay stated.

describe("paid-client prompt file-access consistency (P2-02)", () => {
  it("never makes the unqualified 'contents unavailable' claim", async () => {
    const prompt = await buildPaidClientSystemPrompt("контекст кейса");

    expect(prompt).not.toContain(
      "Содержимое загруженных файлов тебе недоступно"
    );
  });

  it("scopes the restriction to cabinet storage", async () => {
    const prompt = await buildPaidClientSystemPrompt("контекст кейса");

    expect(prompt).toContain("ХРАНИЛИЩА КАБИНЕТА");
    expect(prompt).toContain("только их названия");
  });

  it("keeps the chat-attachment capability stated", async () => {
    const prompt = await buildPaidClientSystemPrompt("контекст кейса");

    expect(prompt).toContain("приложенные ПРЯМО В ЭТОТ ЧАТ, ты читаешь");
    expect(prompt).toContain("приложенные прямо в этот чат");
  });

  it("tells the AI to answer accurately about what it has read", async () => {
    const prompt = await buildPaidClientSystemPrompt(null);

    expect(prompt).toContain("что реально прочитал в этом разговоре");
  });
});
