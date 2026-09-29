import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseAnalyticalPicturePanel } from "@/components/cases/CaseAnalyticalPicturePanel";
import { buildCaseAnalyticalPicture, type PictureFact } from "@/lib/analytical-picture";

const hash = "a".repeat(64);
const result: PictureFact = {
  id: "result-1", documentId: "document-1", observedAt: "2026-09-20",
  label: "Result", originalValue: "1.2 mg/L", originalUnit: null,
  canonicalValue: 1.2, canonicalUnit: "mg/L", reference: "0.0 - 5.0 mg/L",
  comparisonKey: "crp", trustState: "NEEDS_REVIEW", analysisRunId: "run-1",
  comparisonContext: { specimen: "Serum", method: "Immunoturbidimetry" },
  provenance: { level: "PAGE", page: 1, sourceHash: hash,
    excerpt: "Result | 1.2 mg/L | 0.0 - 5.0 mg/L",
    related: { page: 1, sourceHash: hash, excerpt: "Test | C-reactive protein (CRP) | -" } },
};

function render(locale: "ru" | "en", fact = result) {
  const picture = buildCaseAnalyticalPicture({
    caseId: "case-1", documents: [{ id: "document-1", name: "synthetic.pdf", status: "ready", createdAt: "2026-09-20", identityStatus: "unknown" }],
    facts: [fact], trends: {}, blocked: [], requests: [], excluded: [], notes: [], analysisRunId: "run-1", analysisCurrent: true,
  });
  return renderToStaticMarkup(<CaseAnalyticalPicturePanel caseId="case-1" locale={locale} result={{ status: "ready", picture }} canConfirm={false} />);
}

describe("Case timeline source label", () => {
  it("shows the separately anchored test line without replacing the printed Result label in both languages", () => {
    for (const [locale, caption] of [["ru", "Связанная строка источника"], ["en", "Related source line"]] as const) {
      const html = render(locale);
      expect(html).toContain(`<strong>Result</strong>: 1.2 mg/L`);
      expect(html).toContain(`${caption}: Test | C-reactive protein (CRP) | -`);
    }
  });

  it("does not show a related label from a different source hash", () => {
    const html = render("ru", { ...result, provenance: { ...result.provenance, related: { page: 1, sourceHash: "b".repeat(64), excerpt: "Test | wrong marker" } } });
    expect(html).not.toContain("Test | wrong marker");
  });

  it("marks matching values with unsettled context in both languages", () => {
    for (const [locale, caption] of [["ru", "Контекст требует проверки"], ["en", "Context requires review"]] as const) {
      const html = render(locale, {...result, trustState:"SOURCE_ONLY",comparisonContext:{specimen:null,method:"Immunoturbidimetry",review_required:true}});
      expect(html).toContain(caption);
      expect(html).toContain(locale === "ru" ? "только источник" : "source only");
    }
  });
});
