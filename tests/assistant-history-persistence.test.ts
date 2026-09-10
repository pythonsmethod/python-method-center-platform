import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ db: vi.fn(), insert: vi.fn(), query: vi.fn(), select: vi.fn(), eq: vi.fn(), in: vi.fn(), is: vi.fn(), lt: vi.fn(), order: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: f.db }));
import { getOwnAssistantHistory, saveAssistantExchange } from "@/lib/assistant/history";
const stored = [{ id: "q", role: "user", content: "Question", created_at: "2026-09-09T10:00:00Z", message_sequence: 1, locale: "ru" }, { id: "a", role: "assistant", content: "Answer", created_at: "2026-09-09T10:00:00Z", message_sequence: 2, locale: "en" }];
const input = { profileId: "owner", caseId: null, tier: "founder" as const, question: "Question", answer: "Answer", locale: "ru" as const };
beforeEach(() => {
  vi.resetAllMocks();
  const query = { select: f.select, eq: f.eq, in: f.in, is: f.is, lt: f.lt, order: f.order, limit: f.limit, then: (resolve: (v: unknown) => void) => Promise.resolve(f.query()).then(resolve) };
  for (const fn of [f.select, f.eq, f.in, f.is, f.lt, f.order, f.limit]) fn.mockReturnValue(query);
  f.query.mockReturnValue({ data: [...stored].reverse(), error: null });
  f.insert.mockReturnValue({ select: () => Promise.resolve({ data: stored, error: null }) });
  f.db.mockReturnValue({ from: () => ({ ...query, insert: f.insert }) });
});
describe("assistant durable history", () => {
  it.each(["founder", "karen", "registered", "client"] as const)("acknowledges %s only after storing both messages", async tier => {
    const result = await saveAssistantExchange({ ...input, tier });
    expect(result).toEqual({ saved: true, messages: stored });
    expect(f.insert.mock.calls[0][0]).toEqual(expect.arrayContaining([expect.objectContaining({ profile_id: "owner", tier, role: "user" }), expect.objectContaining({ profile_id: "owner", tier, role: "assistant" })]));
  });
  it("keeps long replies intact", async () => {
    await saveAssistantExchange({ ...input, answer: "x".repeat(16000) });
    expect(f.insert.mock.calls[0][0][1].content).toHaveLength(16000);
  });
  it("does not store guests", async () => { expect(await saveAssistantExchange({ ...input, tier: "guest" })).toEqual({ saved: false }); expect(f.insert).not.toHaveBeenCalled(); });
  it("reports a missing database instead of an empty history", async () => { f.db.mockReturnValue(null); expect(await saveAssistantExchange(input)).toEqual({ saved: false }); expect((await getOwnAssistantHistory("owner", "ru")).status).toBe("error"); });
  it("retries identical IDs after a transient failure", async () => {
    f.insert.mockReturnValueOnce({ select: () => Promise.reject(new Error("network")) });
    expect((await saveAssistantExchange(input)).saved).toBe(true);
    expect(f.insert.mock.calls[0][0]).toEqual(f.insert.mock.calls[1][0]);
  });
  it("reports storage errors after bounded retries", async () => {
    f.insert.mockReturnValue({ select: () => Promise.resolve({ error: { code: "DOWN" } }) });
    f.query.mockReturnValue({ error: { code: "DOWN" } });
    expect(await saveAssistantExchange(input)).toEqual({ saved: false });
    expect(f.insert).toHaveBeenCalledTimes(3);
  });
  it("reads back an uncertain acknowledgement without duplicating it", async () => {
    f.insert.mockReturnValueOnce({ select: () => Promise.resolve({ error: { code: "23505" } }) });
    expect((await saveAssistantExchange(input)).saved).toBe(true);
    expect(f.insert).toHaveBeenCalledTimes(1);
    expect(f.eq).toHaveBeenCalledWith("profile_id", "owner");
  });
  it.each(["ru", "en"] as const)("loads original multilingual text with timestamps in %s", async locale => {
    expect(await getOwnAssistantHistory("owner", locale)).toEqual({ status: "ready", messages: stored });
    expect(f.eq).toHaveBeenCalledWith("profile_id", "owner");
    expect(f.eq).not.toHaveBeenCalledWith("locale", expect.anything());
    expect(f.in).toHaveBeenCalledWith("tier", ["registered", "client"]);
  });
  it("isolates personal staff history from case discussions", async () => {
    await getOwnAssistantHistory("owner", "en", 60, { private: true });
    expect(f.in).toHaveBeenCalledWith("tier", ["founder", "karen"]);
    expect(f.is).toHaveBeenCalledWith("case_id", null);
  });
  it("scopes older pages to both account and case", async () => {
    await getOwnAssistantHistory("owner", "ru", 60, { private: true, caseId: "case", before: 61 });
    expect(f.eq).toHaveBeenCalledWith("profile_id", "owner");
    expect(f.eq).toHaveBeenCalledWith("case_id", "case");
    expect(f.lt).toHaveBeenCalledWith("message_sequence", 61);
    expect(f.limit).toHaveBeenCalledWith(60);
  });
});
