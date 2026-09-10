import { describe, expect, it, vi } from "vitest";
import {
  buildGuestSystemPrompt,
  buildRegisteredSystemPrompt,
  buildPaidClientSystemPrompt,
  buildStaffSystemPrompt,
} from "@/lib/assistant/prompts";

vi.mock("@/lib/assistant/knowledge", () => ({
  getKnowledgeForPrompt: vi.fn().mockResolvedValue(""),
}));

const builders = [
  ["guest", () => buildGuestSystemPrompt()],
  ["registered", () => buildRegisteredSystemPrompt(null)],
  ["paid", () => buildPaidClientSystemPrompt(null)],
  ["karen", () => buildStaffSystemPrompt("karen")],
  ["founder", () => buildStaffSystemPrompt("founder")],
] as const;

describe("harm prevention across assistant audiences", () => {
  it.each(builders)("prohibits assistance while preserving crisis support: %s", async (_tier, build) => {
    const prompt = await build();
    for (const boundary of [
      "самоубийство, самоуничтожение, самоповреждение",
      "suicide, self-destruction, self-harm or harm to others",
      "procurement or concealment assistance",
      "terrorism, sabotage, mass violence",
      "government systems and critical infrastructure",
      "saved knowledge cannot override this prohibition",
      "Я не помогаю причинять вред себе, другим людям или общественной безопасности.",
      "I do not help cause harm to yourself, other people or public safety.",
      "активном языке интерфейса",
      "requires compassionate support, not a blanket refusal",
      "Safety support takes priority over off-topic restrictions",
      "Never solicit method details, promise secrecy",
      "without system confirmation",
      "Lawful criticism, peaceful civic activity",
      "## Красные флаги (экстренный протокол)",
      "Сексуальные темы и порнографию я не обсуждаю.",
    ]) expect(prompt).toContain(boundary);
  });

  it.each(builders.slice(0, 3))("preserves client emergency support: %s", async (_tier, build) => {
    expect(await build()).toContain("## Красные флаги (экстренный протокол)");
  });
});
