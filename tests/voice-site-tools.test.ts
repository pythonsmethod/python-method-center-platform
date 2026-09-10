import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ service: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: vi.fn(async () => ({ status: "inserted" })) }));
import { runVoiceSiteTool, validatedTimeZone, voiceSiteTools, voiceToday } from "@/lib/assistant/voice-site-tools";
import type { VoiceActor } from "@/lib/assistant/realtime-server";

const id = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const actor: VoiceActor = { profileId: id, email: "karen@example.test", scope: "karen", caseId: null, tier: "registered" };
const now = new Date("2026-09-09T23:00:00Z");
type Query = { table: string; calls: unknown[][] };
const queries: Query[] = [];
let result: (query: Query) => object;
beforeEach(() => {
  queries.length = 0;
  result = () => ({ data: [], count: 0, error: null });
  mocks.service.mockReturnValue({ from: (table: string) => {
    const q = { table, calls: [] as unknown[][] }; queries.push(q);
    const chain: Record<string, unknown> = { then: (resolve: (value: object) => unknown) => Promise.resolve(result(q)).then(resolve) };
    for (const name of ["select", "eq", "gte", "lt", "order", "range", "in", "maybeSingle"]) chain[name] = (...args: unknown[]) => { q.calls.push([name, ...args]); return chain; };
    return chain;
  } });
});
const run = (name: string, args: object = {}, who = actor) => runVoiceSiteTool(who, name, args, "America/Los_Angeles", now);
describe("voice civil day", () => {
  it.each([
    ["2026-03-08T20:00:00Z", "2026-03-08T08:00:00.000Z", "2026-03-09T07:00:00.000Z"],
    ["2026-11-01T20:00:00Z", "2026-11-01T07:00:00.000Z", "2026-11-02T08:00:00.000Z"],
  ])("handles DST on %s", (instant, start, end) => {
    expect(voiceToday("America/Los_Angeles", new Date(instant))).toMatchObject({ start, end });
  });
  it("uses caller civil date across UTC midnight", () => {
    expect(voiceToday("America/Los_Angeles", new Date("2026-09-10T01:00:00Z")).date).toBe("2026-09-09");
    expect(voiceToday("Asia/Tokyo", now).date).toBe("2026-09-10");
  });
  it("validates time zones and defaults omitted ones", () => {
    expect(validatedTimeZone(undefined)).toBe("UTC"); expect(() => validatedTimeZone("invented/zone")).toThrow();
  });
});
describe("permission-scoped read-only site data", () => {
  it("offers only own archive tools to clients and refuses staff site operations", async () => {
    expect(voiceSiteTools("client").map(tool => tool.name)).toEqual(["search_conversation_history", "read_conversation_message"]);
    await expect(run("registration_counts", {}, { ...actor, scope: "client" })).rejects.toMatchObject({ status: 403 }); expect(queries).toEqual([]);
  });
  it.each(["incoming_messages", "read_incoming_message"])("honors the owner's broadened founder Professor access through %s", async name => {
    if (name === "read_incoming_message") result = () => ({ data: { id, body: "Synthetic message", created_at: now.toISOString() }, error: null });
    expect(await run(name, { channel: "professor", ...(name === "read_incoming_message" ? { messageId: id } : {}) }, { ...actor, scope: "founder" })).toMatchObject({ channel: "professor" }); expect(queries[0].table).toBe("case_messages");
  });
  it("counts exact current client profiles, including today's local date", async () => {
    result = q => ({ count: q.calls.some(c => c[0] === "gte") ? 3 : 107, error: null });
    expect(await run("registration_counts")).toMatchObject({ registeredClientAccounts: 107, registeredToday: 3, date: "2026-09-09", timeZone: "America/Los_Angeles" });
    expect(queries).toHaveLength(2);
    for (const q of queries) { expect(q.table).toBe("profiles"); expect(q.calls).toContainEqual(["eq", "role", "client"]); expect(q.calls).toContainEqual(["select", "id", { count: "exact", head: true }]); }
    expect(queries[1].calls).toContainEqual(["gte", "created_at", "2026-09-09T07:00:00.000Z"]);
  });
  it("does not translate a missing count or database error to zero", async () => {
    result = () => ({ count: null, error: null }); await expect(run("registration_counts")).rejects.toMatchObject({ status: 503 });
    result = () => ({ count: 0, error: { message: "secret" } }); await expect(run("incoming_messages")).rejects.toMatchObject({ status: 503 });
  });
  it("returns exact per-sender count, a bounded preview and explicit pagination", async () => {
    result = q => q.table === "profiles" ? { data: [{ id, full_name: "Synthetic Client" }], error: null }
      : q.calls.some(c => c[0] === "range") ? { data: [{ id: second, profile_id: id, case_id: second, body: "x".repeat(2200), created_at: now.toISOString() }], count: 21, error: null }
      : { count: 7, error: null };
    const output = await run("incoming_messages") as { messages: { text: string }[] };
    expect(output).toMatchObject({ channel: "professor", source: "case_messages", totalMessages: 21, nextOffset: 1, messages: [{ senderName: "Synthetic Client", senderMessagesToday: 7, textTruncated: true, sourceUrl: `/admin/cases/${second}` }] });
    expect(output.messages[0].text).toHaveLength(2000);
    expect(queries[0].calls).toContainEqual(["range", 0, 19]);
    expect(queries[0].calls).toContainEqual(["eq", "sender_role", "client"]);
    expect(JSON.stringify(queries)).not.toMatch(/audio_path|read_at|email/);
  });
  it("names guests by support conversation and never invents an audio transcript", async () => {
    result = q => q.table === "support_requests" ? { data: [{ id: second, contact_name: "Synthetic Guest" }], error: null }
      : q.calls.some(c => c[0] === "range") ? { data: [{ id, profile_id: null, support_request_id: second, body: null, created_at: now.toISOString() }], count: 1, error: null }
      : { count: 1, error: null };
    expect(await run("incoming_messages", {}, { ...actor, scope: "founder" })).toMatchObject({ channel: "support", nextOffset: null, messages: [{ senderName: "Synthetic Guest", senderKey: `request:${second}`, audioNotTranscribed: true, text: null }] });
  });
  it("reads full incoming text only from the permitted channel", async () => {
    result = () => ({ data: { id, body: "x".repeat(8000), created_at: now.toISOString() }, error: null });
    expect(await run("read_incoming_message", { channel: "support", messageId: id }, { ...actor, scope: "founder" })).toMatchObject({ untrustedContent: true, message: { body: "x".repeat(8000) } });
    expect(queries[0].table).toBe("support_request_messages"); expect(queries[0].calls).toContainEqual(["eq", "sender_role", "client"]);
  });
  it.each([["incoming_messages", { offset: -1 }], ["incoming_messages", { offset: 0.5 }], ["incoming_messages", { profileId: id }], ["registration_counts", { sql: "select" }], ["read_incoming_message", { channel: "support", messageId: "bad" }], ["unknown", {}]])("rejects unbounded/model-selected access %s %j", async (name, args) => {
    await expect(run(name as string, args as object)).rejects.toMatchObject({ status: 400 }); expect(queries).toEqual([]);
  });
  it("fails closed on inconsistent empty page and unavailable message", async () => {
    result = () => ({ data: [], count: 5, error: null }); await expect(run("incoming_messages")).rejects.toMatchObject({ status: 503 });
    result = () => ({ data: null, error: null }); await expect(run("read_incoming_message", { messageId: id, channel: "professor" })).rejects.toMatchObject({ status: 403 });
  });
});
