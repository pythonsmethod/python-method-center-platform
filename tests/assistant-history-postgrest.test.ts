import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

const f = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: f.db }));
import { saveAssistantExchange } from "@/lib/assistant/history";

afterEach(() => vi.useRealTimers());

describe("assistant history through the real PostgREST client", () => {
  it.each(["2026-09-09T17:20:00.000Z", undefined])("stores both timestamps with question time %s", async questionCreatedAt => {
    const answerTime = "2026-09-09T17:21:00.000Z";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(answerTime));
    const transport = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const request = new URL(String(url));
      expect(init?.method).toBe("POST");
      expect(request.pathname).toBe("/rest/v1/assistant_messages");
      const rows = JSON.parse(String(init?.body)) as { id: string; role: string; content: string; created_at?: string; locale: string }[];
      // Model the database NOT NULL constraint on the actual serialized SDK
      // payload: bulk columns include created_at, so a missing key becomes NULL.
      if (request.searchParams.get("columns")?.includes("created_at") && rows.some(row => !row.created_at)) {
        return Response.json({ code: "23502", message: "created_at must not be null" }, { status: 400 });
      }
      expect(rows[0].created_at).toBe(questionCreatedAt ?? answerTime);
      expect(rows[1].created_at).toBe(answerTime);
      return Response.json(rows.map((row, i) => ({ ...row, message_sequence: 101 + i })), { status: 201 });
    });
    f.db.mockReturnValue(createClient("https://history-test.supabase.co", "synthetic-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: transport }
    }));
    const result = await saveAssistantExchange({
      profileId: "owner", caseId: null, tier: "founder", question: "Synthetic question",
      answer: "Synthetic answer", locale: "ru", questionCreatedAt
    });
    expect(result.saved).toBe(true);
    expect(result.messages?.map(row => row.message_sequence)).toEqual([101, 102]);
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
