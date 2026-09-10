import { describe, expect, it, vi } from "vitest";
const source = vi.hoisted(() => ({
  review: { id: "synthetic", draft: "~~5 mg~~\n> .5 mg/L", summary: "**Needs review**", documents_fingerprint: "v1" },
  approved: "**Human decision** — unchanged"
}));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => {
  const query = {
    select: () => query, eq: () => query, order: () => query,
    maybeSingle: async () => ({ data: source.review, error: null }),
    limit: async () => ({ data: [
      { ai_draft: source.review.draft, approved_text: source.approved, approved_at: "2026-09-09" },
      { ai_draft: "different draft", approved_text: "unrelated", approved_at: "2026-09-08" }
    ] })
  };
  return { from: () => query };
} }));
import { getCaseReview } from "@/lib/cases/review-queries";

describe("review presentation does not change approval identity", () => {
  it.each(["ru", "en"] as const)("projects %s prose but matches the raw draft and preserves the human decision", async (locale) => {
    const review = await getCaseReview("synthetic", [], locale);
    expect(review?.draft).toBe(`${locale === "ru" ? "(зачёркнуто: 5 mg)" : "(struck out: 5 mg)"}\n> .5 mg/L`);
    expect(review?.approvalCount).toBe(1);
    expect(review?.approvedText).toBe(source.approved);
    expect(source.review.draft).toBe("~~5 mg~~\n> .5 mg/L");
  });
});
