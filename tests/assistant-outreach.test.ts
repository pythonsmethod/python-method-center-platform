import { readFileSync } from "node:fs";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), upsert: vi.fn(), from: vi.fn(), getUser: vi.fn(),
  service: vi.fn(), auth: vi.fn(), locale: "ru" as "ru" | "en"
}));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.auth }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => mocks.locale }));

import { GET as cron } from "@/app/api/cron/assistant-outreach/route";
import { GET as preference, PATCH as stop } from "@/app/api/assistant/outreach/route";
import { deliverAssistantOutreach, stopAssistantOutreach } from "@/lib/assistant/outreach";
import { getOwnAssistantHistory, getAssistantHistoryForCase } from "@/lib/assistant/history";
import { createRegistrationProfile } from "@/lib/profile/registration";
import { localizedHref } from "@/lib/i18n/routing";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.locale = "ru";
  mocks.rpc.mockResolvedValue({ data: 1, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.service.mockReturnValue({ rpc: mocks.rpc, from: mocks.from });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.auth.mockResolvedValue({ auth: { getUser: mocks.getUser } });
  vi.stubEnv("ASSISTANT_OUTREACH_ENABLED", "true");
  vi.stubEnv("ASSISTANT_OUTREACH_PROFILE_IDS", undefined);
  vi.stubEnv("CRON_SECRET", "test-secret");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const cronRequest = (authorization?: string) => new Request("https://example.test/api/cron/assistant-outreach", {
  headers: authorization ? { authorization } : {}
});

describe("outreach cron and registration", () => {
  it.each([undefined, "Bearer anon-key", "Bearer wrong"])("rejects unauthorized cron: %s", async (header) => {
    expect((await cron(cronRequest(header))).status).toBe(401);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("fails closed without a configured cron secret", async () => {
    vi.stubEnv("CRON_SECRET", " ");
    expect((await cron(cronRequest("Bearer undefined"))).status).toBe(401);
  });
  it.each(["", "false", "TRUE"])("does no work unless explicitly enabled: %s", async (flag) => {
    vi.stubEnv("ASSISTANT_OUTREACH_ENABLED", flag);
    expect(await (await cron(cronRequest("Bearer test-secret"))).json()).toEqual({ enabled: false, sent: 0 });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("calls the atomic batch RPC and returns only aggregate counts", async () => {
    expect(await (await cron(cronRequest("Bearer test-secret"))).json()).toEqual({ enabled: true, sent: 1, batchLimit: 100 });
    expect(mocks.rpc).toHaveBeenCalledWith("deliver_assistant_outreach", { p_profile_id: null, p_welcome_only: false, p_limit: 100 });
  });
  it("limits cron delivery to the configured synthetic profiles and deduplicates IDs", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    vi.stubEnv("ASSISTANT_OUTREACH_PROFILE_IDS", `${id}, ${id}`);
    expect(await deliverAssistantOutreach()).toBe(1);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("deliver_assistant_outreach", {
      p_profile_id: id, p_welcome_only: false, p_limit: 1
    });
  });
  it.each(["", "bad-uuid", "00000000-0000-4000-8000-000000000001,"])("fails closed for invalid rollout scope: %s", async (scope) => {
    vi.stubEnv("ASSISTANT_OUTREACH_PROFILE_IDS", scope);
    await expect(deliverAssistantOutreach()).rejects.toThrow("Invalid assistant outreach scope");
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("does not welcome registrations outside the rollout scope", async () => {
    vi.stubEnv("ASSISTANT_OUTREACH_PROFILE_IDS", "00000000-0000-4000-8000-000000000001");
    expect(await deliverAssistantOutreach("00000000-0000-4000-8000-000000000002")).toBe(0);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("reports a database failure without leaking its contents", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "sensitive database context" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await cron(cronRequest("Bearer test-secret"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("sensitive");
    expect(log).toHaveBeenCalledWith("assistant-outreach-cron-failed");
  });
  it("fails when the service client is missing", async () => {
    mocks.service.mockReturnValue(null);
    await expect(deliverAssistantOutreach()).rejects.toThrow("unavailable");
  });
  it("sends only a welcome after a successful registration profile write", async () => {
    await createRegistrationProfile({ userId: "owner", email: "synthetic@example.test", phone: "", locale: "en" });
    expect(mocks.rpc).toHaveBeenCalledWith("deliver_assistant_outreach", { p_profile_id: "owner", p_welcome_only: true, p_limit: 1 });
    expect(mocks.upsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]);
  });
  it("does not attempt a welcome if saving the profile failed", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "write failed" } });
    await createRegistrationProfile({ userId: "owner", email: "synthetic@example.test", phone: "", locale: "en" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps registration working when welcome delivery fails", async () => {
    mocks.rpc.mockRejectedValue(new Error("connection lost"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(createRegistrationProfile({ userId: "owner", email: "synthetic@example.test", phone: "", locale: "ru" })).resolves.toBeUndefined();
  });
  it("keeps all schedules daily and within current Hobby limits", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.crons.length).toBeLessThanOrEqual(100);
    expect(config.crons).toContainEqual({ path: "/api/cron/assistant-outreach", schedule: "20 15 * * *" });
    for (const entry of config.crons) expect(entry.schedule).toMatch(/^\d+ \d+ \* \* \*$/);
  });
});

describe("outreach opt-out API", () => {
  it("uses the verified owner, ignores a forged target, and works when delivery is disabled", async () => {
    vi.stubEnv("ASSISTANT_OUTREACH_ENABLED", "false");
    const response = await stop(new Request("https://example.test/api/assistant/outreach", {
      method: "PATCH", body: JSON.stringify({ optedOut: true, profileId: "someone-else" })
    }));
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({ profile_id: "owner", opted_out: true }, { onConflict: "profile_id" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("denies guests without touching the service client", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await stop(new Request("https://example.test", { method: "PATCH", body: '{"optedOut":true}' }))).status).toBe(401);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it.each(["broken-json", '{"optedOut":false}', '{}'])("rejects malformed requests or attempts to resume: %s", async (body) => {
    expect((await stop(new Request("https://example.test", { method: "PATCH", body }))).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it.each(["ru", "en"] as const)("reports persistence failure in %s instead of confirming a stop", async (locale) => {
    mocks.locale = locale;
    mocks.upsert.mockResolvedValue({ error: { message: "private details" } });
    const response = await stop(new Request("https://example.test", { method: "PATCH", body: '{"optedOut":true}' }));
    expect(response.status).toBe(503);
    const { error } = await response.json();
    expect(error).toBe(locale === "ru" ? "Не удалось загрузить или сохранить настройку сообщений." : "Could not load or save your message preference.");
  });
  it("reads the owner's preference with private caching", async () => {
    const eq = vi.fn().mockReturnValue({ maybeSingle: async () => ({ data: { opted_out: true }, error: null }) });
    mocks.from.mockReturnValue({ select: () => ({ eq }) });
    const response = await preference();
    expect(await response.json()).toEqual({ optedOut: true });
    expect(eq).toHaveBeenCalledWith("profile_id", "owner");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("does not overwrite the delivery cursor when stopping", async () => {
    await stopAssistantOutreach("owner");
    expect(mocks.upsert.mock.calls[0][0]).toEqual({ profile_id: "owner", opted_out: true });
  });
});

describe("shared bilingual history", () => {
  it("passes the active locale from the actual staff Case page to the history reader and renderer", () => {
    const page = readFileSync("app/(admin)/admin/cases/[caseId]/page.tsx", "utf8");
    expect(page).toContain("getAssistantHistoryForCase(clientCase.profile_id, locale)");
    expect(page).toMatch(/<SavedAssistantThread[\s\S]*?locale=\{locale\}/);
  });
  it("renders the same saved message RU → EN → RU in the cabinet and admin without changing routes", async () => {
    const row = { id: "saved-once", profile_id: "owner", role: "assistant", content: "Приветствие",
      created_at: "2026-09-09T00:00:00Z", locale: "ru", message_sequence: 1,
      outreach_translations: { ru: "Приветствие", en: "Welcome" } };
    const filter = vi.fn();
    const eq = vi.fn();
    const chain = { select: vi.fn(), eq, in: filter, order: vi.fn(), limit: vi.fn() };
    chain.select.mockReturnValue(chain); eq.mockReturnValue(chain); filter.mockReturnValue(chain);
    chain.order.mockReturnValue(chain); chain.limit.mockResolvedValue({ data: [row], error: null });
    mocks.from.mockReturnValue(chain);
    for (const locale of ["ru", "en", "ru"] as const) {
      for (const reader of [getOwnAssistantHistory, getAssistantHistoryForCase]) {
        const result = await reader("owner", locale);
        expect(result.status).toBe("ready");
        if (result.status !== "ready") throw new Error("History failed");
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].id).toBe("saved-once");
        expect(result.messages[0].content).toBe(row.outreach_translations[locale]);
        expect(filter).toHaveBeenLastCalledWith("tier", ["registered", "client"]);
        expect(eq).toHaveBeenLastCalledWith("profile_id", "owner");
      }
      expect(localizedHref("/cabinet", locale)).toBe("/cabinet");
      expect(localizedHref("/admin/cases/synthetic", locale)).toBe("/admin/cases/synthetic");
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
