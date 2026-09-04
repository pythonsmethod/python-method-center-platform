import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCaseAnalyticalPicture, type PictureInput } from "@/lib/analytical-picture";
import { canSavePictureNote } from "@/lib/analytical-picture/review-policy";

const document = { id: "doc-a", name: "synthetic.pdf", status: "ready", createdAt: "2026-01-01", identityStatus: "match" };
const fact = (id: string, date: string | null, unit = "mg/L") => ({
  id, documentId: "doc-a", observedAt: date, label: "Synthetic marker", originalValue: "10", originalUnit: unit,
  canonicalValue: 10, canonicalUnit: unit, reference: "5-15", comparisonKey: "marker", trustState: "NEEDS_REVIEW" as const,
  provenance: { level: "DOCUMENT" as const, page: null },
  analysisRunId: "run-current",
});
const base = (overrides: Partial<PictureInput> = {}): PictureInput => ({ caseId: "case-a", documents: [document], facts: [fact("f1", "2026-01-01")], trends: {}, blocked: [], requests: [], excluded: [], notes: [], analysisRunId: "run-current", analysisCurrent: true, ...overrides });

describe("live Case Analytical Picture", () => {
  it("keeps every live fact review-required and document-grounded", () => {
    const picture = buildCaseAnalyticalPicture(base());
    expect(picture.timeline[0]).toMatchObject({ trustState: "NEEDS_REVIEW", provenance: { level: "DOCUMENT", page: null } });
    expect(picture.reviewQueue).toHaveLength(1);
  });

  it("orders dated facts and leaves an undated fact visible at the end", () => {
    const picture = buildCaseAnalyticalPicture(base({ facts: [fact("new", "2026-03-01"), fact("none", null), fact("old", "2025-12-01")] }));
    expect(picture.timeline.map((item) => item.id)).toEqual(["old", "new", "none"]);
    expect(picture.missingContext).toContainEqual({ code: "MISSING_DATES" });
  });

  it("never turns a significant machine comparison into a confirmed clinical change", () => {
    const picture = buildCaseAnalyticalPicture(base({ facts: [fact("f1", "2026-01-01"), fact("f2", "2026-02-01")], trends: { marker: { analyte: "marker", verdict: "significant", reason: null, versus_previous: { delta_percent: 20, rcv_used: 10, rcv_source: "default", is_significant: true, points_used: 2 }, versus_baseline: null, latest_within_reference: true, direction: null, reference_breaks: [] } } }));
    expect(picture.comparisons[0]).toMatchObject({ verdict: "POTENTIAL_CHANGE", reasonCode: "SIGNIFICANT_THRESHOLD", reviewRequired: true, evidenceFactIds: ["f1", "f2"] });
  });

  it("preserves unit/date non-comparability and missing context", () => {
    const picture = buildCaseAnalyticalPicture(base({ facts: [fact("f1", "2026-01-01", "mg/L"), fact("f2", "2026-02-01", "g/L")], trends: { marker: { analyte: "marker", verdict: "not_comparable", reason: "Different units", versus_previous: null, versus_baseline: null, latest_within_reference: null, direction: null, reference_breaks: [0] } }, requests: ["Confirm collection conditions"] }));
    expect(picture.comparisons[0]).toMatchObject({ verdict: "NOT_COMPARABLE", reasonCode: "UNIT_MISMATCH" });
    expect(picture.missingContext).toContainEqual({ code: "ANALYSIS_REQUESTS", count: 1 });
  });

  it("rejects a fact whose source document is outside the Case", () => {
    expect(() => buildCaseAnalyticalPicture(base({ facts: [{ ...fact("foreign", "2026-01-01"), documentId: "doc-other" }] }))).toThrow("another Case");
  });

  it("refuses stale and source-less run conclusions", () => {
    const trend = { marker: { analyte: "marker", verdict: "significant" as const, reason: null, versus_previous: null, versus_baseline: null, latest_within_reference: null, direction: null, reference_breaks: [] } };
    expect(buildCaseAnalyticalPicture(base({ trends: trend, analysisCurrent: false })).comparisons[0]).toMatchObject({ verdict: "INSUFFICIENT_DATA", reasonCode: "STALE_ANALYSIS" });
    expect(buildCaseAnalyticalPicture(base({ trends: trend, facts: [{ ...fact("other-run", "2026-01-01"), analysisRunId: "run-old" }] })).comparisons[0]).toMatchObject({ verdict: "INSUFFICIENT_DATA", reasonCode: "INSUFFICIENT_EVIDENCE", evidenceFactIds: [] });
  });

  it("allows staff drafts but reserves confirmed notes for Karen", () => {
    expect(canSavePictureNote({ isStaff: true, isKaren: false, state: "draft" })).toBe(true);
    expect(canSavePictureNote({ isStaff: true, isKaren: false, state: "confirmed" })).toBe(false);
    expect(canSavePictureNote({ isStaff: true, isKaren: true, state: "confirmed" })).toBe(true);
    expect(canSavePictureNote({ isStaff: false, isKaren: false, state: "draft" })).toBe(false);
  });

  it("scopes every adapter source to the requested Case and stores notes internally", () => {
    const query = readFileSync("lib/analytical-picture/queries.ts", "utf8");
    const action = readFileSync("lib/analytical-picture/actions.ts", "utf8");
    expect(query.match(/\.eq\("case_id", caseId\)/g)?.length).toBe(4);
    expect(query).toContain('.contains("metadata", { kind: "case_picture_review" })');
    expect(action).toContain('visibility: "karen_and_admin"');
    expect(action).toContain('resolvePrivateAssistantRole(auth.email) === "karen"');
    expect(action).not.toContain("case_messages");
  });

  it("ships both Russian and English visible copy", () => {
    const component = readFileSync("components/cases/CaseAnalyticalPicturePanel.tsx", "utf8");
    expect(component).toContain("Целостная картина кейса");
    expect(component).toContain("Whole-case picture");
    expect(component).toContain("Это не диагноз");
    expect(component).toContain("It is not a diagnosis");
  });
});
