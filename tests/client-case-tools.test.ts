import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ from: f.from, rpc: f.rpc }) }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: f.audit }));
import { readMyCase } from "@/lib/assistant/client-case-tools";
import { CLIENT_CASE_SECTIONS } from "@/lib/assistant/client-tool-contract";
import { availableConversationTools, withConversationArchive, executeConversationArchiveTool } from "@/lib/assistant/conversation-archive";
import { voiceSiteTools } from "@/lib/assistant/voice-site-tools";
import type { VoiceActor } from "@/lib/assistant/realtime-server";
const actor: VoiceActor = { profileId: "00000000-0000-4000-8000-000000000001", caseId: "00000000-0000-4000-8000-000000000002", scope: "client", email: "pilot@example.test", tier: "client", clientPreview: true };
const id = "00000000-0000-4000-8000-000000000003";
let filters: unknown[][], selection: string, row: Record<string, unknown> | null, error: unknown, count: number;
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", actor.email!); vi.stubEnv("ANHAM_WEB_SEARCH_ENABLED", "true");
  filters = []; selection = ""; row = { id, body: "Synthetic source" }; error = null; count = 1;
  f.rpc.mockResolvedValue({ data: [{ allowed: true }], error: null }); f.audit.mockResolvedValue({ status: "inserted" });
  f.from.mockImplementation(() => {
    const chain = { select: (fields: string) => { selection = fields; return chain; }, eq: (...args: unknown[]) => { filters.push(args); return chain; }, abortSignal: () => chain, order: () => chain, range: () => chain,
      maybeSingle: async () => ({ data: row, error }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: row ? [row] : [], error, count }).then(resolve) };
    return chain;
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("client source ownership and provenance", () => {
  it.each(CLIENT_CASE_SECTIONS)("always binds %s to the authenticated owner", async section => {
    expect((await readMyCase(actor, { section })).status).toBe("ready");
    expect(filters).toContainEqual([section === "account" ? "id" : section === "deliveries" ? "client_profile_id" : "profile_id", actor.profileId]);
    expect(selection).not.toMatch(/\*|storage_path|metadata|processor_reference|identity_reasons|summary|ai_draft|volunteer_comment/);
    if (["onboarding", "documents", "document_readings", "lab_values", "professor_messages"].includes(section)) expect(filters).toContainEqual(["case_id", actor.caseId]);
  });
  it("keeps owner filters when a guessed foreign record ID is supplied", async () => {
    row = null;
    expect(await readMyCase(actor, { section: "document_readings", recordId: id })).toEqual({ status: "not_found" });
    expect(filters).toEqual(expect.arrayContaining([["profile_id", actor.profileId], ["case_id", actor.caseId], ["id", id]]));
  });
  it.each([{ section: "notes" }, { section: "ai_reviews" }, { section: "__proto__" }, { section: "payments", profileId: "other" }, { section: "documents", fields: "*" }, { section: "documents", page: "0" }, { section: "documents", offset: 10 }])("rejects unreviewed fields/scopes %j", async args => {
    expect((await readMyCase(actor, args)).status).toBe("invalid"); expect(f.from).not.toHaveBeenCalled();
  });
  it("does not grant a missing, revoked or staff preview", async () => {
    for (const subject of [{ ...actor, clientPreview: false }, { ...actor, scope: "founder" as const }]) expect((await readMyCase(subject, { section: "account" })).status).toBe("forbidden");
    vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "");
    expect((await readMyCase(actor, { section: "account" })).status).toBe("forbidden"); expect(f.from).not.toHaveBeenCalled();
  });
  it("keeps long readings complete through versioned chunks", async () => {
    row = { id, first_reading: "x".repeat(18000) };
    const first = await readMyCase(actor, { section: "document_readings", recordId: id });
    expect(first).toMatchObject({ status: "ready", nextOffset: 8000, kind: "source_extraction_not_clinical_decision" });
    const next = await readMyCase(actor, { section: "document_readings", recordId: id, offset: 8000, revision: "revision" in first ? first.revision : "" });
    expect(next).toMatchObject({ status: "ready", nextOffset: 16000 });
    row.first_reading = "changed";
    expect((await readMyCase(actor, { section: "document_readings", recordId: id, revision: "revision" in first ? first.revision : "" })).status).toBe("changed");
  });
  it("distinguishes unavailable data and quota failure from an empty source", async () => {
    error = { message: "private diagnostic" };
    const failed = await readMyCase(actor, { section: "payments" });
    expect(failed.status).toBe("unavailable"); expect(JSON.stringify(failed)).not.toContain("private diagnostic");
    f.rpc.mockResolvedValue({ data: [{ allowed: false }], error: null });
    expect((await readMyCase(actor, { section: "payments" })).status).toBe("limit");
  });
  it("reports exact totals separately from bounded previews", async () => {
    count = 12; row = { id, first_reading: "x".repeat(5000) };
    expect(await readMyCase(actor, { section: "document_readings" })).toMatchObject({ status: "ready", totalRecords: 12, nextPage: 1, records: [{ recordId: id, truncated: true }] });
  });
  it("offers the same tools in voice and text, only with server authority", async () => {
    const names = voiceSiteTools("client", actor).map(t => t.name);
    expect(names).toEqual(["search_conversation_history", "read_conversation_message", "read_my_case", "search_web"]);
    await withConversationArchive({ profileId: actor.profileId, caseId: actor.caseId, private: false, clientTools: { email: actor.email!, locale: "ru" } }, async () => {
      expect(availableConversationTools().map(t => t.name)).toEqual(names);
      expect((await executeConversationArchiveTool("read_my_case", { section: "payments" })).status).toBe("ready");
    });
    expect(availableConversationTools().map(t => t.name)).not.toContain("read_my_case");
    expect((await executeConversationArchiveTool("read_my_case", { section: "payments" })).status).toBe("forbidden");
  });
});
