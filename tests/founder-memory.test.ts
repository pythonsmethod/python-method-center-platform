import { describe, expect, it, vi, beforeEach } from "vitest";
import { founderMemoryFromCommand } from "@/lib/assistant/founder-memory";

const mocks = vi.hoisted(() => ({ insert: vi.fn(), auth: vi.fn(), role: vi.fn(), ask: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: mocks.auth }));
vi.mock("@/lib/auth/require-karen", () => ({ resolvePrivateAssistantRole: mocks.role }));
vi.mock("@/lib/auth/require-founder", () => ({ canSeeProviderNames: () => false }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ from: (table: string) => ({ insert: table === "assistant_knowledge" ? mocks.insert : async () => ({ error: null }) }) }) }));
vi.mock("@/lib/assistant/prompts", () => ({ buildStaffSystemPrompt: async () => "", ATTACHMENT_READING_ACCURACY_RULE: "" }));
vi.mock("@/lib/assistant/case-context", () => ({ buildCaseContext: async () => "" }));
vi.mock("@/lib/assistant/router", () => ({ askKarenAssistant: mocks.ask, askAssistantTeam: mocks.ask }));
vi.mock("@/lib/assistant/knowledge-search", () => ({ searchKnowledgeArchive: mocks.search }));
import { POST } from "@/app/api/assistant/staff/route";

describe("Anna memory commands", () => {
  it.each(["Запомни: встречи по средам", "Сохрани в базу знаний: встречи по средам", "Remember: meetings on Wednesdays", "Please save: meetings on Wednesdays"])("captures inline content: %s", command => {
    expect(founderMemoryFromCommand([{ role: "user", content: command }])?.content).toMatch(/встречи|meetings/);
  });
  it.each(["Не сохраняй это", "Do not save this", "Как сохранить запись?", "Can you explain memory?", 'Он сказал: «Запомни это»'])("does not write for %s", content => {
    expect(founderMemoryFromCommand([{ role: "user", content }])).toBeNull();
  });
  it("uses the previous answer only for a reference command", () => {
    expect(founderMemoryFromCommand([{ role: "user", content: "Сформулируй" }, { role: "assistant", content: "Точная формулировка" }, { role: "user", content: "Сохрани это" }])?.content).toBe("Точная формулировка");
  });
});

describe("staff route memory persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ status: "authorized", email: "founder@example.test", userId: "founder-id" });
    mocks.role.mockReturnValue("founder");
    mocks.insert.mockResolvedValue({ error: null });
    mocks.search.mockResolvedValue({ context: "Archive source: old papyrus", unavailable: false, matches: 1 });
    mocks.ask.mockResolvedValue({ status: "ok", reply: "ordinary answer" });
  });
  const request = (content: string, locale = "ru") => new Request("http://localhost/api/assistant/staff", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content }], locale }) });
  it.each([["ru", "Запомни: тестовая заметка", "Сохранено"], ["en", "Remember: test note", "Saved"]])("persists and confirms in %s", async (locale, command, confirmation) => {
    const response = await POST(request(command, locale));
    expect(response.status).toBe(200);
    expect((await response.json()).reply).toContain(confirmation);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ audience: "staff", collection: "general", created_by: "founder-id" }));
    expect(mocks.ask).not.toHaveBeenCalled();
  });
  it("does not claim success after a failed write", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "failure" } });
    const response = await POST(request("Remember: test", "en"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Could not save the note. Please try again." });
  });
  it("rejects unauthorized users before writing", async () => {
    mocks.auth.mockResolvedValue({ status: "forbidden" });
    expect((await POST(request("Запомни: тест"))).status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("keeps Karen on the existing confirmation flow", async () => {
    mocks.role.mockReturnValue("karen");
    await POST(request("Запомни: тест"));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.ask).toHaveBeenCalled();
  });
  it("injects retrieved archive knowledge into an ordinary founder answer", async () => {
    await POST(request("Найди папирус в архиве"));
    expect(mocks.search).toHaveBeenCalledWith("Найди папирус в архиве");
    expect(mocks.ask.mock.calls[0][0]).toContain("old papyrus");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("asks for content instead of storing an empty command", async () => {
    await POST(request("Сохрани это"));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
