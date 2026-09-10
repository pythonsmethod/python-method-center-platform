import { describe, expect, it, vi } from "vitest";
import { buildGuestSystemPrompt, buildRegisteredSystemPrompt, buildPaidClientSystemPrompt, buildStaffSystemPrompt } from "@/lib/assistant/prompts";
vi.mock("@/lib/assistant/knowledge", () => ({ getKnowledgeForPrompt: vi.fn().mockResolvedValue("") }));

describe("seven safety clarifications", () => {
  it.each([
    ["guest", () => buildGuestSystemPrompt()],
    ["registered", () => buildRegisteredSystemPrompt(null)],
    ["paid", () => buildPaidClientSystemPrompt(null)],
    ["karen", () => buildStaffSystemPrompt("karen")],
    ["founder", () => buildStaffSystemPrompt("founder")],
  ] as const)("preserves all clarifications and support for %s", async (_tier, build) => {
    const prompt = await build();
    for (const rule of ["Dangerous challenges:", "Eating disorders:", "Child protection:", "Center safeguards:", "Legal decisions:", "Gossip and allegations:", "Invented capabilities:", "never the alleged abuser", "Published center terms and support procedures may be explained", "without declaring guilt", "do not reject support because of a keyword"]) expect(prompt).toContain(rule);
  });
});
