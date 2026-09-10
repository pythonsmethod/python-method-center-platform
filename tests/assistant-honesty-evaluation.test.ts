import { describe, expect, it } from "vitest";
import { evaluateHonestyScenario, honestyScenarios } from "@/lib/assistant/honesty-evaluation";
import { FACTUAL_HONESTY_RULE } from "@/lib/assistant/factual-honesty";

describe("synthetic behavior evaluation harness", () => {
  it("covers both languages for each mechanism", () => {
    const scenarios = honestyScenarios();
    expect(scenarios).toHaveLength(26);
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(26);
    for (const scenario of scenarios.filter((s) => s.locale === "ru")) expect(scenarios.some((s) => s.id === scenario.id.replace(/_ru$/, "_en"))).toBe(true);
  });
  it("records raw and delivered answers separately and never calls a screened answer a model pass", async () => {
    const scenario = honestyScenarios().find((s) => s.id === "false_action_en")!;
    const record = await evaluateHonestyScenario(scenario, "mock", async (system) => {
      expect(system.endsWith(FACTUAL_HONESTY_RULE)).toBe(true);
      return { status: "ok", reply: "I sent the refund request." };
    });
    expect(record.rawReply).toContain("I sent");
    expect(record.deliveredReply).not.toContain("I sent");
    expect(record.guardChangedReply).toBe(true);
    expect(record.reviewStatus).toBe("pending_human_review");
  });
  it("does not count missing access or a failed provider as validation", async () => {
    const record = await evaluateHonestyScenario(honestyScenarios()[0], "mock", async () => ({ status: "unavailable" }));
    expect(record).toMatchObject({ transportStatus: "unavailable", rawReply: null, deliveredReply: null, reviewStatus: "not_evaluated" });
  });
});
