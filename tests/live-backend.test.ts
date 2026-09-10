import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ post: vi.fn(), actor: vi.fn(), rpc: vi.fn(), tool: vi.fn() }));
vi.mock("@/app/api/assistant/staff/route", () => ({ POST: m.post }));
vi.mock("@/app/api/assistant/client/route", () => ({ POST: m.post }));
vi.mock("@/lib/assistant/realtime-server", async original => ({ ...await original<object>(), resolveVoiceActor: m.actor }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ rpc: m.rpc }) }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: async () => ({ status: "inserted" }) }));
import { runLiveBackend } from "@/lib/assistant/live-backend";
import { currentLiveContext } from "@/lib/assistant/live-context";
import type { VoiceActor } from "@/lib/assistant/realtime-server";
const actor = { profileId: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test", scope: "founder" as const, caseId: null, tier: "registered" as const };
const call = (content = "Hello", selected: VoiceActor = actor) => runLiveBackend(new Request("https://test.local/api/assistant/live"), selected, "en", "session", "task", [{ role: "user", content }], "UTC");
beforeEach(() => {
  vi.resetAllMocks(); m.actor.mockResolvedValue(actor); m.rpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
  m.post.mockResolvedValue(Response.json({ reply: "Existing Anham response" }));
  vi.stubEnv("GPT_LIVE_ENABLED", "true"); vi.stubEnv("GPT_LIVE_PILOT_EMAILS", actor.email); vi.stubEnv("GPT_LIVE_OPENAI_API_KEY", "synthetic");
});
afterEach(() => vi.unstubAllEnvs());
it("delegates through the existing route and keeps persistence in the Live transcript path", async () => {
  expect(await call()).toEqual({ reply: "Existing Anham response", memoryPending: false });
  const request = m.post.mock.calls[0][0] as Request;
  expect(new URL(request.url).pathname).toBe("/api/assistant/staff");
  expect(await request.json()).toMatchObject({ transient: true, locale: "en", messages: [{ role: "user", content: "Hello" }] });
  expect(currentLiveContext()).toBeUndefined();
});
it("requires review for spoken memory instead of executing the founder's text save", async () => {
  const result = await call("Remember: synthetic preference");
  expect(result.memoryPending).toBe(true); expect(result.reply).toContain("Not saved yet");
  expect(m.post).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
});
it("does not expose or accept cabinet writes through Live", async () => {
  const client: VoiceActor = { ...actor, scope: "client", clientPreview: true, tier: "client" }; m.actor.mockResolvedValue(client);
  m.post.mockImplementation(async () => {
    const context = currentLiveContext()!;
    expect(context.tools.some(t => t.name === "execute_my_cabinet_action" || t.name === "prepare_my_cabinet_action")).toBe(false);
    await expect(context.run("execute_my_cabinet_action", {})).rejects.toMatchObject({ status: 403 });
    return Response.json({ reply: "No write occurred" });
  });
  await call("Hello", client);
});
it("denies revoked identity and uncertain task reservation before invoking the backend", async () => {
  m.actor.mockResolvedValueOnce({ ...actor, scope: "client" });
  await expect(call()).rejects.toMatchObject({ status: 403 });
  m.rpc.mockResolvedValue({ data: null, error: {} });
  await expect(call()).rejects.toMatchObject({ status: 503 }); expect(m.post).not.toHaveBeenCalled();
});
