import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: mocks.audit }));
import { parseWebResult, runVoiceWebSearch, signWebResult, verifyWebResults } from "@/lib/assistant/voice-web-search";
import { issueVoiceReceipt, verifyVoiceReceipt, type VoiceActor } from "@/lib/assistant/realtime-server";
import { publicSourceUrl } from "@/lib/assistant/web-results";
import { voiceSiteTools } from "@/lib/assistant/voice-site-tools";
import { RealtimeTurns } from "@/lib/assistant/realtime-turns";
import { mergeVoiceTranscript } from "@/lib/assistant/voice-chat";

const key = "synthetic-only-web-signing-secret-1234567890";
const actor: VoiceActor = { scope: "founder", profileId: "00000000-0000-4000-8000-000000000001", email: "owner@example.test", caseId: null, tier: "registered" };
const source = { type: "url_citation", title: "NASA", url: "https://www.nasa.gov/", start_index: 7, end_index: 10 };
function provider() { return { status: "completed", output: [{ type: "web_search_call", status: "completed" }, { type: "message", status: "completed", content: [{ type: "output_text", text: "Fact A [1]", annotations: [{ ...source }] }] }] }; }
function receipt() { return verifyVoiceReceipt(issueVoiceReceipt(actor, "en", key, 300), actor, "en"); }
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ANHAM_REALTIME_ENABLED", "true"); vi.stubEnv("ANHAM_WEB_SEARCH_ENABLED", "true");
  vi.stubEnv("ANHAM_REALTIME_SESSION_SECRET", key); vi.stubEnv("ANHAM_REALTIME_TEST_EMAILS", actor.email!);
  vi.stubEnv("OPENAI_REALTIME_API_KEY", "synthetic-key");
  mocks.rpc.mockResolvedValue({ data: [{ allowed: true }], error: null }); mocks.audit.mockResolvedValue({ status: "inserted" });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(provider())));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("public voice web search", () => {
  it.each(["founder", "karen"] as const)("offers public search to %s only when enabled", scope => {
    expect(voiceSiteTools(scope).map(t => t.name)).toContain("search_web");
    expect(voiceSiteTools("client").some(tool => tool.name === "search_web")).toBe(false);
    vi.stubEnv("ANHAM_WEB_SEARCH_ENABLED", "false"); expect(voiceSiteTools(scope).map(t => t.name)).not.toContain("search_web");
  });
  it("sends only the bounded public query, requires live search, disables storage and signs cited results", async () => {
    const session = receipt(); const answer = await runVoiceWebSearch(actor, { query: "Latest NASA news" }, session);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(options!.body as string);
    expect(body).toMatchObject({ input: "Latest NASA news", store: false, tool_choice: "required", tools: [{ type: "web_search", external_web_access: true }] });
    expect(JSON.stringify(body)).not.toContain(actor.profileId); expect(JSON.stringify(body)).not.toContain(actor.email);
    expect(verifyWebResults([answer.webReceipt], session)).toEqual([answer.webResult]);
    expect(mocks.rpc.mock.calls.map(c => c[1].p_limit)).toEqual([3, 10]);
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("NASA");
  });
  it.each(["disabled", "client", "counter", "audit", "pilot"])("fails closed before provider call for %s", async kind => {
    const session = receipt(); let subject = actor;
    if (kind === "disabled") vi.stubEnv("ANHAM_WEB_SEARCH_ENABLED", "false");
    if (kind === "pilot") vi.stubEnv("ANHAM_REALTIME_ENABLED", "false");
    if (kind === "client") subject = { ...actor, scope: "client" };
    if (kind === "counter") mocks.rpc.mockResolvedValue({ data: [{ allowed: false }], error: null });
    if (kind === "audit") mocks.audit.mockResolvedValue({ status: "failed" });
    await expect(runVoiceWebSearch(subject, { query: "Public news" }, session)).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{}, { query: "a" }, { query: "x".repeat(401) }, { query: "NASA", messages: "PRIVATE" }, { query: "Find jane@example.com" }, { query: "Find +1 (212) 555-1234" }, { query: `Find ${actor.profileId}` }, { query: "Find sk-secret0123" }])("rejects malformed queries and common identifiers: %j", async args => {
    await expect(runVoiceWebSearch(actor, args, receipt())).rejects.toThrow(); expect(fetch).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["network", "http", "incomplete", "no-search", "no-citations"])("does not invent an answer on %s", async failure => {
    if (failure === "network") vi.mocked(fetch).mockRejectedValue(new Error("secret provider diagnostic"));
    else if (failure === "http") vi.mocked(fetch).mockResolvedValue(new Response("secret", { status: 429 }));
    else {
      const data = provider();
      if (failure === "incomplete") data.status = "incomplete";
      if (failure === "no-search") data.output.shift();
      if (failure === "no-citations") data.output[1].content![0].annotations = [];
      vi.mocked(fetch).mockResolvedValue(Response.json(data));
    }
    await expect(runVoiceWebSearch(actor, { query: "Public news" }, receipt())).rejects.toMatchObject({ code: "unavailable" });
  });
  it("aborts provider work with the request", async () => {
    const controller = new AbortController(); controller.abort();
    vi.mocked(fetch).mockImplementation(async (_url, options) => { expect(options!.signal!.aborted).toBe(true); throw new Error("aborted"); });
    await expect(runVoiceWebSearch(actor, { query: "NASA news" }, receipt(), controller.signal)).rejects.toThrow();
  });
});
describe("web provenance and rendering", () => {
  it.each(["javascript:alert(1)", "data:text/html,test", "https://localhost/", "http://127.0.0.1/", "http://2130706433/", "http://[::1]/", "https://foo.internal/", "https://user:pass@example.com", "https://example.com:8080/"])("rejects unsafe source link %s", value => { expect(publicSourceUrl(value)).toBeNull(); });
  it("rejects fabricated offsets and oversized excerpts", () => {
    const data = provider(); data.output[1].content![0].annotations[0].end_index = 999;
    expect(() => parseWebResult(data)).toThrow();
    data.output[1].content![0].text = "x".repeat(3501); expect(() => parseWebResult(data)).toThrow();
  });
  it("binds source receipts to their conversation and detects tampering", () => {
    const session = receipt(), result = parseWebResult(provider()), token = signWebResult(result, session, key);
    expect(() => verifyWebResults([token], receipt())).toThrow();
    expect(() => verifyWebResults([token.slice(0, -4) + "AAAA"], session)).toThrow();
    expect(() => verifyWebResults([token], { ...session, scope: "client" })).toThrow();
    expect(verifyWebResults([token, token], session)).toEqual([result]);
    expect(() => verifyWebResults([token, token, token, token], session)).toThrow();
  });
  it.each([false, true])("keeps search sources with their turn and strips signatures from model context, interrupted=%s", async interrupted => {
    const result = parseWebResult(provider()), send = vi.fn(), saved = vi.fn();
    const turns = new RealtimeTurns(send, saved, vi.fn(), { tool: async () => ({ webResult: result, webReceipt: "signature" }) });
    turns.receive({ type: "input_audio_buffer.committed", item_id: "u" });
    turns.receive({ type: "conversation.item.input_audio_transcription.completed", item_id: "u", transcript: "Search NASA" });
    turns.receive({ type: "response.created", response: { id: "r", metadata: { input_item_id: "u" } } });
    turns.receive({ type: "response.done", response: { id: "r", status: "completed", output: [{ type: "function_call", id: "f", call_id: "call", name: "search_web", arguments: "{}" }] } });
    await Promise.resolve(); await Promise.resolve();
    expect(JSON.stringify(send.mock.calls)).not.toContain("signature");
    if (interrupted) turns.close();
    else {
      turns.receive({ type: "response.created", response: { id: "r2", metadata: { input_item_id: "u" } } });
      turns.receive({ type: "response.done", response: { id: "r2", status: "completed", output: [{ content: [{ type: "audio", transcript: "Fact A" }] }] } });
      turns.receive({ type: "output_audio_buffer.stopped", response_id: "r2" });
    }
    const pair = saved.mock.calls[0][0]; expect(pair.webResults).toEqual([result]); expect(pair.webReceipts).toEqual(["signature"]);
    const rows = mergeVoiceTranscript([], pair, "session"); expect(rows[1].web_results).toEqual([result]); expect(rows[0].web_results).toBeUndefined();
  });
});
