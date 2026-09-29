import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildCaseAnalyticalPicture, type ExtractedClinicalEvidence, type PictureFact } from "@/lib/analytical-picture/case-picture";
import { enrichPictureWithCatalog } from "@/lib/analytical-picture/catalog-enrichment";
import { DiagnosticCatalogDetails } from "@/components/cases/DiagnosticCatalogDetails";
import { CaseAnalyticalPicturePanel } from "@/components/cases/CaseAnalyticalPicturePanel";
const mock = vi.hoisted(() => ({ service: vi.fn(), fingerprint: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mock.service }));
vi.mock("@/lib/cases/evidence-fingerprint", () => ({ caseEvidenceFingerprint: mock.fingerprint }));
import { getCaseAnalyticalPicture } from "@/lib/analytical-picture/queries";

const hash = "a".repeat(64);
beforeEach(() => { vi.clearAllMocks(); mock.fingerprint.mockResolvedValue("synthetic-fingerprint"); });
const fact: PictureFact = {
  id: "synthetic-fact", documentId: "synthetic-document", observedAt: "2026-09-20", label: "Result", originalValue: "1.2 mg/L", originalUnit: null, sourceUnit: "mg/L",
  canonicalValue: 1.2, canonicalUnit: "mg/L", reference: "0.0 - 5.0 mg/L", comparisonKey: "crp", trustState: "NEEDS_REVIEW", analysisRunId: "synthetic-run",
  provenance: { level: "PAGE", page: 1, sourceHash: hash, excerpt: "Result | 1.2 mg/L | 0.0 - 5.0 mg/L", related: { page: 1, sourceHash: hash, excerpt: "Test | C-reactive protein (CRP) | -" } },
};
const evidence: ExtractedClinicalEvidence = {
  id: "synthetic-evidence", documentId: "synthetic-document", section: "Laboratory", label: "Test", value: "LOINC: 1988-5", alternateValue: null,
  category: "UNKNOWN", trustState: "SOURCE_ONLY", disputeReason: null, provenance: { level: "PAGE", page: 1, sourceHash: hash },
  priority: "IMPORTANT", reviewDecision: "PENDING", correction: null,
};
function picture(facts = [fact], rows = [evidence]) {
  return buildCaseAnalyticalPicture({ caseId: "synthetic-case", documents: [{ id: "synthetic-document", name: "synthetic.pdf", status: "ready", createdAt: "2026-09-20", identityStatus: "unknown" }], facts, extractedEvidence: rows, trends: {}, blocked: [], requests: [], excluded: [], notes: [], analysisRunId: "synthetic-run", analysisCurrent: true });
}

describe("PMC projection of NEXORA catalog reference data", () => {
  it("enriches an anchored Test/Result pair while preserving values, sources, trust and review state", () => {
    const original = picture(), before = structuredClone(original), result = enrichPictureWithCatalog(original);
    expect(original).toEqual(before);
    expect(result.timeline[0].catalog).toMatchObject({ state: "candidates", query: "C-reactive protein (CRP)", assignedStandardCode: null, unit: { original: "mg/L", conversionPerformed: false } });
    expect(Object.fromEntries(Object.entries(result.timeline[0]).filter(([key]) => key !== "catalog"))).toEqual(fact);
    expect(result.comparisons).toEqual(before.comparisons);
    expect(result.reviewSummary).toEqual(before.reviewSummary);
    expect(result.extractedEvidence[0].catalog?.state).toBe("declared_code_found");
    expect(result.primaryEvidence[0]).toBe(result.extractedEvidence[0]);
  });
  it.each([
    { page: 1, sourceHash: "b".repeat(64), excerpt: "Test | LOINC 1988-5 | -" },
    { page: 2, sourceHash: hash, excerpt: "Test | LOINC 1988-5 | -" },
  ])("does not use a related name from another hash or page", related => {
    const result = enrichPictureWithCatalog(picture([{ ...fact, provenance: { ...fact.provenance, related } }]));
    expect(result.timeline[0].catalog?.query).toBe("Result");
    expect(result.timeline[0].catalog?.queryBasis).toBe("source_name");
  });
  it("does not use a disputed Test value even when its alternate reading is null", () => {
    const row = { ...evidence, trustState: "NEEDS_REVIEW" as const, disputeReason: "missing second reading", reviewDecision: "CORRECTED" as const, correction: "Karen correction" };
    const result = enrichPictureWithCatalog(picture([], [row]));
    expect(result.extractedEvidence[0].catalog?.query).toBe("Test");
    expect(result.extractedEvidence[0].reviewDecision).toBe("CORRECTED");
    expect(result.extractedEvidence[0].correction).toBe("Karen correction");
    expect(result.primaryEvidence[0]).toBe(result.extractedEvidence[0]);
  });
  it("uses the existing Russian PMC alias only as a visible search hint", () => {
    const result = enrichPictureWithCatalog(picture([{ ...fact, label: "С-реактивный белок" }]));
    expect(result.timeline[0].label).toBe("С-реактивный белок");
    expect(result.timeline[0].catalog).toMatchObject({ state: "candidates", query: "С-реактивный белок", queryBasis: "pmc_name_alias", assignedStandardCode: null });
  });
  it("keeps the picture available with an explicit catalog failure", () => {
    const original = picture();
    const result = enrichPictureWithCatalog(original, () => { throw new Error("unavailable"); });
    expect(result.timeline[0].catalog?.state).toBe("unavailable");
    expect(result.extractedEvidence[0].catalog?.state).toBe("unavailable");
    expect(result.timeline[0].originalValue).toBe("1.2 mg/L");
    expect(result.reviewSummary).toEqual(original.reviewSummary);
  });
  it("renders the candidate and unknown states in both UI locales without review buttons", () => {
    const known = enrichPictureWithCatalog(picture([], [evidence])).extractedEvidence[0].catalog;
    const unknown = enrichPictureWithCatalog(picture([{ ...fact, label: "SYNTHETIC-UNKNOWN-ZZQ" }])).timeline[0].catalog;
    for (const locale of ["ru", "en"] as const) {
      const html = renderToStaticMarkup(<DiagnosticCatalogDetails result={known} locale={locale} />);
      expect(html).toContain(locale === "ru" ? "Справочник исследований" : "Diagnostic catalog");
      expect(html).toContain("1988-5");
      expect(html).toContain("Regenstrief");
      expect(html).not.toContain("<button");
      const empty = renderToStaticMarkup(<DiagnosticCatalogDetails result={unknown} locale={locale} />);
      expect(empty).toContain(locale === "ru" ? "Это не означает, что исследования не существует" : "This does not mean the test does not exist");
      expect(empty).toContain("SYNTHETIC-UNKNOWN-ZZQ");
      const full = renderToStaticMarkup(<CaseAnalyticalPicturePanel caseId="synthetic-case" locale={locale} result={{ status: "ready", picture: enrichPictureWithCatalog(picture()) }} canConfirm={false} />);
      expect(full).toContain("<strong>Result</strong>: 1.2 mg/L");
      expect(full).toContain("1988-5");
      expect(full).toContain(locale === "ru" ? "Справочник исследований" : "Diagnostic catalog");
    }
  });
  it("reads a scoped stored extraction through the actual query adapter and guards snapshot changes", async () => {
    const rows: Record<string, unknown[]> = {
      uploaded_documents: [{ id: "synthetic-document", original_filename: "synthetic.pdf", document_status: "ready", created_at: "2026-09-20" }],
      lab_values: [{ id: "synthetic-fact", document_id: "synthetic-document", label_original: "LOINC: 1988-5", value_original: "1.2", value_printed: "1.2 mg/L", unit_original: "mg/L", value_canonical: null, unit_resolution_method: "unresolved", source_anchor: { page: 1, sourceHash: hash } }],
      admin_notes: [],
      document_extractions: [{ id: "synthetic-extraction", document_id: "synthetic-document", extracted_at: "2026-09-20", agreed_values: [{ file: "synthetic.pdf", section: "Laboratory", label: "Test", value: "LOINC: 1988-5", reference: "", referenceConfirmed: false, confident: true, note: "" }], disputed_values: [] }],
    };
    const filters: Array<[string, string, unknown]> = [];
    mock.service.mockReturnValue({ from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: (key: string, value: unknown) => { filters.push([table, key, value]); return builder; },
        is: () => builder, order: () => builder, limit: () => builder,
        range: async () => ({ data: rows[table] ?? [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return builder;
    } });
    const result = await getCaseAnalyticalPicture("synthetic-case");
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected synthetic picture");
    expect(result.picture.timeline[0]).toMatchObject({ originalValue: "1.2 mg/L", originalUnit: null, sourceUnit: "mg/L", trustState: "SOURCE_ONLY", catalog: { state: "declared_code_found", assignedStandardCode: null, unit: { original: "mg/L" } } });
    expect(result.picture.extractedEvidence[0].catalog?.state).toBe("declared_code_found");
    expect(filters).toHaveLength(5);
    expect(filters.every(([, key, value]) => key === "case_id" && value === "synthetic-case")).toBe(true);
    mock.fingerprint.mockResolvedValueOnce("before").mockResolvedValueOnce("after");
    expect(await getCaseAnalyticalPicture("synthetic-case")).toEqual({ status: "unavailable", message: "CASE_PICTURE_CHANGED_DURING_READ" });
  });
});
