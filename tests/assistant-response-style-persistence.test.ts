import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rows: [] as unknown[], insert: vi.fn(), provider: vi.fn(), upsert: vi.fn(), saved: {} as Record<string, unknown> }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/assistant/router", () => ({ askAssistantTeam: mocks.provider }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => {
  const query = {
    select: () => query, eq: () => query, order: () => query,
    limit: async () => ({ data: mocks.rows, error: null }),
    insert: mocks.insert,
    upsert: (value: Record<string, unknown>) => { mocks.saved = value; mocks.upsert(value); return query; },
    single: async () => ({ data: { id: "synthetic", ...mocks.saved }, error: null })
  };
  return { from: () => query };
} }));

import { getOwnAssistantHistory, saveAssistantExchange } from "@/lib/assistant/history";
import { generateMedicalDigest, listMedicalDigestIssues } from "@/lib/medical-digest/digest";

beforeEach(() => { vi.clearAllMocks(); mocks.rows = []; mocks.saved = {}; });

describe("stored prose stays separate from human input and source records", () => {
  it.each(["ru", "en"] as const)("preserves numbers and %s annotations through storage and reload", async (locale) => {
    const answer = "~~5 mg~~\n- .5 mg/L\n> 5*10^9/L";
    const expected = `${locale === "ru" ? "(зачёркнуто: 5 mg)" : "(struck out: 5 mg)"}\n- .5 mg/L\n> 5*10^9/L`;
    await saveAssistantExchange({ profileId: "synthetic", caseId: null, tier: "client", question: "source", answer, locale });
    const stored = mocks.insert.mock.calls[0][0][1];
    expect(stored.content).toBe(expected);
    mocks.rows = [stored];
    const history = await getOwnAssistantHistory("synthetic", locale);
    expect(history.status === "ready" && history.messages[0].content).toBe(expected);
  });

  it("uses field locales for numeric-only annotations in historical digests", async () => {
    mocks.rows = [{ id: "synthetic", articles: [{ summaryRu: "~~5 mg~~", summaryEn: "~~5 mg~~", title: "**Source**" }] }];
    const [issue] = await listMedicalDigestIssues();
    expect(issue.articles[0].summaryRu).toBe("(зачёркнуто: 5 mg)");
    expect(issue.articles[0].summaryEn).toBe("(struck out: 5 mg)");
    expect(issue.articles[0].title).toBe("**Source**");
  });

  it("normalizes only assistant history on write and read, without mutating old rows", async () => {
    const user = { id: "u", role: "user", content: "**original** — <3,2", message_sequence: 1 };
    const assistant = { id: "a", role: "assistant", content: "**Fact** — <3,2", message_sequence: 2 };
    mocks.rows = [assistant, user];
    await saveAssistantExchange({ profileId: "synthetic", caseId: null, tier: "client", question: user.content, answer: assistant.content, locale: "en" });
    const inserted = mocks.insert.mock.calls[0][0];
    expect(inserted[0].content).toBe(user.content);
    expect(inserted[1].content).toBe("Fact, <3,2");
    const history = await getOwnAssistantHistory("synthetic", "en");
    expect(history.status === "ready" && history.messages.map((row) => row.content)).toEqual([user.content, "Fact, <3,2"]);
    expect(assistant.content).toBe("**Fact** — <3,2");
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("parses digest JSON intact, then normalizes bilingual narrative fields only", async () => {
    const generated = Object.fromEntries(["summary", "significance", "limitations", "outcome", "evidence", "composition"].flatMap((key) => [
      [`${key}Ru`, "**Факт:** <0,05.\n\nГипотеза — требует проверки."],
      [`${key}En`, "**Fact:** <0.05.\n\nHypothesis — needs review."]
    ]));
    mocks.provider.mockResolvedValue({ status: "ok", reply: "```json\n" + JSON.stringify(generated) + "\n```" });
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ resultList: { result: [{
      title: "Source **literal** — title", abstractText: "Synthetic abstract; <0.05.", pmid: "123", doi: "10.123/a_b", journalTitle: "Synthetic Journal"
    }] } }), { headers: { "Content-Type": "application/json" } }));
    try {
      const issue = await generateMedicalDigest(new Date("2026-09-09T12:00:00Z"));
      expect(issue.articles).toHaveLength(1);
      const article = issue.articles[0];
      expect(article.summaryRu).toBe("Факт: <0,05.\n\nГипотеза, требует проверки.");
      expect(article.summaryEn).toBe("Fact: <0.05.\n\nHypothesis, needs review.");
      expect(article.title).toBe("Source **literal** — title");
      expect(article.doi).toBe("10.123/a_b");
      expect(article.sourceUrl).toBe("https://pubmed.ncbi.nlm.nih.gov/123/");
      expect(mocks.provider.mock.calls[0][0]).toContain("Preserve explicitly required machine JSON keys");

      mocks.rows = [{ id: "old", articles: [{ ...article, ...generated }], source_count: 1 }];
      const old = await listMedicalDigestIssues();
      expect(old[0].articles[0].summaryEn).toBe(article.summaryEn);
      expect(old[0].articles[0].title).toBe(article.title);
      expect(mocks.upsert).toHaveBeenCalledTimes(1);
    } finally { fetcher.mockRestore(); }
  });
});
