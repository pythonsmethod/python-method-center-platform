import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rows: [] as Array<{ id: string; title: string; content: string; created_at: string }>, fail: false, ranges: [] as number[], filters: [] as unknown[] }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => {
  const query = {
    select: () => query,
    eq: (...args: unknown[]) => { state.filters.push(args); return query; },
    in: (...args: unknown[]) => { state.filters.push(args); return query; },
    order: () => query,
    range: async (start: number, end: number) => { state.ranges.push(start); return { data: state.rows.slice(start, end + 1), error: state.fail && start > 0 ? {} : null }; }
  };
  return { from: () => query };
} }));
import { searchKnowledgeArchive, knowledgeSearchTerms } from "@/lib/assistant/knowledge-search";
beforeEach(() => { state.rows = []; state.ranges = []; state.filters = []; state.fail = false; });
describe("whole knowledge archive search", () => {
  it("finds an old record beyond both the recent 40 and first two pages", async () => {
    state.rows = Array.from({ length: 451 }, (_, i) => ({ id: String(i), title: `Note ${i}`, content: i === 450 ? "Архивный протокол папирус" : "unrelated", created_at: "2026-01-01" }));
    const result = await searchKnowledgeArchive("Найди в архиве папирус");
    expect(result.context).toContain("Архивный протокол папирус");
    expect(result.matches).toBe(1);
    expect(state.ranges).toEqual([0, 200, 400]);
    expect(state.filters).toContainEqual(["is_active", true]);
    expect(state.filters).toContainEqual(["audience", ["staff", "both"]]);
  });
  it("ranks title matches and bounds supplied context", async () => {
    state.rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), title: i === 24 ? "Papyrus procedure" : "note", content: "papyrus ".repeat(900), created_at: "2026-01-01" }));
    const result = await searchKnowledgeArchive("Find papyrus");
    expect(result.context).toContain("Papyrus procedure");
    expect(result.context.length).toBeLessThan(24500);
    expect(result.matches).toBeLessThanOrEqual(12);
  });
  it("reports a failed later page instead of silently using a partial archive", async () => {
    state.rows = Array.from({ length: 201 }, (_, i) => ({ id: String(i), title: "papyrus", content: "note", created_at: "2026-01-01" }));
    state.fail = true;
    expect(await searchKnowledgeArchive("papyrus")).toEqual({ context: "", unavailable: true, matches: 0 });
  });
  it("handles RU/EN tokens, empty queries and no matches", async () => {
    expect(knowledgeSearchTerms("Найди ПАПИРУС и papyrus")).toEqual(["папирус", "papyrus"]);
    expect((await searchKnowledgeArchive("please find")).context).toBe("");
    expect((await searchKnowledgeArchive("missing")).matches).toBe(0);
  });
});
