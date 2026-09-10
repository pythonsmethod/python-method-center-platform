import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateHonestyScenario, honestyScenarios, type EvaluationRecord } from "@/lib/assistant/honesty-evaluation";

// Real models, synthetic sources: never connect knowledge, cases or any database.
vi.mock("@/lib/assistant/knowledge", () => ({ getKnowledgeForPrompt: async () => "" }));
import { buildPaidClientSystemPrompt, buildStaffSystemPrompt } from "@/lib/assistant/prompts";
import { askClaude, ASSISTANT_MODEL } from "@/lib/assistant/claude";
import { askOpenAi } from "@/lib/assistant/openai";

if (process.env.ANHAM_LIVE_EVAL_AUTHORIZED !== "1") {
  throw new Error("Live evaluation requires explicit authorization. No provider request was sent.");
}
const selected = process.env.ANHAM_EVAL_PROVIDER;
if (selected !== "claude" && selected !== "gpt") throw new Error("Select exactly one provider: ANHAM_EVAL_PROVIDER=claude or gpt.");
const key = selected === "claude" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
if (!key?.trim()) throw new Error("Selected provider credential is unavailable. No provider request was sent.");
// Restrict evaluation to the documented providers, never an env-configured proxy.
delete process.env.OPENAI_BASE_URL;
const records: EvaluationRecord[] = [];
let transportFailed = false;
const requestedIds = process.env.ANHAM_EVAL_SCENARIOS?.split(",").filter(Boolean);
const scenarios = honestyScenarios().filter(s => !requestedIds || requestedIds.includes(s.id));
if (!scenarios.length || requestedIds?.some(id => !scenarios.some(s => s.id === id))) {
  throw new Error("Unknown or empty scenario selection. No provider request was sent.");
}
const runId = process.env.ANHAM_EVAL_RUN_ID ?? "default";
if (!/^[a-z0-9-]{1,64}$/.test(runId)) throw new Error("Invalid evaluation run ID.");

function writeResults() {
  const folder = join(process.cwd(), "output", "assistant-evaluation");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `live-${selected}${runId === "default" ? "" : `-${runId}`}.json`), JSON.stringify({
    generatedAt: new Date().toISOString(), dataset: "synthetic-honesty-v3", provider: selected,
    model: selected === "claude" ? ASSISTANT_MODEL : process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol",
    plannedSamples: scenarios.length, collectedSamples: records.length,
    semanticReview: "PENDING; HTTP success and guard output are not factual validation",
    records
  }, null, 2));
}

describe.sequential(`Live synthetic honesty samples: ${selected}`, () => {
  for (const scenario of scenarios) {
    it(scenario.id, async (context) => {
      if (transportFailed) context.skip();
      const persona = scenario.audience === "client"
        ? await buildPaidClientSystemPrompt(null)
        : await buildStaffSystemPrompt(scenario.audience);
      const record = await evaluateHonestyScenario(scenario, selected, async (system, messages) => {
        const result = selected === "claude" ? await askClaude(system, messages, 1200) : await askOpenAi(system, messages, 1200);
        return result.status === "ok" ? result : { status: result.status };
      }, persona);
      records.push(record);
      transportFailed = record.transportStatus !== "ok";
      writeResults();
      console.info(`${selected}: ${records.length}/${scenarios.length} ${scenario.id} ${record.transportStatus}`);
      // Transport health only; passing this is NOT a factual/clinical score.
      expect(record.transportStatus).toBe("ok");
    });
  }
});

afterAll(writeResults);
