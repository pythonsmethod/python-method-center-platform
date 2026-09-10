import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ context: vi.fn(), history: vi.fn(), auth: vi.fn(), staff: vi.fn(), locale: vi.fn(), save: vi.fn(), role: vi.fn(), ask: vi.fn() }));
vi.mock("@/lib/assistant/history", () => ({ getOwnAssistantHistory: f.history, HISTORY_PAGE_SIZE: 60, saveAssistantExchange: f.save }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: f.auth }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: f.locale }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: f.staff }));
vi.mock("@/lib/auth/require-karen", () => ({ getKarenAssistantUserState: f.staff, resolvePrivateAssistantRole: f.role }));
vi.mock("@/lib/auth/require-founder", () => ({ canSeeProviderNames: () => false }));
vi.mock("@/lib/assistant/prompts", () => ({ buildStaffSystemPrompt: async () => "", ATTACHMENT_READING_ACCURACY_RULE: "" }));
vi.mock("@/lib/assistant/case-context", () => ({ buildCaseContext: async () => "" }));
vi.mock("@/lib/assistant/router", () => ({ askKarenAssistant: f.ask, askAssistantTeam: f.ask }));
import { GET } from "@/app/api/assistant/history/route";
vi.mock("@/lib/assistant/conversation-context", () => ({ conversationContext: f.context }));
import { POST } from "@/app/api/assistant/staff/route";
const messages = [{ id: "q", role: "user", content: "Question", created_at: "2026-09-09T10:00:00Z", message_sequence: 1 }, { id: "a", role: "assistant", content: "Answer", created_at: "2026-09-09T10:00:01Z", message_sequence: 2 }];
const get = (query = "") => GET(new Request(`http://localhost/api/assistant/history${query}`));
const post = (extra = {}) => POST(new Request("http://localhost/api/assistant/staff", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Question" }], locale: "en", ...extra }) }));
beforeEach(() => {
  vi.resetAllMocks();
  f.locale.mockResolvedValue("en");
  f.auth.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "client-own-id" } } }) } });
  f.staff.mockResolvedValue({ status: "authorized", userId: "staff-own-id", email: "owner@example.test" });
  f.role.mockReturnValue("founder");
  f.ask.mockResolvedValue({ status: "ok", reply: "Answer" });
  f.history.mockResolvedValue({ status: "ready", messages });
  f.context.mockResolvedValue("Saved conversation: earlier topic");
  f.save.mockResolvedValue({ saved: true, messages });
});
describe("history HTTP boundary", () => {
  it("returns timestamps and original content with private no-store headers", async () => {
    const response = await get();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ messages, hasMore: false });
  });
  it("never trusts a profile ID from the request", async () => {
    await get("?profileId=someone-else");
    expect(f.history).toHaveBeenCalledWith("client-own-id", "en", 60, { private: false, caseId: null, before: undefined });
  });
  it("checks the private assistant allowlist before reading", async () => {
    f.staff.mockResolvedValue({ status: "forbidden" });
    expect((await get("?scope=private")).status).toBe(403);
    expect(f.history).not.toHaveBeenCalled();
  });
  it("separates each staff member and case", async () => {
    const caseId = "11111111-1111-4111-8111-111111111111";
    await get(`?scope=private&caseId=${caseId}&before=61`);
    expect(f.history).toHaveBeenCalledWith("staff-own-id", "en", 60, { private: true, caseId, before: 61 });
  });
  it.each(["?before=NaN", "?before=-1", "?before=1.5", "?caseId=bad"])("rejects malformed pagination %s", async params => {
    expect((await get(params)).status).toBe(400); expect(f.history).not.toHaveBeenCalled();
  });
  it("does not disguise a database failure as an empty conversation", async () => {
    f.history.mockResolvedValue({ status: "error", message: "Unavailable" });
    expect((await get()).status).toBe(503);
  });
  it("returns a sign-in error when the session has expired", async () => {
    f.auth.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    expect((await get()).status).toBe(401); expect(f.history).not.toHaveBeenCalled();
  });
  it("marks a full page as having more history", async () => {
    f.history.mockResolvedValue({ status: "ready", messages: Array(60).fill(messages[0]) });
    expect((await (await get()).json()).hasMore).toBe(true);
  });
});
describe("staff exchange persistence integration", () => {
  it("loads private context for the authenticated staff user and selected Case", async () => {
    const caseId = "00000000-0000-4000-8000-000000000002";
    await post({ caseId, profileId: "other-owner" });
    expect(f.context).toHaveBeenCalledWith({ profileId: "staff-own-id", private: true, caseId }, "Question");
    expect(f.ask.mock.calls[0][0]).toContain("Saved conversation: earlier topic");
  });
  it.each(["founder", "karen"])("saves the authenticated %s conversation before returning", async role => {
    f.role.mockReturnValue(role);
    const response = await post({ displayText: "Original question with file names" });
    expect(await response.json()).toEqual({ reply: "Answer", saved: true, messages });
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ profileId: "staff-own-id", tier: role, caseId: null, question: "Original question with file names", answer: "Answer", locale: "en" }));
  });
  it("skips technical file batches", async () => {
    expect((await (await post({ transient: true })).json()).reply).toBe("Answer");
    expect(f.save).not.toHaveBeenCalled();
  });
  it("returns the reply and an explicit unsaved result on failure", async () => {
    f.context.mockResolvedValue("Saved conversation: earlier topic");
  f.save.mockResolvedValue({ saved: false });
    expect(await (await post()).json()).toEqual({ reply: "Answer", saved: false });
  });
  it("records Karen's confirmation question without saving methodology", async () => {
    f.role.mockReturnValue("karen");
    const response = await post({ memoryConfirmation: true, messages: [{ role: "user", content: "Сохрани в книгу" }] });
    expect(response.status).toBe(200); expect(f.save).toHaveBeenCalled(); expect(f.ask).not.toHaveBeenCalled();
  });
  it("denies unauthorized staff before generation and persistence", async () => {
    f.role.mockReturnValue(null);
    expect((await post()).status).toBe(403);
    expect(f.save).not.toHaveBeenCalled(); expect(f.ask).not.toHaveBeenCalled();
  });
});
