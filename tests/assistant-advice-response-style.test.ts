import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ provider: vi.fn(), entries: vi.fn(), locale: "ru" as "ru" | "en" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => mocks.locale }));
vi.mock("@/lib/assistant/router", () => ({ askAssistantTeam: mocks.provider }));
vi.mock("@/lib/assistant/claude", () => ({ askClaude: mocks.provider }));
vi.mock("@/lib/assistant/knowledge", () => ({ listGuidance: async () => [] }));
vi.mock("@/lib/sleep/queries", () => ({ getSleepEntries: mocks.entries }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => {
  const query = { select: () => query, eq: () => query, limit: async () => ({
    data: [{ name: "Synthetic entry", dose: "", times: ["08:00"] }], error: null
  }) };
  return { auth: { getUser: async () => ({ data: { user: { id: "synthetic" } } }) }, from: () => query };
} }));

import { getSleepAdvice } from "@/lib/sleep/actions";
import { getTimingAdvice } from "@/lib/supplements/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.entries.mockResolvedValue({ status: "ready", entries: [{
    id: "synthetic", sleptOn: "2026-09-09", durationMinutes: 480,
    bedtime: "23:00", wakeTime: "07:00", quality: 3, awakenings: 0,
    note: null, source: "manual", device: null
  }] });
});

describe("specialized advice uses the same response boundary", () => {
  for (const locale of ["ru", "en"] as const) {
    for (const [name, action] of [["sleep", getSleepAdvice], ["timing", getTimingAdvice]] as const) {
      const run = () => {
        mocks.locale = locale;
        const form = new FormData(); form.set("locale", locale);
        return action({ status: "idle", advice: "", message: "" }, form);
      };
      it(`${name} rejects formatting-only output in ${locale}`, async () => {
        mocks.provider.mockResolvedValue({ status: "ok", reply: "---\n***" });
        const result = await run();
        expect(result.status).toBe("error");
        expect(result.advice).toBe("");
        expect(result.message).toBe(locale === "ru"
          ? "Ассистент не смог ответить. Попробуйте ещё раз."
          : "The assistant could not answer. Please try again.");
      });
      it(`${name} preserves numbers and localizes annotations in ${locale}`, async () => {
        mocks.provider.mockResolvedValue({ status: "ok", reply: "~~5 mg~~\n- .5 mg/L\n> 5*10^9/L" });
        const result = await run();
        expect(result.status).toBe("success");
        expect(result.advice).toBe(`${locale === "ru" ? "(зачёркнуто: 5 mg)" : "(struck out: 5 mg)"}\n- .5 mg/L\n> 5*10^9/L`);
      });
      it(`${name} keeps provider failures as errors in ${locale}`, async () => {
        mocks.provider.mockResolvedValue({ status: "error", code: "emptyReply", message: "Provider diagnostics" });
        const result = await run();
        expect(result.status).toBe("error");
        expect(result.advice).toBe("");
        expect(result.message).not.toContain("Provider diagnostics");
        expect(/[а-яё]/i.test(result.message)).toBe(locale === "ru");
      });
    }
  }
});
