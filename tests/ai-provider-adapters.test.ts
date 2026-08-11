import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Phase 1: the two adapters.
//
// What matters here is the translation, not the models. Each adapter turns
// one vendor's way of failing — an HTTP status, an SDK exception class — into
// the shared taxonomy, so that nothing above them ever has to know which
// vendor it was talking to. The wording each failure carries is the wording
// the site already shows today; keeping it identical is what makes the next
// phase a move rather than a change.

import { openAiProvider } from "@/lib/ai/providers/openai";
import { providerPriority } from "@/lib/ai/providers/registry";
import type { AIRequest } from "@/lib/ai/core/types";

const CHAT: AIRequest = {
  taskType: "client_chat",
  system: "система",
  messages: [{ role: "user", content: "Здравствуйте" }],
  maxTokens: 300
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

function respondWith(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (...args: unknown[]) => {
    void args;

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body
    };
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("the OpenAI adapter", () => {
  it("declares what it can actually carry, and no more", () => {
    const capabilities = openAiProvider.capabilities();

    expect(capabilities.has("text")).toBe(true);
    // Not yet wired for files: declaring it would send the router's
    // attachments into a request that silently drops them.
    expect(capabilities.has("vision")).toBe(false);
    expect(capabilities.has("documents")).toBe(false);
  });

  it("is unavailable without a key, and says so as NO_PROVIDER", async () => {
    delete process.env.OPENAI_API_KEY;

    expect(await openAiProvider.isAvailable()).toBe(false);

    const result = await openAiProvider.generate(CHAT);

    expect(!result.ok && result.error.code).toBe("NO_PROVIDER");
  });

  it("returns the reply with the model that produced it", async () => {
    process.env.OPENAI_MODEL = "gpt-test";
    respondWith({
      choices: [{ message: { content: "  Добрый день  " } }],
      usage: { prompt_tokens: 11, completion_tokens: 4 }
    });

    const result = await openAiProvider.generate(CHAT);

    expect(result.ok && result.response).toMatchObject({
      text: "Добрый день",
      providerId: "openai",
      model: "gpt-test",
      usage: { inputTokens: 11, outputTokens: 4 }
    });
  });

  it("normalizes the statuses that mean different things", async () => {
    const cases = [
      [429, "RATE_LIMIT"],
      [401, "AUTH_ERROR"],
      [500, "PROVIDER_DOWN"],
      [400, "UNKNOWN"]
    ] as const;

    for (const [status, code] of cases) {
      respondWith({}, status);

      const result = await openAiProvider.generate(CHAT);

      expect(!result.ok && result.error.code, `HTTP ${status}`).toBe(code);
    }
  });

  it("treats an empty reply as a failure, not as an answer", async () => {
    respondWith({ choices: [{ message: { content: "   " } }] });

    const result = await openAiProvider.generate(CHAT);

    expect(!result.ok && result.error.code).toBe("INVALID_RESPONSE");
  });

  it("refuses attachments instead of answering as if it had read them", async () => {
    const fetchMock = respondWith({ choices: [{ message: { content: "ответ" } }] });

    const result = await openAiProvider.generate({
      ...CHAT,
      taskType: "attachment_reading",
      attachments: [{ name: "analiz.pdf", mediaType: "application/pdf", data: "AAAA" }]
    });

    expect(!result.ok && result.error.code).toBe("CAPABILITY_UNAVAILABLE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can be pointed at any compatible endpoint", async () => {
    process.env.OPENAI_BASE_URL = "https://gateway.internal/";
    const fetchMock = respondWith({ choices: [{ message: { content: "ответ" } }] });

    await openAiProvider.generate(CHAT);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://gateway.internal/v1/chat/completions"
    );
  });

  it("blames our own timeout on the clock, not on the provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      })
    );

    const result = await openAiProvider.generate(CHAT);

    expect(!result.ok && result.error.code).toBe("TIMEOUT");
  });
});

describe("the registry", () => {
  it("keeps Claude first, as the site does today", () => {
    delete process.env.AI_PROVIDER_PRIORITY;

    expect(providerPriority()).toEqual(["anthropic", "openai"]);
  });

  it("lets deployment re-decide the order without touching code", () => {
    process.env.AI_PROVIDER_PRIORITY = "openai";

    expect(providerPriority()).toEqual(["openai", "anthropic"]);
  });

  it("survives a typo rather than taking the assistant off the site", () => {
    process.env.AI_PROVIDER_PRIORITY = "opeani, anthropic";

    expect(providerPriority()).toEqual(["anthropic", "openai"]);
  });
});
