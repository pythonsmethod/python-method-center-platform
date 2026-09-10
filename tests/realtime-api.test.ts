import { POST as diagnostic } from "@/app/api/assistant/realtime/diagnostics/route";
import { POST as liveSession } from "@/app/api/assistant/live/route";
vi.mock("@/lib/assistant/live-session", () => ({ openLiveSession: vi.fn(async () => new Response("data: {}\n\n", { headers: { "Content-Type": "text/event-stream" } })) }));
import { ANHAM_VOICE_SPEED, voiceDeliveryInstructions } from "@/lib/assistant/voice-delivery";
vi.mock("@/lib/assistant/client-voice-context", () => ({ clientVoiceInstructions: async () => "Synthetic own-client context" }));
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn(), getUser: vi.fn(), from: vi.fn(), upsert: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.auth }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: vi.fn(async () => ({ status: "inserted" })) }));
import { POST as session } from "@/app/api/assistant/realtime/session/route";
import { POST as transcript, GET as history } from "@/app/api/assistant/realtime/transcript/route";
import { POST as siteTool } from "@/app/api/assistant/realtime/tools/route";
import { issueVoiceReceipt, resolveVoiceActor, verifyVoiceReceipt, voiceConfig, voiceInstructions, type VoiceActor } from "@/lib/assistant/realtime-server";
import { voiceCopy } from "@/lib/assistant/realtime-contract";
import { parseWebResult, signWebResult } from "@/lib/assistant/voice-web-search";
import { GET as voiceList } from "@/app/api/assistant/realtime/voices/route";
import { POST as previewVoice } from "@/app/api/assistant/realtime/voices/preview/route";

const userId = "00000000-0000-4000-8000-000000000001";
const caseId = "00000000-0000-4000-8000-000000000002";
const actor: VoiceActor = { profileId: userId, email: "client@example.test", scope: "client", tier: "registered", caseId: null };
const key = "test-only-signing-secret-not-a-real-key";
const queries: { table: string; filters: unknown[][] }[] = [];
let profile: { role: string; status: string } | null;
let caseRow: { id: string } | null;
let dbError: { message: string } | null;
function request(body: object, origin = "https://test.local") {
  return new Request("https://test.local/api/assistant/realtime/session", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, "Accept-Language": "en" }, body: JSON.stringify(body) });
}
const sessionBody = { sdp: "v=0\r\nmock-sdp", locale: "en", scope: "client", consent: true };
function transcriptBody() { return { locale: "en", scope: "client", receipt: issueVoiceReceipt(actor, "en", key, 300), turnId: "item_1", user: "Hello", assistant: "Hi" }; }

beforeEach(() => {
  vi.resetAllMocks(); queries.length = 0; profile = { role: "client", status: "active" }; caseRow = null; dbError = null;
  vi.stubEnv("ANHAM_REALTIME_ENABLED", "true"); vi.stubEnv("ANHAM_REALTIME_TEST_EMAILS", "client@example.test,karen@example.test,founder@example.test");
  vi.stubEnv("ANHAM_REALTIME_SESSION_SECRET", key); vi.stubEnv("OPENAI_REALTIME_API_KEY", "synthetic-provider-key");
  vi.stubEnv("KAREN_EMAILS", "karen@example.test"); vi.stubEnv("FOUNDER_EMAILS", "founder@example.test"); vi.stubEnv("PUBLIC_ASSISTANT_MODE", "open");
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: actor.email } }, error: null });
  mocks.upsert.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
  mocks.from.mockImplementation((table: string) => {
    const q = { table, filters: [] as unknown[][] }; queries.push(q);
    const result = () => ({ data: table === "profiles" ? profile : table === "client_cases" ? caseRow : [], error: dbError });
    const chain = { abortSignal: vi.fn(() => chain), select: vi.fn(() => chain), eq: vi.fn((...args: unknown[]) => { q.filters.push(args); return chain; }), lt: vi.fn((...args: unknown[]) => { q.filters.push(args); return chain; }), gt: vi.fn(() => chain), in: vi.fn(() => chain), is: vi.fn((...args: unknown[]) => { q.filters.push(args); return chain; }), order: vi.fn(() => chain), limit: vi.fn(() => chain), maybeSingle: vi.fn(async () => result()), upsert: mocks.upsert, then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve) };
    return chain;
  });
  const client = { auth: { getUser: mocks.getUser }, from: mocks.from, rpc: mocks.rpc };
  mocks.auth.mockResolvedValue(client); mocks.service.mockReturnValue(client);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("v=0\r\nanswer")));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("voice authorization and provider handshake", () => {
  describe("GPT-Live pilot route", () => {
    beforeEach(() => {
      vi.stubEnv("GPT_LIVE_ENABLED", "true"); vi.stubEnv("GPT_LIVE_OPENAI_API_KEY", "synthetic-live-key");
      vi.stubEnv("GPT_LIVE_PILOT_EMAILS", "client@example.test");
    });
    it("uses server identity and admits the explicitly enabled client", async () => {
      const result = await liveSession(request(sessionBody)); expect(result.status).toBe(200);
      expect(result.headers.get("content-type")).toBe("text/event-stream");
      expect(await result.text()).not.toContain("synthetic-live-key");
    });
    it("denies unauthenticated, blocked, wrong role and wrong owner", async () => {
      expect((await liveSession(request({ ...sessionBody, scope: "staff" }))).status).toBe(403);
      expect((await liveSession(request({ ...sessionBody, caseId }))).status).toBe(403);
      profile!.status = "blocked"; expect((await liveSession(request(sessionBody))).status).toBe(403);
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
      expect((await liveSession(request(sessionBody))).status).toBe(401);
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    it("denies cross-origin and malformed/oversized bodies before spending", async () => {
      expect((await liveSession(request(sessionBody, "https://evil.test"))).status).toBe(403);
      for (const patch of [{ consent: false }, { sdp: {} }, { sdp: "v=0" + "x".repeat(30001) }, { voice: "unapproved" }]) expect((await liveSession(request({ ...sessionBody, ...patch }))).status).toBe(400);
      expect((await liveSession(request({ ...sessionBody, extra: "x".repeat(81000) }))).status).toBe(413);
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    it.each(["GPT_LIVE_ENABLED", "GPT_LIVE_PILOT_EMAILS", "GPT_LIVE_OPENAI_API_KEY"])("fails closed with no fallback for missing %s", async name => {
      vi.stubEnv(name, ""); expect((await liveSession(request(sessionBody))).status).toBe(503); expect(fetch).not.toHaveBeenCalled();
    });
    it("rejects model substitution and uncertain budget", async () => {
      vi.stubEnv("GPT_LIVE_MODEL", "gpt-realtime"); expect((await liveSession(request(sessionBody))).status).toBe(503);
      vi.stubEnv("GPT_LIVE_MODEL", "gpt-live-1"); mocks.rpc.mockResolvedValue({ error: {}, data: null });
      expect((await liveSession(request(sessionBody))).status).toBe(503);
    });
  });
  it("gives the confirmed preview client the full client tier while keeping own-case and staff boundaries", async () => {
    vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "client@example.test");
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: actor.email, email_confirmed_at: "2026-09-09" } }, error: null });
    caseRow = { id: caseId };
    expect(await resolveVoiceActor(request({}), "client")).toMatchObject({ profileId: userId, caseId, tier: "client", scope: "client" });
    vi.stubEnv("ANHAM_WEB_SEARCH_ENABLED", "true");
    expect((await session(request(sessionBody))).status).toBe(200);
    const config = JSON.parse((vi.mocked(fetch).mock.calls[0][1]!.body as FormData).get("session") as string);
    expect(config.tools.map((tool: { name: string }) => tool.name)).toEqual(["search_conversation_history", "read_conversation_message", "read_my_case", "search_web"]);
    await expect(resolveVoiceActor(request({}), "staff")).rejects.toMatchObject({ status: 403 });
    await expect(resolveVoiceActor(request({}), "client", userId)).rejects.toMatchObject({ status: 403 });
    vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "");
    expect((await resolveVoiceActor(request({}), "client")).tier).toBe("registered");
  });
  it("lets signed-in clients search only their own archive in voice", async () => {
    const response = await siteTool(request({ ...transcriptBody(), name: "search_conversation_history", arguments: {} }));
    expect(response.status).toBe(200);
    expect((await response.json()).output.status).toBe("ready");
    expect(queries.find(q => q.table === "assistant_messages")?.filters).toContainEqual(["profile_id", userId]);
    const denied = await siteTool(request({ ...transcriptBody(), name: "query_site_records", arguments: { dataset: "profiles" } }));
    expect(denied.status).toBe(403);
  });
  it.each(["ru", "en"] as const)("does not deny supplied conversation memory in %s", locale => {
    for (const scope of ["client", "founder", "karen"] as const) {
      const prompt = voiceInstructions({ ...actor, scope }, locale);
      expect(prompt).toContain("Saved conversation excerpts may be supplied below");
      expect(prompt).not.toContain("past chat or knowledge-base access");
      expect(prompt).not.toContain("No records are preloaded");
    }
  });
  it("allows a named client pilot only with client scope and no staff tools", async () => {
    vi.stubEnv("ANHAM_REALTIME_STAFF_ONLY", "true");
    vi.stubEnv("PUBLIC_ASSISTANT_MODE", "off");
    vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "client@example.test");
    expect((await session(request(sessionBody))).status).toBe(200);
    const configuration = JSON.parse((vi.mocked(fetch).mock.calls[0][1]!.body as FormData).get("session") as string);
    expect(configuration.tools.map((tool: { name: string }) => tool.name)).toEqual(["search_conversation_history", "read_conversation_message"]);
    expect(configuration.instructions).toContain("Synthetic own-client context");
    expect((await session(request({ ...sessionBody, scope: "staff" }))).status).toBe(403);
    vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "");
    expect((await session(request(sessionBody))).status).toBe(503);
  });
  it("denies revoked client delegation even with stale staff configuration", async () => {
    vi.stubEnv("ANHAM_ASSISTANT_DELEGATE_EMAILS", "delegate@example.test");
    vi.stubEnv("ANHAM_REALTIME_STAFF_ONLY", "true");
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: "delegate@example.test" } }, error: null });
    expect((await session(request({ ...sessionBody, scope: "staff" }))).status).toBe(403);
    expect(profile!.role).toBe("client");
    vi.stubEnv("ANHAM_ASSISTANT_DELEGATE_EMAILS", "");
    expect((await session(request({ ...sessionBody, scope: "staff" }))).status).toBe(403);
  });
  it("staff-only launch denies clients and admits verified founders without a test email override", async () => {
    vi.stubEnv("ANHAM_REALTIME_STAFF_ONLY", "true");
    vi.stubEnv("ANHAM_REALTIME_TEST_EMAILS", "");
    expect((await session(request(sessionBody))).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
    profile!.role = "admin";
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: "founder@example.test" } }, error: null });
    expect((await session(request({ ...sessionBody, scope: "staff" }))).status).toBe(200);
  });
  it("uses a configured Karen voice without changing the founder persona", async () => {
    profile!.role = "admin"; mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: "founder@example.test" } }, error: null });
    vi.stubEnv("ANHAM_CUSTOM_VOICES_ENABLED", "true"); vi.stubEnv("ANHAM_KAREN_VOICE_ID", "voice_test"); vi.stubEnv("ANHAM_KAREN_VOICE_CONSENT_ID", "cons_test");
    expect((await session(request({ ...sessionBody, scope: "staff", voice: "karen" }))).status).toBe(200);
    const config = JSON.parse((vi.mocked(fetch).mock.calls[0][1]!.body as FormData).get("session") as string);
    expect(config.audio.output.voice).toEqual({ id: "voice_test" }); expect(config.instructions).toContain("founder's private");
  });
  it.each(["marin", "cedar", "coral", "sage", "verse", "alloy", "ash", "ballad", "echo", "shimmer"])("sends selected %s voice to the actual handshake", async voice => {
    const response = await session(request({ ...sessionBody, voice })); expect(response.status).toBe(200);
    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    const config = JSON.parse(body.get("session") as string); expect(config.audio.output.voice).toBe(voice); expect(config.audio.output.speed).toBe(ANHAM_VOICE_SPEED); expect(config.instructions).toContain(voiceDeliveryInstructions(sessionBody.locale === "en" ? "en" : "ru"));
    expect(config.audio.input.turn_detection).toEqual({ type: "semantic_vad", eagerness: "low", create_response: false, interrupt_response: true });
  });
  it("gives the same patient-listening contract in Russian and English", () => {
    expect(voiceDeliveryInstructions("ru")).toContain("Дай человеку закончить всю мысль");
    expect(voiceDeliveryInstructions("ru")).toContain("доброжелательным интеллектуальным оппонентом");
    expect(voiceDeliveryInstructions("en")).toContain("Let the user finish the whole thought");
    expect(voiceDeliveryInstructions("en")).toContain("kind intellectual challenger");
  });
  it("rejects custom voice escalation and arbitrary provider IDs before spending", async () => {
    expect((await session(request({ ...sessionBody, voice: "karen" }))).status).toBe(403);
    expect((await session(request({ ...sessionBody, voice: { id: "voice_external" } }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("lists all ten built-ins to a client without making provider calls", async () => {
    const response = await voiceList(new Request("https://test.local/api/assistant/realtime/voices?scope=client&locale=en"));
    expect(response.status).toBe(200); expect((await response.json()).voices).toHaveLength(10); expect(fetch).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await voiceList(new Request("https://test.local/api/assistant/realtime/voices?scope=client"))).status).toBe(401);
  });
  it("previews a fixed localized phrase, never caller text or private history", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("synthetic-audio"));
    const response = await previewVoice(request({ scope: "client", locale: "en", voice: "cedar", input: "PRIVATE TEXT" }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    const input = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(input.speed).toBe(ANHAM_VOICE_SPEED); expect(input.instructions).toBe(voiceDeliveryInstructions("en")); expect(input.voice).toBe("cedar"); expect(input.input).toContain("AI assistant"); expect(input.input).not.toContain("PRIVATE TEXT");
    expect(mocks.rpc.mock.calls.map(c => c[1].p_limit)).toEqual([5, 20]);
  });
  it.each(["alloy", "ash", "ballad", "echo", "shimmer"].flatMap(voice => ["ru", "en"].map(locale => ({ voice, locale }))))("previews new $voice voice in $locale", async ({ voice, locale }) => {
    vi.mocked(fetch).mockResolvedValue(new Response("synthetic-audio"));
    expect((await previewVoice(request({ scope: "client", locale, voice }))).status).toBe(200);
    const input = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(input.voice).toBe(voice);
    expect(input.input).toContain(locale === "ru" ? "Здравствуйте" : "Hello");
    expect(input.instructions).toBe(voiceDeliveryInstructions(locale === "ru" ? "ru" : "en"));
  });
  it("records only safe diagnostic metadata after authentication and receipt checks", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const body = { locale: "en", scope: "client", receipt: issueVoiceReceipt(actor, "en", key, 300), voice: "echo", code: "private speech", message: "secret" };
      expect((await diagnostic(request(body))).status).toBe(200);
      expect(log).toHaveBeenCalledWith("anham_voice_failure", { code: "unknown", voice: "echo", locale: "en" });
      log.mockClear();
      expect((await diagnostic(request({ ...body, receipt: "invalid" }))).status).toBe(403);
      expect((await diagnostic(request(body, "https://evil.test"))).status).toBe(403);
      expect(log).not.toHaveBeenCalled();
      mocks.rpc.mockResolvedValue({ data: [{ allowed: false }], error: null });
      expect((await diagnostic(request(body))).status).toBe(429); expect(log).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
  it("preview respects origin, pilot switch and shared budget", async () => {
    const body = { scope: "client", locale: "en", voice: "marin" };
    expect((await previewVoice(request(body, "https://evil.test"))).status).toBe(403);
    vi.stubEnv("ANHAM_REALTIME_ENABLED", "false"); expect((await previewVoice(request(body))).status).toBe(503);
    vi.stubEnv("ANHAM_REALTIME_ENABLED", "true"); mocks.rpc.mockResolvedValue({ data: [{ allowed: false }], error: null });
    expect((await previewVoice(request(body))).status).toBe(429); expect(fetch).not.toHaveBeenCalled();
  });
  it("creates a cookie-authenticated session without exposing credentials or private data", async () => {
    const response = await session(request(sessionBody)); const result = await response.json();
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(result.sdp).toContain("v=0"); expect(JSON.stringify(result)).not.toContain("synthetic-provider-key");
    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    const config = JSON.parse(body.get("session") as string);
    expect(config.audio.input.turn_detection.create_response).toBe(false);
    expect(config.audio.input.turn_detection.eagerness).toBe("low");
    expect(config.audio.input.transcription.language).toBe("en");
    expect(config.instructions).not.toContain(actor.email);
    expect(config.tools.map((tool: { name: string }) => tool.name)).toEqual(["search_conversation_history", "read_conversation_message"]);
    expect(queries.map(q => q.table)).not.toContain("uploaded_documents");
  });
  it("rejects guests", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await session(request(sessionBody))).status).toBe(401); expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects anonymous Supabase sign-ins", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: actor.email, is_anonymous: true } }, error: null });
    expect((await session(request(sessionBody))).status).toBe(401); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["suspended", "closed"])("rejects %s profiles", async status => {
    profile!.status = status; expect((await session(request(sessionBody))).status).toBe(403); expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects staff role escalation by a client", async () => {
    expect((await session(request({ ...sessionBody, scope: "staff", role: "karen" }))).status).toBe(403);
  });
  it("requires both staff membership and the existing private allowlist", async () => {
    profile!.role = "admin"; expect((await session(request({ ...sessionBody, scope: "staff" }))).status).toBe(403);
  });
  it.each(["karen", "founder"] as const)("selects %s from verified identity, not request role", async role => {
    profile!.role = "admin"; mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: `${role}@example.test` } }, error: null });
    const resolved = await resolveVoiceActor(request({}), "staff"); expect(resolved.scope).toBe(role);
    const response = await session(request({ ...sessionBody, scope: "staff", role: "client" })); expect(response.status).toBe(200);
  });
  it("rejects another client's Case", async () => {
    expect((await session(request({ ...sessionBody, caseId }))).status).toBe(403); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([false, undefined])("requires explicit start consent: %s", async consent => {
    expect((await session(request({ ...sessionBody, consent }))).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it("blocks cross-origin requests", async () => {
    expect((await session(request(sessionBody, "https://evil.test"))).status).toBe(403); expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("fails closed when disabled, outside pilot or public mode off", () => {
    vi.stubEnv("ANHAM_REALTIME_ENABLED", "false"); expect(() => voiceConfig(actor)).toThrow();
    vi.stubEnv("ANHAM_REALTIME_ENABLED", "true"); expect(() => voiceConfig({ ...actor, email: "other@test" })).toThrow();
    vi.stubEnv("PUBLIC_ASSISTANT_MODE", "off"); expect(() => voiceConfig(actor)).toThrow();
  });
  it("enforces shared limits and fails closed on counter errors", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ allowed: false }], error: null }); expect((await session(request(sessionBody))).status).toBe(429);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "db error" } }); expect((await session(request(sessionBody))).status).toBe(503); expect(fetch).not.toHaveBeenCalled();
  });
  it("requires the history migration before contacting the provider", async () => {
    const original = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table: string) => table === "assistant_messages" ? { select: () => ({ limit: async () => ({ error: { message: "column missing" } }) }) } : original(table));
    expect((await session(request(sessionBody))).status).toBe(503); expect(fetch).not.toHaveBeenCalled();
  });
  it("does not expose provider errors, and handles rejected fetch", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("private provider diagnostic", { status: 500 }));
    const response = await session(request(sessionBody)); expect(response.status).toBe(502); expect(await response.text()).not.toContain("diagnostic");
    vi.mocked(fetch).mockRejectedValue(new Error("secret")); expect((await session(request(sessionBody))).status).toBe(503);
  });
  it("bounds actual input and rejects malformed JSON", async () => {
    expect((await session(request({ ...sessionBody, extra: "x".repeat(80001) }))).status).toBe(413);
    const bad = new Request("https://test.local", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect((await session(bad)).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it("supports bearer auth without trusting caller profile IDs", async () => {
    const req = request({}); req.headers.set("Authorization", "Bearer test-token");
    expect((await resolveVoiceActor(req, "client")).profileId).toBe(userId); expect(mocks.getUser).toHaveBeenCalledWith("test-token");
  });
});

describe("voice history isolation and persistence", () => {
  it.each(["founder", "karen"] as const)("stores %s voice in the same private history tier as text", async scope => {
    profile!.role = "admin";
    const staffActor = { ...actor, email: `${scope}@example.test`, scope };
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: staffActor.email } }, error: null });
    const receipt = issueVoiceReceipt(staffActor, "en", key, 300);
    expect((await transcript(request({ ...transcriptBody(), scope: "staff", receipt }))).status).toBe(200);
    expect(mocks.upsert.mock.calls[0][0]).toEqual(expect.arrayContaining([expect.objectContaining({ tier: scope, conversation_scope: scope, created_at: expect.any(String) })]));
  });
  it("paginates older history by sequence under the same identity filters", async () => {
    const original = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table: string) => {
      const chain = original(table);
      if (table === "assistant_messages") chain.limit.mockResolvedValue({ data: Array.from({ length: 61 }, (_, i) => ({ role: "user", content: `row${i}`, message_sequence: 100 - i })), error: null });
      return chain;
    });
    const response = await history(new Request("https://test.local/history?scope=client&locale=en&before=101"));
    expect(response.status).toBe(200); const data = await response.json();
    expect(data.messages).toHaveLength(60); expect(data.messages[0].message_sequence).toBe(41); expect(data.nextBefore).toBe(41);
    expect(queries.find(q => q.table === "assistant_messages")?.filters).toContainEqual(["message_sequence", 101]);
    expect((await history(new Request("https://test.local/history?scope=client&locale=en&before=-1"))).status).toBe(400);
  });
  it("persists a recognized user-only interrupted turn without inventing a reply", async () => {
    expect((await transcript(request({ ...transcriptBody(), assistant: "", state: "interrupted" }))).status).toBe(200);
    expect(mocks.upsert.mock.calls[0][0]).toEqual([expect.objectContaining({ role: "user", content: "Hello", voice_state: "interrupted" })]);
    expect((await transcript(request({ ...transcriptBody(), assistant: "" }))).status).toBe(400);
    expect((await transcript(request({ ...transcriptBody(), state: "verified" }))).status).toBe(400);
  });
  it("saves a pair atomically and idempotently as unverified voice text", async () => {
    const body = transcriptBody(); const response = await transcript(request(body)); expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ role: "user", content: "Hello", profile_id: userId, source: "voice_transcript", conversation_scope: "client" }),
      expect.objectContaining({ role: "assistant", content: "Hi", profile_id: userId, source: "voice_transcript", conversation_scope: "client" }),
    ], { onConflict: "profile_id,exchange_id,role", ignoreDuplicates: true });
    const first = mocks.upsert.mock.calls[0][0]; await transcript(request(body));
    expect(mocks.upsert.mock.calls[1][0]).toEqual(first.map((row: Record<string, unknown>) => ({ ...row, created_at: expect.any(String) })));
  });
  it("reports storage errors instead of saved:true", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "private detail" } });
    const response = await transcript(request(transcriptBody())); expect(response.status).toBe(503); expect(await response.text()).not.toContain('"saved":true');
  });
  it("rejects missing receipt, tampering, cross-user/locale/scope and expired receipts", () => {
    const token = issueVoiceReceipt(actor, "en", key, 300);
    expect(() => verifyVoiceReceipt(undefined, actor, "en")).toThrow();
    expect(() => verifyVoiceReceipt(token + "x", actor, "en")).toThrow();
    expect(() => verifyVoiceReceipt(token, { ...actor, profileId: "another" }, "en")).toThrow();
    expect(() => verifyVoiceReceipt(token, { ...actor, scope: "karen" }, "en")).toThrow();
    expect(() => verifyVoiceReceipt(token, actor, "ru")).toThrow();
    expect(() => verifyVoiceReceipt(issueVoiceReceipt(actor, "en", key, -1000), actor, "en")).toThrow();
  });
  it.each(["", "x".repeat(12001)])("rejects empty or oversized text", async user => {
    expect((await transcript(request({ ...transcriptBody(), user }))).status).toBe(400); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("scopes history to actor and language without accepting another profile", async () => {
    const response = await history(new Request("https://test.local/history?scope=client&locale=en&profileId=other")); expect(response.status).toBe(200);
    expect(queries.find(q => q.table === "assistant_messages")?.filters).toEqual(expect.arrayContaining([["profile_id", userId], ["locale", "en"], ["conversation_scope", "client"]]));
  });
  it("keeps staff histories separate by persona and Case", async () => {
    profile!.role = "admin"; caseRow = { id: caseId }; mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: "karen@example.test" } }, error: null });
    expect((await history(new Request(`https://test.local/history?scope=staff&locale=ru&caseId=${caseId}`))).status).toBe(200);
    expect(queries.find(q => q.table === "assistant_messages")?.filters).toEqual(expect.arrayContaining([["conversation_scope", "karen"], ["case_id", caseId]]));
  });
  it("fails closed on profile lookup failure", async () => {
    dbError = { message: "private" }; expect((await session(request(sessionBody))).status).toBe(503);
  });
});

describe("staff voice tool endpoint", () => {
  function staffBody() {
    profile!.role = "admin";
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId, email: "founder@example.test" } }, error: null });
    return { scope: "staff", locale: "en", name: "incoming_messages", arguments: { channel: "professor" }, receipt: issueVoiceReceipt({ ...actor, scope: "founder", email: "founder@example.test" }, "en", key, 300, "America/Los_Angeles") };
  }
  it("searches online through the authenticated endpoint and saves only server-attested sources", async () => {
    const body = { ...staffBody(), name: "search_web", arguments: { query: "NASA news" } };
    vi.stubEnv("ANHAM_WEB_SEARCH_ENABLED", "true");
    const provider = { status: "completed", output: [{ type: "web_search_call", status: "completed" }, { type: "message", status: "completed", content: [{ type: "output_text", text: "News [1]", annotations: [{ type: "url_citation", title: "NASA", url: "https://www.nasa.gov/", start_index: 5, end_index: 8 }] }] }] };
    vi.mocked(fetch).mockResolvedValue(Response.json(provider));
    const response = await siteTool(request(body)); expect(response.status).toBe(200);
    const { output } = await response.json();
    const save = { ...body, turnId: "web1", user: "Search NASA", assistant: "News", webReceipts: [output.webReceipt], webResults: [{ text: "FORGED" }] };
    expect((await transcript(request(save))).status).toBe(200);
    expect(mocks.upsert.mock.calls[0][0][1].web_results).toEqual([output.webResult]);
    expect(JSON.stringify(mocks.upsert.mock.calls)).not.toContain("FORGED");
    mocks.upsert.mockClear();
    const wrong = signWebResult(parseWebResult(provider), verifyVoiceReceipt(staffBody().receipt, { ...actor, scope: "founder" }, "en"), key);
    expect((await transcript(request({ ...save, webReceipts: [wrong] }))).status).toBe(403); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("does not allow internet search with a pre-web disclosure receipt", async () => {
    const body = { ...staffBody(), name: "search_web", arguments: { query: "NASA" } }; vi.stubEnv("ANHAM_WEB_SEARCH_ENABLED", "true");
    const old = JSON.parse(Buffer.from(body.receipt.split(".")[0], "base64url").toString()); old.dataAccessVersion = 2;
    const payload = Buffer.from(JSON.stringify(old)).toString("base64url");
    expect((await siteTool(request({ ...body, receipt: `${payload}.${createHmac("sha256", key).update(payload).digest("base64url")}` }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects clients, even with a valid session receipt", async () => {
    expect((await siteTool(request({ ...transcriptBody(), name: "registration_counts", arguments: {} }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("blocks cross-origin and missing or tampered receipts before any tool read", async () => {
    const body = staffBody();
    expect((await siteTool(request(body, "https://evil.test"))).status).toBe(403);
    expect((await siteTool(request({ ...body, receipt: body.receipt + "x" }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not expand an old session's narrower disclosure into broad medical access", async () => {
    const body = staffBody();
    const old = JSON.parse(Buffer.from(body.receipt.split(".")[0], "base64url").toString("utf8")); delete old.dataAccessVersion;
    const payload = Buffer.from(JSON.stringify(old)).toString("base64url");
    const receipt = `${payload}.${createHmac("sha256", key).update(payload).digest("base64url")}`;
    expect((await siteTool(request({ ...body, name: "site_data_catalog", arguments: {}, receipt }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("offers broad founder source discovery under the server-side session tool cap", async () => {
    const body = { ...staffBody(), name: "site_data_catalog", arguments: {} };
    const ok = await siteTool(request(body)); expect(ok.status).toBe(200);
    expect((await ok.json()).output.datasets).toEqual(expect.arrayContaining([expect.objectContaining({ id: "professor_messages" }), expect.objectContaining({ id: "questionnaires" })]));
    expect(mocks.rpc).toHaveBeenCalledWith("bump_assistant_usage", { p_bucket_key: expect.stringMatching(/^voice:tools:/), p_limit: 60 });
    mocks.rpc.mockResolvedValue({ data: [{ allowed: false }], error: null }); expect((await siteTool(request(body))).status).toBe(429);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "secret" } }); const response = await siteTool(request(body)); expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret");
  });
  it("rechecks the kill switch and account access after the session was admitted", async () => {
    const body = staffBody(); vi.stubEnv("ANHAM_REALTIME_ENABLED", "false");
    expect((await siteTool(request(body))).status).toBe(503); expect(mocks.rpc).not.toHaveBeenCalled();
    vi.stubEnv("ANHAM_REALTIME_ENABLED", "true"); profile!.status = "suspended";
    expect((await siteTool(request(body))).status).toBe(403);
  });
  it("binds the validated browser timezone and tools to the authenticated staff session", async () => {
    staffBody();
    expect((await session(request({ ...sessionBody, scope: "staff", timeZone: "invalid/timezone" }))).status).toBe(400);
    const response = await session(request({ ...sessionBody, scope: "staff", timeZone: "America/Los_Angeles" }));
    const output = await response.json();
    expect(verifyVoiceReceipt(output.receipt, { ...actor, scope: "founder" }, "en").timeZone).toBe("America/Los_Angeles");
    const form = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    const config = JSON.parse(form.get("session") as string);
    expect(config.tools.map((t: { name: string }) => t.name)).toEqual(expect.arrayContaining(["site_data_catalog", "query_site_records", "read_site_field", "summarize_site_records", "read_site_content", "registration_counts", "incoming_messages", "read_incoming_message"]));
    expect(config.tools.find((t: { name: string }) => t.name === "incoming_messages").parameters.properties.channel.enum).toEqual(["professor", "support"]);
  });
});

describe("voice bilingual role contract", () => {
  it.each(["ru", "en"] as const)("uses the active %s language and preserves medical boundaries", locale => {
    for (const scope of ["client", "founder", "karen"] as const) {
      const prompt = voiceInstructions({ ...actor, scope }, locale);
      expect(prompt).toContain(locale === "ru" ? "Russian only" : "English only"); expect(prompt).toContain("Do not diagnose");
      if (scope === "client") expect(prompt).toContain("NO document contents");
      else { expect(prompt).toContain("site_data_catalog"); expect(prompt).toContain("both have broad read access"); expect(prompt).toContain("NEEDS_REVIEW/SOURCE_ONLY"); }
    }
  });
  it("has a translated label for every voice state and error", () => {
    expect(Object.keys(voiceCopy.ru)).toEqual(Object.keys(voiceCopy.en));
    for (const text of Object.values(voiceCopy.en)) expect(text).not.toMatch(/[А-Яа-яЁё]/);
  });
});
