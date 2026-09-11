import { EventEmitter } from "node:events";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ fetch: vi.fn(), attach: vi.fn(), history: vi.fn(), db: vi.fn(), upsert: vi.fn(), backend: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/security/ai-transport", () => ({ aiFetch: m.fetch, attachLiveSession: m.attach }));
vi.mock("@/lib/assistant/history", () => ({ getOwnAssistantHistory: m.history }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: m.db }));
vi.mock("@/lib/assistant/live-backend", () => ({ runLiveBackend: m.backend }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: m.audit }));
import { openLiveSession } from "@/lib/assistant/live-session";
class Socket extends EventEmitter { readyState = 1; send = vi.fn(); close = vi.fn(); }
let socket: Socket;
const actor = { profileId: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test", scope: "founder" as const, caseId: null, tier: "registered" as const };
const event = (data: object) => socket.emit("message", Buffer.from(JSON.stringify(data)));
async function begin(sessionActor = actor) {
  const response = await openLiveSession({ actor: sessionActor, request: new Request("https://test.local/api/assistant/live"), locale: "en", sdp: "v=0", voice: "marin", timeZone: "UTC" });
  const text = response.text(); socket.emit("open"); event({ type: "session.started" }); return { text };
}
function end() { event({ type: "session.closed", reason: "close_requested", usage: { seconds: 20 } }); }
beforeEach(() => {
  vi.resetAllMocks(); socket = new Socket(); m.attach.mockReturnValue(socket);
  vi.stubEnv("GPT_LIVE_ENABLED", "true"); vi.stubEnv("GPT_LIVE_PILOT_EMAILS", actor.email); vi.stubEnv("GPT_LIVE_OPENAI_API_KEY", "synthetic-key");
  m.fetch.mockResolvedValue(new Response(JSON.stringify({ session: { id: "live_test" }, transport: { sdp: "v=0" } })));
  m.history.mockResolvedValue({ status: "ready", messages: [{ role: "user", content: "Earlier context" }, { role: "assistant", content: "Earlier answer" }] });
  m.audit.mockResolvedValue({ status: "inserted" }); m.upsert.mockResolvedValue({ error: null });
  m.db.mockReturnValue({ from: vi.fn(() => ({ upsert: m.upsert })) });
});
afterEach(() => vi.unstubAllEnvs());
describe("Live server session", () => {
  it.each(["dubrovenkoanna@gmail.com", "karen@example.test", "client@example.test", "other-founder@example.test"])("restricts streamed costs to Anna: %s", async email => {
    vi.stubEnv("GPT_LIVE_PILOT_EMAILS", email);
    const { text } = await begin({ ...actor, email });
    end(); const output = await text;
    const allowed = email === "dubrovenkoanna@gmail.com";
    expect(output.includes('"usdPerSecond"')).toBe(allowed);
    expect(output.includes('"estimatedUsd"')).toBe(allowed);
    expect(output).toContain('"seconds":20');
    expect(m.audit.mock.calls.some(c => typeof c[0].metadata.estimatedUsd === "number")).toBe(true);
  });
  it("loads bounded shared history and saves trusted transcript fragments idempotently", async () => {
    const { text } = await begin();
    const fragment = { type: "session.input_transcript.delta", event_id: "evt_1", delta: "Synthetic", start_ms: 0, end_ms: 100 };
    event(fragment); event(fragment); event({ type: "session.output_audio.delta", delta: "DO_NOT_STORE" });
    end(); const output = await text;
    expect(m.upsert).toHaveBeenCalledTimes(1);
    expect(m.upsert.mock.calls[0][0]).toMatchObject({ profile_id: actor.profileId, source: "voice_transcript", role: "user", content: "Synthetic", voice_state: null });
    expect(output).not.toContain("DO_NOT_STORE"); expect(output).not.toContain("synthetic-key");
    expect(output).toContain('"finalized":true');
    const payload = JSON.parse(m.fetch.mock.calls[0][1].body);
    expect(payload.session.input[0].content[0].text).toBe("Earlier context");
    expect(payload.session.instructions).toContain("founder's private");
  });
  it("keeps transcripts flowing during backend work and returns only the current delegation", async () => {
    let resolveFirst!: (value: object) => void;
    m.backend.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; })).mockResolvedValue({ reply: "Current result", memoryPending: false });
    const { text } = await begin();
    event({ type: "session.input_transcript.delta", event_id: "evt_1", delta: "First task", start_ms: 0, end_ms: 100 });
    event({ type: "session.delegation.created", delegation: { id: "task_1", target: "client" } });
    await vi.waitFor(() => expect(m.backend).toHaveBeenCalledTimes(1));
    event({ type: "session.input_transcript.delta", event_id: "evt_2", delta: " Correction", start_ms: 110, end_ms: 200 });
    event({ type: "session.delegation.created", delegation: { id: "task_2", target: "client" } });
    event({ type: "session.delegation.created", delegation: { id: "task_2", target: "client" } });
    await vi.waitFor(() => expect(socket.send).toHaveBeenCalledTimes(1));
    resolveFirst({ reply: "Stale result", memoryPending: false });
    await vi.waitFor(() => expect(m.audit.mock.calls.some(c => c[0].metadata.stale === true)).toBe(true));
    end(); const output = await text;
    expect(m.backend).toHaveBeenCalledTimes(2); expect(m.upsert).toHaveBeenCalledTimes(2);
    expect(output).toContain("Current result"); expect(output).not.toContain("Stale result");
    expect(JSON.parse(socket.send.mock.calls[0][0])).toMatchObject({ type: "session.commentary.append", delegation_id: "task_2" });
  });
  it("does not start a paid session when history or audit is unavailable", async () => {
    m.history.mockResolvedValue({ status: "error" });
    await expect(begin()).rejects.toMatchObject({ status: 503 }); expect(m.fetch).not.toHaveBeenCalled();
  });
});
