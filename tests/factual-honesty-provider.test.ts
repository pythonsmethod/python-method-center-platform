import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FACTUAL_HONESTY_RULE } from "@/lib/assistant/factual-honesty";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
import { askClaude } from "@/lib/assistant/claude";
import { askOpenAi } from "@/lib/assistant/openai";

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-test-key");
  vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
  create.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const messages = [{ role: "user" as const, content: "Synthetic data only" }];

describe("policy at the provider boundary", () => {
  it("applies to Claude attachment/OCR calls and their continuation without changing JSON", async () => {
    create.mockResolvedValueOnce({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"value":' }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: 'null}' }] });
    const result = await askClaude("Return only JSON", messages, 100, []);
    expect(result).toEqual({ status: "ok", reply: '{"value":\nnull}' });
    for (const [request] of create.mock.calls) {
      const system = typeof request.system === "string" ? request.system : request.system[0].text;
      expect(system.endsWith(FACTUAL_HONESTY_RULE)).toBe(true);
      expect(system).toContain("Return only JSON");
    }
  });

  it("applies to OpenAI and its continuation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: "length", message: { content: "Data" } }] }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "unavailable" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await askOpenAi("Synthetic prompt", messages, 100)).toEqual({ status: "ok", reply: "Data\nunavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, request] of fetchMock.mock.calls) {
      const payload = JSON.parse(request.body);
      expect(payload.messages[0].content.endsWith(FACTUAL_HONESTY_RULE)).toBe(true);
    }
  });
});
