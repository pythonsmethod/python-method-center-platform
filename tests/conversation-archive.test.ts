import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
const f = vi.hoisted(() => ({ db: vi.fn(), claude: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: f.db }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: f.claude }; } }));
import { runConversationArchiveTool, withConversationArchive, conversationArchiveScope, executeConversationArchiveTool } from "@/lib/assistant/conversation-archive";
import { askOpenAi } from "@/lib/assistant/openai";
import { askClaude } from "@/lib/assistant/claude";
const scope = { profileId: "anna", private: true, caseId: null };
const id = "00000000-0000-4000-8000-000000000001";
const old = { id, case_id: null, role: "user", content: "Original 2001 conversation", created_at: "2001-01-01", message_sequence: 1, source: "voice_transcript", voice_state: "completed", locale: "ru" };
let transport = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.clearAllMocks();
  transport = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify([old])));
  f.db.mockReturnValue(createClient("https://synthetic.supabase.co", "test-key", { global: { fetch: transport }, auth: { persistSession: false, autoRefreshToken: false } }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("lifetime conversation archive", () => {
  it("retrieves decades-old voice text without age, locale or source exclusion", async () => {
    const result = await runConversationArchiveTool(scope, "search_conversation_history", {});
    expect(result).toMatchObject({ status: "ready", ageCutoff: null, messages: [expect.objectContaining({ created_at: "2001-01-01", source: "voice_transcript" })] });
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.searchParams.has("created_at")).toBe(false);
    expect(url.searchParams.has("locale")).toBe(false);
    expect(url.searchParams.has("source")).toBe(false);
    expect(url.searchParams.get("profile_id")).toBe("eq.anna");
  });
  it("paginates without an archive-depth ceiling", async () => {
    transport.mockImplementationOnce(async () => new Response(JSON.stringify(Array.from({ length: 21 }, (_, n) => ({ ...old, message_sequence: 100 - n })))));
    expect(await runConversationArchiveTool(scope, "search_conversation_history", {})).toMatchObject({ nextBefore: 81 });
    await runConversationArchiveTool(scope, "search_conversation_history", { before: 81 });
    expect(new URL(String(transport.mock.calls[1][0])).searchParams.get("message_sequence")).toBe("lt.81");
  });
  it("reads full long messages through successive chunks", async () => {
    const content = "x".repeat(8000) + "old detail at end";
    transport.mockImplementation(async () => new Response(JSON.stringify({ ...old, content })));
    expect(await runConversationArchiveTool(scope, "read_conversation_message", { id })).toMatchObject({ nextOffset: 8000 });
    expect(await runConversationArchiveTool(scope, "read_conversation_message", { id, offset: 8000 })).toMatchObject({ text: "old detail at end", nextOffset: null });
  });
  it("allows all own Cases while retaining owner and tier isolation", async () => {
    await runConversationArchiveTool({ ...scope, private: false, caseId: "case" }, "search_conversation_history", { allOwnConversations: true });
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.searchParams.has("case_id")).toBe(false);
    expect(url.searchParams.get("profile_id")).toBe("eq.anna");
    expect(url.searchParams.get("tier")).toBe("in.(registered,client)");
  });
  it("rejects model-selected identities and malformed arguments without a query", async () => {
    for (const args of [{ profileId: "karen" }, { before: -1 }, { allOwnConversations: "true" }]) {
      expect(await runConversationArchiveTool(scope, "search_conversation_history", args)).toMatchObject({ status: "invalid" });
    }
    expect(transport).not.toHaveBeenCalled();
    expect(await executeConversationArchiveTool("search_conversation_history", {})).toEqual({ status: "forbidden" });
  });
  it("keeps concurrent Anna, Karen and client scopes isolated", async () => {
    await Promise.all(["anna", "karen", "client"].map(profileId => withConversationArchive({ ...scope, profileId }, async () => {
      await Promise.resolve(); expect(conversationArchiveScope()?.profileId).toBe(profileId);
    })));
    expect(conversationArchiveScope()).toBeUndefined();
  });
  it("distinguishes missing records from storage failure", async () => {
    transport.mockImplementation(async () => new Response("null"));
    expect(await runConversationArchiveTool(scope, "read_conversation_message", { id })).toMatchObject({ status: "not_found" });
    f.db.mockReturnValue(null);
    expect(await runConversationArchiveTool(scope, "search_conversation_history", {})).toMatchObject({ status: "unavailable" });
  });
});
describe("native provider archive calls", () => {
  it("does not expose archive tools outside an authenticated request", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic");
    const send = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: "Hello" }, finish_reason: "stop" }] }));
    vi.stubGlobal("fetch", send);
    await askOpenAi("Rules", [{ role: "user", content: "Hello" }], 200);
    expect(JSON.parse(send.mock.calls[0][1].body).tools).toBeUndefined();
    expect(transport).not.toHaveBeenCalled();
  });
  it("bounds tool iterations while keeping the archive available for later requests", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic");
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body); requests.push(body);
      return Response.json({ status: "completed", output: body.tool_choice === "none"
        ? [{ type: "message", content: [{ type: "output_text", text: "I have checked part of the archive." }] }]
        : [{ call_id: `call${requests.length}`, type: "function_call", name: "search_conversation_history", arguments: "{}" }] });
    }));
    expect(await withConversationArchive(scope, () => askOpenAi("Rules", [{ role: "user", content: "Recall" }], 200))).toMatchObject({ status: "ok" });
    expect(requests).toHaveLength(5);
    expect(transport).toHaveBeenCalledTimes(4);
    expect(requests[4].tool_choice).toBe("none");
  });
  it("OpenAI reads old history and includes the actual tool result in its answer request", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic");
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      expect(String(_url)).toContain("/v1/responses");
      return Response.json({ status: "completed", output: bodies.length === 1
        ? [{ type: "reasoning", encrypted_content: "synthetic-reasoning" }, { call_id: "call1", type: "function_call", name: "search_conversation_history", arguments: "{}" }]
        : [{ type: "message", content: [{ type: "output_text", text: "You said this in 2001" }] }] });
    }));
    const result = await withConversationArchive(scope, () => askOpenAi("Rules", [{ role: "user", content: "What did we discuss?" }], 200, { reasoningEffort: "high" }));
    expect(result).toMatchObject({ status: "ok", reply: "You said this in 2001" });
    expect(JSON.stringify(bodies[1].input)).toContain("Original 2001 conversation");
    expect(JSON.stringify(bodies[1].input)).toContain("synthetic-reasoning");
    expect(bodies[0].store).toBe(false);
    expect(bodies[0].reasoning).toEqual({ effort: "high" });
    expect(JSON.stringify(bodies[0].tools)).toContain("read_conversation_message");
  });
  it("Claude reads the same canonical archive before replying", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic");
    f.claude.mockResolvedValueOnce({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "c1", name: "search_conversation_history", input: {} }] })
      .mockResolvedValueOnce({ stop_reason: "end_turn", content: [{ type: "text", text: "Earlier discussion" }] });
    const result = await withConversationArchive(scope, () => askClaude("Rules", [{ role: "user", content: "Remember?" }], 200));
    expect(result).toMatchObject({ status: "ok", reply: "Earlier discussion" });
    expect(JSON.stringify(f.claude.mock.calls[1][0].messages)).toContain("Original 2001 conversation");
  });
});
