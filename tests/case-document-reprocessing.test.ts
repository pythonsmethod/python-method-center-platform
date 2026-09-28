import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRequeueRecords } from "@/lib/documents/reprocessing";
import { getReprocessingCopy } from "@/lib/documents/reprocessing-copy";
import { drainCaseReprocessing, type ReprocessingStep } from "@/lib/documents/reprocessing-progress";

describe("staff Case document reprocessing", () => {
  it("resets only derived processing state for the selected documents", () => {
    const records = buildRequeueRecords({
      caseId: "11111111-1111-4111-8111-111111111111",
      profileId: "22222222-2222-4222-8222-222222222222",
      documentIds: ["doc-a", "doc-b"],
      now: "2026-09-06T12:00:00.000Z"
    });

    expect(records).toHaveLength(2);
    expect(records.every((record) => record.status === "queued")).toBe(true);
    expect(records.every((record) => record.attempts === 0)).toBe(true);
    expect(records.every((record) => record.locked_at === null)).toBe(true);
    expect(records.map((record) => record.document_id)).toEqual(["doc-a", "doc-b"]);
  });

  it("has complete Russian and English operator copy", () => {
    const ru = getReprocessingCopy("ru");
    const en = getReprocessingCopy("en");

    expect(ru.button).toContain("Перечитать");
    expect(en.button).toContain("Reprocess");
    expect(ru.confirmButton).toContain("Да");
    expect(en.confirmButton).toContain("Yes");
    expect(ru.resumeButton(5)).toContain("5");
    expect(en.resumeButton(5)).toContain("5");
    expect(ru.resumeDescription).toContain("не перечитывает готовые");
    expect(en.resumeDescription).toContain("does not reprocess completed");
    expect(ru.pendingReview(1, 3)).toContain("1 из 3");
    expect(en.pendingReview(1, 3)).toContain("1 of 3");
    expect(ru.description).toContain("Исходные документы не изменятся");
    expect(en.description).toContain("Source documents will not be changed");
  });

  it("counts completed files, not page checkpoints, and permits a bounded resume", async () => {
    const steps: ReprocessingStep[] = ["continued", "continued", "ready", "continued", "ready"];
    const seen: number[] = [];
    const first = await drainCaseReprocessing(2, async () => steps.shift()!, count => seen.push(count), () => false, 4);
    expect(first).toEqual({ outcome: "pending", ready: 1, requests: 4 });
    expect(seen).toEqual([1]);
    const second = await drainCaseReprocessing(1, async () => steps.shift()!, count => seen.push(count));
    expect(second).toEqual({ outcome: "ready", ready: 1, requests: 1 });
    expect(seen).toEqual([1, 1]);
  });

  it("stops on a scheduled retry or a source that needs human attention", async () => {
    expect(await drainCaseReprocessing(2, async () => "retrying", () => {}))
      .toEqual({ outcome: "pending", ready: 0, requests: 1 });
    expect(await drainCaseReprocessing(2, async () => "identity_mismatch", () => {}))
      .toEqual({ outcome: "attention", ready: 0, requests: 1 });
  });

  it("routes a staff-triggered run through a Case-scoped queue claim", () => {
    const route = readFileSync("app/api/documents/process/route.ts", "utf8");
    const processing = readFileSync("lib/documents/processing.ts", "utf8");

    expect(route).toContain("processNextCaseDocument(caseId)");
    expect(route).toContain("canAccessProfessorMessages(staff.email)");
    expect(processing).toContain("p_case_id: scope.caseId ?? null");
    const sql = readFileSync("supabase/migrations/20260924012755_pmc_document_chain.sql", "utf8");
    expect(sql).toContain("j.status='queued'");
    expect(sql).toContain("for update of j skip locked");
  });
});
