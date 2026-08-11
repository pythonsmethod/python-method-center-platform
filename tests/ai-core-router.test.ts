import { describe, expect, it, vi } from "vitest";

// Phase 1 of the provider-independence migration: the capability router.
//
// Phase 0 froze what the current router does. This file states what the new
// one must do, and it is written against fake providers on purpose — what is
// under test is the decision (who is asked, in what order, what happens when
// one falls over), not any vendor's model.

import { requiredCapabilities, TASK_CAPABILITIES } from "@/lib/ai/core/capabilities";
import { serializeAICall, type AICallRecord } from "@/lib/ai/core/observability";
import { eligibleProviders, runAIRequest } from "@/lib/ai/core/router";
import type {
  AICapability,
  AIErrorCode,
  AIProvider,
  AIRequest,
  AIResult
} from "@/lib/ai/core/types";

type FakeOptions = {
  capabilities?: AICapability[];
  available?: boolean;
  result?: AIResult;
  // A provider that never answers on its own — used to prove the timeout.
  hang?: boolean;
};

function ok(text: string, providerId: string, model = "fake-1"): AIResult {
  return { ok: true, response: { text, providerId, model } };
}

function fails(
  code: AIErrorCode,
  message = "провайдер упал",
  retryable = true
): AIResult {
  return { ok: false, error: { code, message, retryable } };
}

function fake(id: string, options: FakeOptions = {}) {
  const generate = vi.fn(
    async (_request: AIRequest, signal?: AbortSignal): Promise<AIResult> => {
      if (options.hang) {
        return new Promise<AIResult>((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
      }

      return options.result ?? ok(`ответ ${id}`, id);
    }
  );

  const provider: AIProvider = {
    id,
    label: id,
    capabilities: () =>
      new Set<AICapability>(options.capabilities ?? ["text", "reasoning"]),
    isAvailable: async () => options.available ?? true,
    generate
  };

  return { provider, generate };
}

const CHAT: AIRequest = {
  taskType: "client_chat",
  system: "система",
  messages: [{ role: "user", content: "Что означают мои анализы?" }],
  maxTokens: 500
};

const records: AICallRecord[] = [];
const log = (record: AICallRecord) => {
  records.push(record);
};

function run(request: AIRequest, providers: AIProvider[], extra = {}) {
  records.length = 0;

  return runAIRequest(request, { providers, log, ...extra });
}

describe("capabilities — what a job needs, written once", () => {
  it("gives every task type a requirement", () => {
    for (const [task, capabilities] of Object.entries(TASK_CAPABILITIES)) {
      expect(capabilities.length, task).toBeGreaterThan(0);
    }
  });

  it("makes reading a file need eyes and documents, not just text", () => {
    const required = requiredCapabilities({ taskType: "attachment_reading" });

    expect(required).toContain("vision");
    expect(required).toContain("documents");
  });

  it("lets a caller ask for more than the task implies, never for less", () => {
    const required = requiredCapabilities({
      taskType: "client_chat",
      capabilities: ["reasoning"]
    });

    // "text" comes from the task and survives the caller's addition.
    expect(new Set(required)).toEqual(new Set(["text", "reasoning"]));
  });
});

describe("who is eligible", () => {
  it("keeps configured providers in priority order", async () => {
    const first = fake("anthropic");
    const second = fake("openai");

    const { eligible } = await eligibleProviders(CHAT, {
      providers: [first.provider, second.provider]
    });

    expect(eligible.map((provider) => provider.id)).toEqual(["anthropic", "openai"]);
  });

  it("leaves out a provider that cannot do the job", async () => {
    const reader = fake("anthropic", {
      capabilities: ["text", "vision", "documents"]
    });
    const textOnly = fake("openai", { capabilities: ["text"] });

    const { eligible, lackingCapability } = await eligibleProviders(
      { ...CHAT, taskType: "attachment_reading" },
      { providers: [reader.provider, textOnly.provider] }
    );

    expect(eligible.map((provider) => provider.id)).toEqual(["anthropic"]);
    expect(lackingCapability.map((provider) => provider.id)).toEqual(["openai"]);
  });

  it("leaves out a provider with no key, and does not probe it", async () => {
    const configured = fake("anthropic");
    const missing = fake("openai", { available: false });

    const { eligible, notConfigured } = await eligibleProviders(CHAT, {
      providers: [configured.provider, missing.provider]
    });

    expect(eligible.map((provider) => provider.id)).toEqual(["anthropic"]);
    expect(notConfigured.map((provider) => provider.id)).toEqual(["openai"]);
    expect(missing.generate).not.toHaveBeenCalled();
  });

  it("moves a named provider to the front without removing the others", async () => {
    const first = fake("anthropic");
    const second = fake("openai");

    const { eligible } = await eligibleProviders(CHAT, {
      providers: [first.provider, second.provider],
      prefer: "openai"
    });

    expect(eligible.map((provider) => provider.id)).toEqual(["openai", "anthropic"]);
  });
});

describe("running a request", () => {
  it("asks the first eligible provider and stops there when it answers", async () => {
    const first = fake("anthropic");
    const second = fake("openai");

    const result = await run(CHAT, [first.provider, second.provider]);

    expect(result).toEqual(ok("ответ anthropic", "anthropic"));
    expect(second.generate).not.toHaveBeenCalled();
  });

  it("prefers a named provider but still falls over to the other", async () => {
    const anthropic = fake("anthropic");
    const openai = fake("openai", { result: fails("PROVIDER_DOWN") });

    const result = await run(CHAT, [anthropic.provider, openai.provider], {
      prefer: "openai"
    });

    expect(openai.generate).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ok("ответ anthropic", "anthropic"));
  });

  it("falls over silently — the answer carries no trace of the failure", async () => {
    const broken = fake("anthropic", { result: fails("RATE_LIMIT") });
    const working = fake("openai");

    const result = await run(CHAT, [broken.provider, working.provider]);

    expect(result.ok && result.response.text).toBe("ответ openai");
  });

  it("asks each provider exactly once — there is no third attempt", async () => {
    const first = fake("anthropic", { result: fails("PROVIDER_DOWN") });
    const second = fake("openai", { result: fails("PROVIDER_DOWN") });

    await run(CHAT, [first.provider, second.provider]);

    expect(first.generate).toHaveBeenCalledTimes(1);
    expect(second.generate).toHaveBeenCalledTimes(1);
  });

  it("does not carry a safety refusal to the next model", async () => {
    // Asking around until somebody agrees is the one failover a center for
    // people's health must not have.
    const refusing = fake("anthropic", {
      result: fails("SAFETY_REFUSAL", "Я не могу помочь с этим вопросом.", false)
    });
    const willing = fake("openai");

    const result = await run(CHAT, [refusing.provider, willing.provider]);

    expect(willing.generate).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("SAFETY_REFUSAL");
  });

  it("returns a failure, never an answer, when everyone falls over", async () => {
    const first = fake("anthropic", { result: fails("PROVIDER_DOWN") });
    const second = fake("openai", { result: fails("PROVIDER_DOWN") });

    const result = await run(CHAT, [first.provider, second.provider]);

    expect(result.ok).toBe(false);
  });

  it("reports the concrete breakage rather than 'not connected'", async () => {
    const first = fake("anthropic", { result: fails("AUTH_ERROR", "ключ отклонён") });
    const second = fake("openai", { result: fails("UNKNOWN") });

    const result = await run(CHAT, [first.provider, second.provider]);

    expect(!result.ok && result.error.code).toBe("AUTH_ERROR");
  });

  it("says nobody is connected when nobody is", async () => {
    const first = fake("anthropic", { available: false });
    const second = fake("openai", { available: false });

    const result = await run(CHAT, [first.provider, second.provider]);

    expect(!result.ok && result.error.code).toBe("NO_PROVIDER");
  });

  it("says the capability is missing when no provider has it", async () => {
    const textOnly = fake("anthropic", { capabilities: ["text"] });
    const alsoTextOnly = fake("openai", { capabilities: ["text"] });

    const result = await run({ ...CHAT, taskType: "attachment_reading" }, [
      textOnly.provider,
      alsoTextOnly.provider
    ]);

    expect(!result.ok && result.error.code).toBe("CAPABILITY_UNAVAILABLE");
    expect(textOnly.generate).not.toHaveBeenCalled();
  });

  it("gives up on a provider that never answers, and asks the next one", async () => {
    const silent = fake("anthropic", { hang: true });
    const working = fake("openai");

    const result = await run(CHAT, [silent.provider, working.provider], {
      timeoutMs: 20
    });

    expect(result.ok && result.response.providerId).toBe("openai");
    expect(records[0]?.errorCode).toBe("TIMEOUT");
  });
});

describe("what the log keeps", () => {
  it("records the failover: who fell, why, and who was asked next", async () => {
    const first = fake("anthropic", { result: fails("RATE_LIMIT") });
    const second = fake("openai");

    await run(CHAT, [first.provider, second.provider]);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      providerId: "anthropic",
      outcome: "error",
      errorCode: "RATE_LIMIT",
      fallbackOccurred: false
    });
    expect(records[1]).toMatchObject({
      providerId: "openai",
      outcome: "ok",
      fallbackOccurred: true,
      fallbackFrom: "anthropic",
      fallbackReason: "RATE_LIMIT"
    });
  });

  it("ties both attempts of one action together", async () => {
    const first = fake("anthropic", { result: fails("PROVIDER_DOWN") });
    const second = fake("openai");

    await run({ ...CHAT, correlationId: "case-42" }, [first.provider, second.provider]);

    expect(records.map((record) => record.correlationId)).toEqual(["case-42", "case-42"]);
  });

  it("never writes down what the person asked or what they were told", async () => {
    // A server log is not a medical record. If this test ever fails, someone
    // has widened the log to carry a client's analyses into a log aggregator.
    const provider = fake("anthropic");

    await run(
      {
        ...CHAT,
        system: "СЕКРЕТНЫЙ ПРОМПТ",
        messages: [{ role: "user", content: "мой диагноз" }]
      },
      [provider.provider]
    );

    const written = JSON.stringify(serializeAICall(records[0]));

    expect(written).not.toContain("диагноз");
    expect(written).not.toContain("СЕКРЕТНЫЙ");
    expect(written).not.toContain("ответ anthropic");
  });
});
