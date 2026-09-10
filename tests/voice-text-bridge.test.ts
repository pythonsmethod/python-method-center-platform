import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ text: vi.fn(), rpc: vi.fn(), history: vi.fn() }));
vi.mock("@/app/api/assistant/staff/route", () => ({ POST: mocks.text }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/assistant/history", () => ({ getOwnAssistantHistory: mocks.history }));
import { runVoiceTextBridge } from "@/lib/assistant/voice-text-bridge";
import { voiceSiteTools } from "@/lib/assistant/voice-site-tools";
import type { Receipt, VoiceActor } from "@/lib/assistant/realtime-server";
const actor: VoiceActor = { profileId: "owner", email: "owner@example.test", scope: "founder", caseId: null, tier: "registered" };
const receipt = { id: "session" } as Receipt;
const request = new Request("https://test.local/api/assistant/realtime/tools");
const body = { arguments: {}, userTurn: { id: "turn1", text: "Запомни: тестовая заметка" } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
  mocks.history.mockResolvedValue({ status: "ready", messages: [] });
  mocks.text.mockResolvedValue(Response.json({ reply: "Сохранено" }));
});
describe("voice uses existing private text authority", () => {
  it.each(["founder", "karen"] as const)("delegates actual %s transcript with authoritative Case and confirmation policy", async scope => {
    const output = await runVoiceTextBridge(request, { ...actor, scope }, receipt, "ru", { ...body, caseId: "injected", role: "admin" });
    expect(output.reply).toBe("Сохранено");
    const input = await mocks.text.mock.calls[0][0].json();
    expect(input).toEqual({ messages: [{ role: "user", content: body.userTurn.text }], locale: "ru", caseId: null, transient: true, memoryConfirmation: scope === "karen" });
    expect(mocks.history).toHaveBeenCalledWith("owner", "ru", 16, { private: true, caseId: null });
  });
  it("rejects clients and model-supplied commands before calling text", async () => {
    await expect(runVoiceTextBridge(request, { ...actor, scope: "client" }, receipt, "en", body)).rejects.toMatchObject({ status: 403 });
    await expect(runVoiceTextBridge(request, actor, receipt, "en", { ...body, arguments: { command: "save" } })).rejects.toMatchObject({ status: 400 });
    expect(mocks.text).not.toHaveBeenCalled();
    expect(voiceSiteTools("client").some(tool => tool.name === "ask_text_assistant")).toBe(false);
    expect(voiceSiteTools("karen").some(t => t.name === "ask_text_assistant")).toBe(true);
  });
  it("cannot execute a duplicate turn or claim success on denial", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ allowed: false }], error: null });
    await expect(runVoiceTextBridge(request, actor, receipt, "en", body)).rejects.toMatchObject({ status: 503 });
    expect(mocks.text).not.toHaveBeenCalled();
  });
  it("preserves text authorization failures", async () => {
    mocks.text.mockResolvedValue(Response.json({ error: "forbidden" }, { status: 403 }));
    expect(await runVoiceTextBridge(request, actor, receipt, "en", body)).toMatchObject({ error: "unavailable" });
  });
});
