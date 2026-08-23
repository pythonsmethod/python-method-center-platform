import { describe, expect, it } from "vitest";
import { buildStaffSystemPrompt } from "@/lib/assistant/prompts";

describe("private assistant personas", () => {
  it("gives the founder a strategy and platform partner", async () => {
    const prompt = await buildStaffSystemPrompt("founder");

    expect(prompt).toContain("личный ИИ-помощник Анны");
    expect(prompt).toContain("решениями о продукте, платформе и операциях");
    expect(prompt).toContain("Анна и Professor Python оба формируют");
    expect(prompt).not.toContain("${METHOD_ALIGNMENT}");
  });

  it("keeps Karen's assistant centered on method and case work", async () => {
    const prompt = await buildStaffSystemPrompt("karen");

    expect(prompt).toContain("личный ИИ-помощник Professor Python");
    expect(prompt).toContain("Решения по кейсу всегда принимает Professor Python");
    expect(prompt).toContain("ты работаешь ВНУТРИ метода Professor Python");
    expect(prompt).not.toContain("личный ИИ-помощник Анны");
  });
});
