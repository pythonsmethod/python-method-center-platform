import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRequeueRecords } from "@/lib/documents/reprocessing";
import { getReprocessingCopy } from "@/lib/documents/reprocessing-copy";

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
    expect(ru.description).toContain("Исходные документы не изменятся");
    expect(en.description).toContain("Source documents will not be changed");
  });

  it("routes a staff-triggered run through a Case-scoped queue claim", () => {
    const route = readFileSync("app/api/documents/process/route.ts", "utf8");
    const processing = readFileSync("lib/documents/processing.ts", "utf8");

    expect(route).toContain("processNextCaseDocument(caseId)");
    expect(route).toContain("canAccessProfessorMessages(staff.email)");
    expect(processing).toContain('.eq("case_id", caseId)');
    expect(processing).toContain('.eq("status", "queued")');
    expect(processing).toMatch(/\.eq\("status", "queued"\)\r?\n\s+\.select/);
  });
});
