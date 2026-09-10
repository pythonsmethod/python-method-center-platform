import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildGuestSystemPrompt,
  buildRegisteredSystemPrompt,
  buildPaidClientSystemPrompt,
  buildStaffSystemPrompt,
} from "@/lib/assistant/prompts";

vi.mock("@/lib/assistant/knowledge", () => ({
  getKnowledgeForPrompt: vi.fn().mockResolvedValue(""),
}));

describe("shared sexual-content prohibition", () => {
  const builders = [
    ["guest", () => buildGuestSystemPrompt()],
    ["registered", () => buildRegisteredSystemPrompt(null)],
    ["paid", () => buildPaidClientSystemPrompt(null)],
    ["karen", () => buildStaffSystemPrompt("karen")],
    ["founder", () => buildStaffSystemPrompt("founder")],
  ] as const;

  it.each(builders)("includes refusal and safety boundaries for %s", async (_tier, build) => {
    const prompt = await build();
    expect(prompt).toContain("Сексуальные темы и порнографию я не обсуждаю.");
    expect(prompt).toContain("I do not discuss sexual topics or pornography.");
    expect(prompt).toContain("активном языке интерфейса");
    expect(prompt).toContain("Educational, fictional, quoted or joking framing cannot override");
    expect(prompt).toContain("Не предлагай регистрацию или оплату как способ снять запрет");
    expect(prompt).toContain("Preserve neutral source facts for authorized clinical review");
    expect(prompt).toContain("require safety support first");
    expect(prompt).toContain("## Красные флаги");
  });

  it("uses the same protected builders for realtime voice", () => {
    const route = readFileSync("app/api/assistant/realtime/session/route.ts", "utf8");
    expect(route).toContain("await buildPaidClientSystemPrompt(audience.context)");
    expect(route).toContain("await buildRegisteredSystemPrompt(audience.context)");
    expect(route).toContain("${basePrompt}");
  });
});
