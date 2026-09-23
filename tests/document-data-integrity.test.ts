import { describe, expect, it } from "vitest";
import { parseMetadata, toIsoDate } from "@/lib/assistant/metadata";
import { relateDocument } from "@/lib/analysis/identity";
import { runAnalysis } from "@/lib/analysis/pipeline";
import { prepareEvidenceForKaren } from "@/lib/analytical-picture/evidence-presentation";
import { projectStoredExtractionEvidence } from "@/lib/analytical-picture/queries";
import { buildCaseAnalyticalPicture, type ExtractedClinicalEvidence } from "@/lib/analytical-picture/case-picture";

// Newly authored synthetic inputs only. No saved Case, OCR response or real corpus.
const evidence = (id: string, value: string | null, extra: Partial<ExtractedClinicalEvidence> = {}): ExtractedClinicalEvidence => ({
  id, documentId: "synthetic-document", section: "Laboratory", label: "Synthetic marker", value,
  alternateValue: null, category: "UNKNOWN", trustState: "NEEDS_REVIEW",
  disputeReason: "прочитано только один раз", provenance: { level: "DOCUMENT", page: null },
  priority: "SUPPORTING", reviewDecision: "PENDING", correction: null, ...extra,
});

describe("document data integrity: evidence presentation", () => {
  it.each([
    ["5 mg/L", "5 g/L"],
    ["5 mg/L", "5 mg/dL"],
    ["5 [mg/L]", "5 [g/L]"],
    ["5", "5 mg/L"],
    ["5", "<5"],
    ["<5", "≤5"],
    ["-5", "5"],
    ["5 10^9/L", "5 10^12/L"],
    ["5 mmol/L", "5 µmol/L"],
    ["5 mM", "5 MM"],
  ])("retains both readings and uncertainty: %s versus %s", (first, second) => {
    const source = [evidence("first", first), evidence("second", second)];
    const prepared = prepareEvidenceForKaren(source);
    expect(prepared).toEqual(source);
    expect(source.every((item) => item.trustState === "NEEDS_REVIEW")).toBe(true);
  });

  it("does not treat identical independent row IDs as independent verification", () => {
    const rows = [evidence("row-1", "5 mg/L"), evidence("row-2", "5 mg/L")];
    expect(prepareEvidenceForKaren(rows)).toEqual(rows);
    // A repeated occurrence of the exact same source row may be shown once.
    expect(prepareEvidenceForKaren([rows[0], rows[0]])).toEqual([rows[0]]);
  });

  it("does not clear poor-reading or partial-source reasons when text matches", () => {
    for (const reason of ["чтение неуверенное", "источник виден не полностью"]) {
      const row = evidence("row", "5 mg/L", { alternateValue: "5 mg/L", disputeReason: reason });
      expect(prepareEvidenceForKaren([row])).toEqual([row]);
    }
  });

  it("retains both versions of a generic note with its original review identity", () => {
    const row = evidence("note", "Synthetic statement A", {
      section: "Note", label: "Text", alternateValue: "Synthetic statement B", disputeReason: "разные значения",
    });
    expect(prepareEvidenceForKaren([row])).toEqual([row]);
  });

  it("keeps review decisions attached to their own rows without hiding a pending row", () => {
    const pending = evidence("pending", "5 mg/L");
    const corrected = evidence("corrected", "5 mg/L", { reviewDecision: "CORRECTED", correction: "5 g/L" });
    expect(prepareEvidenceForKaren([pending, corrected])).toEqual([pending, corrected]);
  });

  it("preserves different snapshots, reasons and decisions even for a repeated row ID", () => {
    const original = evidence("same-id", "5 mg/L");
    const changed = evidence("same-id", "5 mg/L", { disputeReason: "источник виден не полностью" });
    expect(prepareEvidenceForKaren([original, changed])).toEqual([original, changed]);
  });

  it("keeps stored unit conflicts in Karen's exception queue after projection", () => {
    const projected = projectStoredExtractionEvidence({ id: "synthetic-extraction", documentId: "synthetic-document", agreed: [], disputed: [
      { file: "synthetic.pdf", section: "Laboratory", label: "Synthetic marker", first: "5 mg/L", second: null, reason: "прочитано только один раз", note: "" },
      { file: "synthetic.pdf", section: "Laboratory", label: "Synthetic marker", first: null, second: "5 g/L", reason: "прочитано только один раз", note: "" },
    ] }, new Set(["synthetic-document"]));
    const before = structuredClone(projected);
    const picture = buildCaseAnalyticalPicture({
      caseId: "new-synthetic-case", documents: [{ id: "synthetic-document", name: "synthetic.pdf", status: "ready", createdAt: "2026-09-23", identityStatus: "unknown" }],
      facts: [], extractedEvidence: prepareEvidenceForKaren(projected), trends: {}, blocked: [], requests: [], excluded: [], notes: [], analysisRunId: null, analysisCurrent: false,
    });
    expect(picture.reviewSummary).toMatchObject({ required: 2, completed: 0, machineMatched: 0 });
    expect(picture.primaryEvidence.map((item) => item.id)).toEqual(projected.map((item) => item.id));
    expect(projected).toEqual(before);
  });
});

describe("document data integrity: printed dates", () => {
  it.each(["09/10/2026", "10/09/2026", "09.10.2026", "09-10-2026"])("leaves ambiguous date %s unresolved", (printed) => {
    expect(toIsoDate(printed)).toBeNull();
  });

  it.each([
    ["2026-09-10", "2026-09-10"],
    ["23/09/2026", "2026-09-23"],
    ["09/23/2026", "2026-09-23"],
    ["23.09.2026", "2026-09-23"],
    ["09/09/2026", "2026-09-09"],
    ["29/02/2024", "2024-02-29"],
  ])("normalizes only a unique valid interpretation: %s", (printed, expected) => {
    expect(toIsoDate(printed)).toBe(expected);
  });

  it.each(["31.02.2026", "29/02/2026", "13/14/2026", "00/10/2026", "2026-02-30", "109/10/2026", "09/10/20260", "09/10.2026", "2026-09-10 / 2026-10-09", "09/10/2026 or 23/09/2026"])("never extracts a plausible substring from %s", (printed) => {
    expect(toIsoDate(printed)).toBeNull();
  });

  it("preserves all three printed dates in the saved JSON header without language-based guessing", () => {
    for (const language of ["русский", "English"]) {
      const header = parseMetadata(`ДАТА РОЖДЕНИЯ: 09/10/1980\nДАТА ЗАБОРА: 09/10/2026\nДАТА ОТЧЁТА: 10/11/2026\nЯЗЫК: ${language}`);
      expect(JSON.parse(JSON.stringify(header))).toMatchObject({
        birthDate: null, birthDatePrinted: "09/10/1980", collectionDate: null, collectionDatePrinted: "09/10/2026",
        reportDate: null, reportDatePrinted: "10/11/2026", language,
      });
    }
  });

  it("does not attach an ambiguous date to lab values or infer a corrected version from it", () => {
    const header = parseMetadata("ЛАБОРАТОРИЯ: Synthetic lab\nДАТА ЗАБОРА: 09/10/2026");
    const run = runAnalysis({ documents: [{ documentId: "synthetic-document", collectionDate: header.collectionDate,
      agreed: [{ label: "CRP", value: "5 mg/L", reference: "0-10", referenceConfirmed: true }],
    }], prior: [], questionnaire: null, extractionModelVersion: "synthetic-test" });
    expect(run.labValues).toHaveLength(1);
    expect(run.labValues[0].measured_on).toBeNull();
    expect(relateDocument({ fingerprint: "new-source", header }, [{
      documentId: "other-synthetic-document", fingerprint: "different-source",
      header: parseMetadata("ЛАБОРАТОРИЯ: Synthetic lab\nДАТА ЗАБОРА: 2026-10-09"),
    }])).toEqual({ kind: "new" });
  });
});
