import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diffReviewText } from "@/lib/cases/review-diff";

describe("Professor Python review-learning history", () => {
  it("records unchanged, removed, and added text in order", () => {
    const diff = diffReviewText(
      "Первая строка.\nИИ предлагает убрать сахар.\nЗаключение ИИ.",
      "Первая строка.\nКарен объясняет связь показателей.\nУтверждённое заключение."
    );

    expect(diff.removed).toEqual([
      "ИИ предлагает убрать сахар.",
      "Заключение ИИ."
    ]);
    expect(diff.added).toEqual([
      "Карен объясняет связь показателей.",
      "Утверждённое заключение."
    ]);
    expect(diff.operations[0]).toEqual({ type: "unchanged", text: "Первая строка." });
  });

  it("stores the full before/after pair and immutable edit evidence", () => {
    const migration = readFileSync(
      "supabase/migrations/20260829050754_case_review_learning_history.sql",
      "utf8"
    );
    for (const field of [
      "ai_draft",
      "approved_text",
      "edit_operations",
      "removed_fragments",
      "added_fragments",
      "approved_by",
      "approved_at"
    ]) expect(migration).toContain(field);
    expect(migration).not.toMatch(/update\s+public\.case_review_learning_events/i);
  });

  it("requires an explicit Professor Python approval", () => {
    const action = readFileSync("lib/cases/review-actions.ts", "utf8");
    expect(action).toContain('resolvePrivateAssistantRole(auth.email) !== "karen"');
    expect(action).toContain('.from("case_review_learning_events").insert');
  });

  it("keeps prior document versions without showing them as the current approval", () => {
    const query = readFileSync("lib/cases/review-queries.ts", "utf8");
    expect(query).toContain('.eq("documents_fingerprint", data.documents_fingerprint)');
    expect(query).toContain("approval.ai_draft");
  });
});
