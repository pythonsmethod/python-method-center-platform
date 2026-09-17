import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ create: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => "ru" }));
vi.mock("@anthropic-ai/sdk", () => {
  class Fake {
    messages = { create: f.create };
    static RateLimitError = class extends Error {};
    static APIError = class extends Error {};
  }
  return { default: Fake };
});
import { askClaude } from "@/lib/assistant/claude";
import { askOpenAi } from "@/lib/assistant/openai";
import { providerPolicyRefusal } from "@/lib/assistant/policy-refusal";
import { parseClaudeReply, parseOpenAiReply } from "@/lib/assistant/response-contract";

import { assistantFailure } from "@/lib/i18n/api-errors";
import { withConversationArchive } from "@/lib/assistant/conversation-archive";
import { parseOpenAiArchiveReply } from "@/lib/assistant/response-contract";

const messages = [{ role: "user" as const, content: "Synthetic API check" }];
const protocols = [
  {
    name: "openai", ask: askOpenAi, send: f.fetch,
    response: (text: unknown, reason: string | null) => ({ choices: [{ finish_reason: reason, message: { content: text } }] }),
    enqueue: (body: unknown) => f.fetch.mockResolvedValueOnce(new Response(JSON.stringify(body))),
    done: "stop", limit: "length", tool: "tool_calls", refusal: "content_filter"
  },
  {
    name: "anthropic", ask: askClaude, send: f.create,
    response: (text: unknown, reason: string | null) => ({ stop_reason: reason, content: [{ type: "text", text }] }),
    enqueue: (body: unknown) => f.create.mockResolvedValueOnce(body),
    done: "end_turn", limit: "max_tokens", tool: "tool_use", refusal: "refusal"
  }
];

beforeEach(() => {
  vi.clearAllMocks();
  f.create.mockReset();
  f.fetch.mockReset();
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("OPENAI_BASE_URL", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubGlobal("fetch", f.fetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

for (const p of protocols) {
  describe(`${p.name} API answer contract`, () => {
    it("accepts a completed nonempty text answer", async () => {
      p.enqueue(p.response("  Complete answer.  ", p.done));
      expect(await p.ask("System", messages, 100)).toEqual({ status: "ok", reply: "Complete answer." });
      expect(p.send).toHaveBeenCalledTimes(1);
    });
    it("accepts exactly one completed continuation", async () => {
      p.enqueue(p.response("First part", p.limit));
      p.enqueue(p.response("Last part.", p.done));
      expect(await p.ask("System", messages, 100)).toEqual({ status: "ok", reply: "First part\nLast part." });
      expect(p.send).toHaveBeenCalledTimes(2);
    });
    it.each([null, {}, { choices: [] }, { content: [] }])("rejects malformed response %j", async body => {
      p.enqueue(body);
      expect(await p.ask("System", messages, 100)).toMatchObject({ status: "error", code: "INVALID_RESPONSE" });
      expect(p.send).toHaveBeenCalledTimes(1);
    });
    it.each([null, "", "   ", 123, { unexpected: true }])("rejects invalid text %j", async text => {
      p.enqueue(p.response(text, p.done));
      expect(await p.ask("System", messages, 100)).toMatchObject({ status: "error", code: "INVALID_RESPONSE" });
    });
    it.each([null, "unknown", "tool"])("rejects uncompleted or unsupported finish reason %j", async reason => {
      p.enqueue(p.response("Must not be published", reason === "tool" ? p.tool : reason));
      expect(await p.ask("System", messages, 100)).toMatchObject({ status: "error", code: "INVALID_RESPONSE" });
      expect(p.send).toHaveBeenCalledTimes(1);
    });
    it("discards a twice-truncated answer without a third request", async () => {
      p.enqueue(p.response("Partial one", p.limit));
      p.enqueue(p.response("Partial two", p.limit));
      expect(await p.ask("System", messages, 100)).toMatchObject({ status: "error", code: "INCOMPLETE_RESPONSE" });
      expect(p.send).toHaveBeenCalledTimes(2);
    });
    it("discards a partial answer when continuation fails", async () => {
      p.enqueue(p.response("Partial must not be published", p.limit));
      p.send.mockRejectedValueOnce(new Error("private upstream details"));
      const result = await p.ask("System", messages, 100);
      expect(result).toMatchObject({ status: "error", code: "INCOMPLETE_RESPONSE" });
      expect(JSON.stringify(result)).not.toMatch(/Partial|private upstream/);
    });
    it("discards a partial answer when continuation is empty", async () => {
      p.enqueue(p.response("Partial must not be published", p.limit));
      p.enqueue(p.response("", p.done));
      expect(await p.ask("System", messages, 100)).toMatchObject({ status: "error", code: "INCOMPLETE_RESPONSE" });
    });
    it("preserves an initial refusal without a continuation", async () => {
      p.enqueue(p.response("Do not expose filtered text", p.refusal));
      expect(await p.ask("System", messages, 100)).toEqual(providerPolicyRefusal());
      expect(p.send).toHaveBeenCalledTimes(1);
    });
    it("discards both parts when the continuation refuses", async () => {
      p.enqueue(p.response("Partial must not be published", p.limit));
      p.enqueue(p.response("Do not expose filtered text", p.refusal));
      expect(await p.ask("System", messages, 100)).toEqual(providerPolicyRefusal());
      expect(p.send).toHaveBeenCalledTimes(2);
    });
  });
}

describe("unexpected API payloads", () => {
  it("rejects non-JSON successful HTTP responses", async () => {
    f.fetch.mockResolvedValueOnce(new Response("not JSON"));
    expect(await askOpenAi("System", messages, 100)).toMatchObject({ status: "error", code: "INVALID_RESPONSE" });
  });
  it.each([429, 500])("does not publish a partial answer after continuation HTTP %s", async status => {
    protocols[0].enqueue(protocols[0].response("Partial", "length"));
    f.fetch.mockResolvedValueOnce(new Response("private upstream details", { status }));
    expect(await askOpenAi("System", messages, 100)).toMatchObject({ status: "error", code: "INCOMPLETE_RESPONSE" });
    expect(f.fetch).toHaveBeenCalledTimes(2);
  });
  it("does not accept tool calls hidden beside completed text", () => {
    expect(parseOpenAiReply({ choices: [{ finish_reason: "stop", message: { content: "Text", tool_calls: [{ function: { name: "write" } }] } }] }).status).toBe("invalid");
    expect(parseClaudeReply({ stop_reason: "end_turn", content: [{ type: "text", text: "Text" }, { type: "tool_use", name: "write" }] }).status).toBe("invalid");
  });
  it("rejects multiple choices and wrong message roles", () => {
    const choice = { finish_reason: "stop", message: { content: "Text", role: "assistant" } };
    expect(parseOpenAiReply({ choices: [choice, choice] }).status).toBe("invalid");
    expect(parseOpenAiReply({ choices: [{ ...choice, message: { ...choice.message, role: "user" } }] }).status).toBe("invalid");
    expect(parseClaudeReply({ role: "user", stop_reason: "end_turn", content: [{ type: "text", text: "Text" }] }).status).toBe("invalid");
  });
  it("retains all valid text blocks without coercing malformed ones", () => {
    expect(parseClaudeReply({ stop_reason: "end_turn", content: [{ type: "text", text: "First" }, { type: "text", text: "Second" }] })).toEqual({ status: "complete", reply: "First\nSecond" });
    expect(parseClaudeReply({ stop_reason: "end_turn", content: [{ type: "text", text: "First" }, null] }).status).toBe("invalid");
  });
  it("localizes errors without exposing raw upstream messages", () => {
    for (const locale of ["ru", "en", "ru"] as const) {
      expect(assistantFailure({ code: "INCOMPLETE_RESPONSE", message: "raw upstream" }, locale)).toContain(locale === "en" ? "finish the answer" : "закончить ответ");
      expect(assistantFailure({ code: "INVALID_RESPONSE", message: "raw upstream" }, locale)).toContain(locale === "en" ? "could not answer" : "не смог ответить");
    }
  });
});

describe("authenticated Responses API completion", () => {
  const ask = () => withConversationArchive({ profileId: "synthetic", private: true, caseId: null }, () => askOpenAi("Rules", messages, 100));
  const payload = (text: unknown, status = "completed", reason?: string) => ({ status, incomplete_details: reason ? { reason } : null, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] });
  const enqueue = (body: unknown) => f.fetch.mockResolvedValueOnce(Response.json(body));
  it("accepts completed text through the authenticated archive path", async () => {
    enqueue(payload("Complete"));
    expect(await ask()).toEqual({ status: "ok", reply: "Complete" });
    expect(String(f.fetch.mock.calls[0][0])).toContain("/v1/responses");
    expect(JSON.parse(f.fetch.mock.calls[0][1].body).store).toBe(false);
  });
  it("continues once and preserves both completed parts", async () => {
    enqueue(payload("First", "incomplete", "max_output_tokens"));
    enqueue(payload("Last"));
    expect(await ask()).toEqual({ status: "ok", reply: "First\nLast" });
    expect(f.fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(f.fetch.mock.calls[1][1].body).tool_choice).toBe("none");
  });
  it("allows a single reasoning-only continuation, never an empty success", async () => {
    enqueue({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [{ type: "reasoning", encrypted_content: "synthetic" }] });
    enqueue(payload("Completed answer"));
    expect(await ask()).toEqual({ status: "ok", reply: "Completed answer" });
  });
  it.each(["queued", "in_progress", "failed", "cancelled", "unknown", null])("rejects nonterminal/error status %s even with text", async status => {
    enqueue({ ...payload("Not an answer"), status });
    expect(await ask()).toMatchObject({ status: "error", code: "INVALID_RESPONSE" });
    expect(f.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([null, {}, { status: "completed", output: [null] }, payload(42), payload(""), payload("Partial", "incomplete", "unknown")])("rejects malformed archive response %j", async body => {
    enqueue(body);
    expect(await ask()).toMatchObject({ status: "error", code: "INVALID_RESPONSE" });
  });
  it.each([payload("Partial", "incomplete", "max_output_tokens"), payload(""), payload("Pending", "in_progress"), {}])("never publishes a failed continuation %j", async body => {
    enqueue(payload("Partial one", "incomplete", "max_output_tokens"));
    enqueue(body);
    expect(await ask()).toMatchObject({ status: "error", code: "INCOMPLETE_RESPONSE" });
    expect(f.fetch).toHaveBeenCalledTimes(2);
  });
  it.each([429, 500, "network"])("never publishes a partial answer after %s", async failure => {
    enqueue(payload("Partial one", "incomplete", "max_output_tokens"));
    if (typeof failure === "number") f.fetch.mockResolvedValueOnce(new Response("private detail", { status: failure }));
    else f.fetch.mockRejectedValueOnce(new Error("private detail"));
    expect(await ask()).toMatchObject({ status: "error", code: "INCOMPLETE_RESPONSE" });
  });
  it("preserves a continuation refusal without exposing either draft", async () => {
    enqueue(payload("Partial one", "incomplete", "max_output_tokens"));
    enqueue({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "Do not expose" }] }] });
    expect(await ask()).toEqual(providerPolicyRefusal());
  });
  it("never executes incomplete or malformed tool calls", async () => {
    enqueue({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [{ type: "function_call", call_id: "x", name: "search_conversation_history", arguments: "{}" }] });
    expect(await ask()).toMatchObject({ status: "error", code: "INVALID_RESPONSE" });
    expect(f.fetch).toHaveBeenCalledTimes(1);
    expect(parseOpenAiArchiveReply({ status: "completed", output: [{ type: "function_call", name: "search_conversation_history", arguments: "{}" }] }).status).toBe("invalid");
  });
  it("rejects unexpected blocks, wrong roles, and unfinished messages", () => {
    for (const item of [
      { type: "web_search_call" },
      { type: "message", role: "user", content: [{ type: "output_text", text: "Text" }] },
      { type: "message", status: "incomplete", content: [{ type: "output_text", text: "Text" }] },
      { type: "message", content: [{ type: "output_text", text: "Text" }, null] }
    ]) expect(parseOpenAiArchiveReply({ status: "completed", output: [item] }).status).toBe("invalid");
  });
});
