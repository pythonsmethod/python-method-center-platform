import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn(), upsert: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.db }));
import { saveLiveBackgroundAnswer } from "@/lib/assistant/history";

beforeEach(() => {
  vi.resetAllMocks();
  const lookup = { eq: mocks.eq, maybeSingle: mocks.maybeSingle };
  mocks.eq.mockReturnValue(lookup);
  mocks.select.mockReturnValue(lookup);
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.db.mockReturnValue({ from: () => ({ upsert: mocks.upsert, select: mocks.select }) });
});

describe("Live background history", () => {
  it("stores one assistant answer in the original private conversation", async () => {
    const saved = await saveLiveBackgroundAnswer({
      profileId: "00000000-0000-4000-8000-000000000001",
      caseId: null,
      tier: "founder",
      locale: "ru",
      conversationScope: "founder",
      exchangeId: "live-background:session_1:task_1",
      answer: "Найдено 12 оплат.",
    });
    expect(saved).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      role: "assistant",
      source: "text",
      conversation_scope: "founder",
      exchange_id: "live-background:session_1:task_1",
      content: "Найдено 12 оплат.",
    }), { onConflict: "profile_id,exchange_id,role", ignoreDuplicates: true });
  });

  it("rejects an untrusted exchange id before touching storage", async () => {
    expect(await saveLiveBackgroundAnswer({
      profileId: "owner", caseId: null, tier: "founder", locale: "en", conversationScope: "founder",
      exchangeId: "external-task", answer: "Result",
    })).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
