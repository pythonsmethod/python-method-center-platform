import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/assistant/claude", () => ({
  askClaude: vi.fn(),
  hasClaudeEnv: vi.fn(() => false)
}));

vi.mock("@/lib/assistant/openai", () => ({
  askOpenAi: vi.fn(async () => ({ status: "ok", reply: "deep answer" })),
  hasOpenAiEnv: vi.fn(() => true)
}));

import { askOpenAi } from "@/lib/assistant/openai";
import { askKarenAssistant } from "@/lib/assistant/router";

describe("private expert assistant quality path", () => {
  it("uses high reasoning even when only OpenAI is configured", async () => {
    const result = await askKarenAssistant(
      "system",
      [{ role: "user", content: "Analyze this case" }],
      2200
    );

    expect(result).toEqual({ status: "ok", reply: "deep answer" });
    expect(askOpenAi).toHaveBeenCalledWith(
      "system",
      [{ role: "user", content: "Analyze this case" }],
      2200,
      { reasoningEffort: "high" }
    );
  });
});
