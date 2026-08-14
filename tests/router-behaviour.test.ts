import { beforeEach, describe, expect, it, vi } from "vitest";

// Phase 0 of the provider-independence migration: freeze what the router
// does today, before anything is rebuilt on top of a provider interface.
//
// The router is the piece the migration replaces first, and it had no tests
// at all. Everything below is a description of current behaviour, not a
// wish: if a line here starts failing during the migration, the migration
// changed something it was told to preserve.
//
// The two providers are mocked. What is under test is the routing — which
// provider is asked, in which order, what happens when one fails, and what
// the person ends up seeing — not the models themselves.

const askClaude = vi.fn();
const askOpenAi = vi.fn();
const hasClaudeEnv = vi.fn(() => true);
const hasOpenAiEnv = vi.fn(() => true);

vi.mock("@/lib/assistant/claude", () => ({
  askClaude: (...args: unknown[]) => askClaude(...args),
  hasClaudeEnv: () => hasClaudeEnv()
}));

vi.mock("@/lib/assistant/openai", () => ({
  askOpenAi: (...args: unknown[]) => askOpenAi(...args),
  hasOpenAiEnv: () => hasOpenAiEnv()
}));

const { askAssistantTeam, hasAssistantEnv, isAssistantProvider } = await import(
  "@/lib/assistant/router"
);

const ok = (reply: string) => ({ status: "ok" as const, reply });
const failed = (message = "провайдер упал") => ({ status: "error" as const, message });
const absent = { status: "unavailable" as const };

const MESSAGES = [{ role: "user" as const, content: "Что означают мои анализы?" }];

function ask(provider: Parameters<typeof askAssistantTeam>[3], attribution = false) {
  return askAssistantTeam("система", MESSAGES, 500, provider, { attribution });
}

beforeEach(() => {
  askClaude.mockReset();
  askOpenAi.mockReset();
  hasClaudeEnv.mockReturnValue(true);
  hasOpenAiEnv.mockReturnValue(true);
});

describe("which modes exist", () => {
  it("accepts exactly the five the product offers", () => {
    for (const provider of ["auto", "best", "claude", "gpt", "both"]) {
      expect(isAssistantProvider(provider), provider).toBe(true);
    }

    for (const nonsense of ["gemini", "", null, undefined, 7]) {
      expect(isAssistantProvider(nonsense)).toBe(false);
    }
  });

  it("is available while at least one provider is configured", () => {
    hasClaudeEnv.mockReturnValue(false);
    expect(hasAssistantEnv()).toBe(true);

    hasOpenAiEnv.mockReturnValue(false);
    expect(hasAssistantEnv()).toBe(false);
  });

  it("answers nothing at all when neither provider is configured", async () => {
    hasClaudeEnv.mockReturnValue(false);
    hasOpenAiEnv.mockReturnValue(false);

    await expect(ask("auto")).resolves.toEqual(absent);
    expect(askClaude).not.toHaveBeenCalled();
    expect(askOpenAi).not.toHaveBeenCalled();
  });
});

describe("auto — one model, silent failover", () => {
  it("asks Claude first when it is configured", async () => {
    askClaude.mockResolvedValue(ok("ответ Claude"));

    await expect(ask("auto")).resolves.toEqual(ok("ответ Claude"));
    expect(askOpenAi).not.toHaveBeenCalled();
  });

  it("starts with GPT when Claude is not configured", async () => {
    hasClaudeEnv.mockReturnValue(false);
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    await expect(ask("auto")).resolves.toEqual(ok("ответ GPT"));
    expect(askClaude).not.toHaveBeenCalled();
  });

  it("falls over to the other provider without telling the person", async () => {
    // The failover is silent by design: a client asking about their health
    // should not be handed a technical explanation of whose server fell.
    askClaude.mockResolvedValue(failed());
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    await expect(ask("auto")).resolves.toEqual(ok("ответ GPT"));
  });

  it("reports the concrete failure rather than 'not configured'", async () => {
    // A real error tells the team what broke; "unavailable" hides it.
    askClaude.mockResolvedValue(failed("Claude перегружен"));
    askOpenAi.mockResolvedValue(absent);

    await expect(ask("auto")).resolves.toEqual(failed("Claude перегружен"));
  });

  it("never tries a third time", async () => {
    askClaude.mockResolvedValue(failed());
    askOpenAi.mockResolvedValue(failed());

    await ask("auto");

    expect(askClaude).toHaveBeenCalledTimes(1);
    expect(askOpenAi).toHaveBeenCalledTimes(1);
  });
});

describe("a named provider", () => {
  it("still falls over to the other one", async () => {
    // Choosing a provider is a preference, not a demand to fail with it.
    askOpenAi.mockResolvedValue(failed());
    askClaude.mockResolvedValue(ok("ответ Claude"));

    await expect(ask("gpt")).resolves.toEqual(ok("ответ Claude"));
  });
});

describe("best — both answer, an arbiter picks", () => {
  it("asks both and returns the arbiter's winner", async () => {
    askClaude
      .mockResolvedValueOnce(ok("ответ Claude"))
      // The arbiter call: Claude is preferred as judge when configured.
      .mockResolvedValueOnce(ok("B"));
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    await expect(ask("best")).resolves.toEqual(ok("ответ GPT"));
  });

  it("keeps Claude's answer when the arbiter says A", async () => {
    askClaude.mockResolvedValueOnce(ok("ответ Claude")).mockResolvedValueOnce(ok("A"));
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    await expect(ask("best")).resolves.toEqual(ok("ответ Claude"));
  });

  it("keeps Claude's answer when the arbiter itself fails", async () => {
    // An arbiter failure must not cost the person their answer.
    askClaude.mockResolvedValueOnce(ok("ответ Claude")).mockResolvedValueOnce(failed());
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    await expect(ask("best")).resolves.toEqual(ok("ответ Claude"));
  });

  it("degrades to a single provider when only one is configured", async () => {
    hasOpenAiEnv.mockReturnValue(false);
    askClaude.mockResolvedValue(ok("ответ Claude"));

    await expect(ask("best")).resolves.toEqual(ok("ответ Claude"));
    expect(askOpenAi).not.toHaveBeenCalled();
  });

  it("returns whichever answered when the other failed", async () => {
    askClaude.mockResolvedValue(failed());
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    await expect(ask("best")).resolves.toEqual(ok("ответ GPT"));
  });

  it("names the winner only when attribution is asked for", async () => {
    // Staff see who answered; clients never do.
    askClaude.mockResolvedValueOnce(ok("ответ Claude")).mockResolvedValueOnce(ok("A"));
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    const withName = await ask("best", true);
    expect(withName.status === "ok" && withName.reply).toContain("Ответил Claude");

    askClaude.mockReset();
    askOpenAi.mockReset();
    askClaude.mockResolvedValueOnce(ok("ответ Claude")).mockResolvedValueOnce(ok("A"));
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    const without = await ask("best", false);
    expect(without.status === "ok" && without.reply).toBe("ответ Claude");
  });
});

describe("both — the comparison mode", () => {
  it("shows the two answers side by side, labelled", async () => {
    askClaude.mockResolvedValue(ok("ответ Claude"));
    askOpenAi.mockResolvedValue(ok("ответ GPT"));

    const result = await ask("both");

    expect(result.status === "ok" && result.reply).toContain("— Claude —");
    expect(result.status === "ok" && result.reply).toContain("— GPT —");
  });

  it("says which one is missing rather than pretending there was one answer", async () => {
    askClaude.mockResolvedValue(ok("ответ Claude"));
    askOpenAi.mockResolvedValue(failed());

    const result = await ask("both");

    expect(result.status === "ok" && result.reply).toContain("GPT — сейчас недоступен");
  });

  it("passes the failure through when neither answered", async () => {
    askClaude.mockResolvedValue(failed("Claude упал"));
    askOpenAi.mockResolvedValue(failed("GPT упал"));

    await expect(ask("both")).resolves.toEqual(failed("Claude упал"));
  });
});

describe("how many business modules still name a provider", () => {
  it("does not grow", async () => {
    // Phase 4 of the provider-independence migration has to bring this list
    // to zero. Until then it may only shrink: new code that asks a provider
    // by name makes the refactor bigger than it already is.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join, relative } = await import("node:path");

    const ALLOWED = [
      "app/api/assistant/client/route.ts",
      "app/api/assistant/staff/route.ts",
      "app/api/metrics/extract/route.ts",
      "lib/assistant/router.ts",
      "lib/cases/review-actions.ts",
      "lib/supplements/actions.ts"
    ];

    const root = process.cwd();
    const callers: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) {
          continue;
        }

        const full = join(dir, entry);

        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }

        if (!/\.tsx?$/.test(entry)) {
          continue;
        }

        const source = readFileSync(full, "utf8");

        if (/\baskClaude\s*\(|\baskOpenAi\s*\(/.test(source)) {
          callers.push(relative(root, full));
        }
      }
    };

    for (const dir of ["app", "components", "lib"]) {
      walk(join(root, dir));
    }

    expect(
      callers.filter(
        (file) =>
          !ALLOWED.includes(file) &&
          file !== "lib/assistant/claude.ts" &&
          file !== "lib/assistant/openai.ts"
      )
    ).toEqual([]);
  });
});

describe("what must never happen on failure", () => {
  it("returns a failure rather than an invented answer", async () => {
    // The migration must keep this: a provider that fell over produces a
    // typed failure, never text that reads like an answer.
    askClaude.mockResolvedValue(failed());
    askOpenAi.mockResolvedValue(failed());

    for (const mode of ["auto", "best", "both", "claude", "gpt"] as const) {
      const result = await ask(mode);

      expect(result.status, mode).not.toBe("ok");
    }
  });
});
