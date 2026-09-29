import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentTranslationPanel } from "@/components/cases/DocumentTranslationPanel";
import { buildCaseAnalyticalPicture, type ExtractedClinicalEvidence } from "@/lib/analytical-picture/case-picture";
import { parseDocumentTranslation, translationBatches, type TranslatedRow } from "@/lib/documents/translation";

const hash = "a".repeat(64);
const documentId = "00000000-0000-4000-8000-000000000001";
const caseId = "00000000-0000-4000-8000-000000000002";
const examples = [
  { language: "hy", label: "Գլյուկոզա", translation: "Глюкоза" },
  { language: "de", label: "Glukose", translation: "Глюкоза" },
  { language: "bg", label: "Глюкоза", translation: "Глюкоза" },
  { language: "ko", label: "포도당", translation: "Глюкоза" },
  { language: "fr-ch", label: "Glycémie", translation: "Гликемия" },
  { language: "it-ch", label: "Glicemia", translation: "Гликемия" },
  { language: "rm", label: "Glucosa", translation: "Глюкоза" },
  { language: "es", label: "Glucosa", translation: "Глюкоза" },
];

function evidence(index: number, page = 1): ExtractedClinicalEvidence {
  return { id: `extraction-agreed-${index}`, documentId, section: "Labor / Лаборатория", label: examples[index % examples.length].label,
    value: "5,4 mmol/L", alternateValue: null, category: "UNKNOWN", trustState: "SOURCE_ONLY", disputeReason: null,
    priority: "SUPPORTING", reviewDecision: "PENDING", correction: null, reviewToken: `${index}`,
    provenance: { level: "PAGE", page, sourceHash: hash, excerpt: examples[index % examples.length].label } };
}

function response(rows: ExtractedClinicalEvidence[]): string {
  return JSON.stringify({ translations: rows.map((row, index): TranslatedRow => ({
    id: row.id, sourceLanguage: examples[index % examples.length].language, sectionRu: "Лаборатория", labelRu: examples[index % examples.length].translation,
    valueRu: "5,4 mmol/L", alternateValueRu: null,
  })) });
}

describe("internal medical document translation boundary", () => {
  it("pairs synthetic Armenian, German, Bulgarian, Korean, Swiss French/Italian/Romansh and Spanish rows with immutable numeric source", () => {
    const rows = examples.map((_, index) => evidence(index));
    const translated = parseDocumentTranslation(response(rows), rows);
    expect(translated?.map(item => item.sourceLanguage)).toEqual(examples.map(item => item.language));
    expect(translated?.every(item => item.valueRu === "5,4 mmol/L")).toBe(true);
    expect(rows.every(row => row.value === "5,4 mmol/L" && row.trustState === "SOURCE_ONLY")).toBe(true);
  });

  it("refuses missing, reordered, invented or changed numbers, signs, dates and units", () => {
    const rows = [evidence(0), evidence(1)];
    const good = JSON.parse(response(rows));
    for (const mutation of [
      (data: typeof good) => data.translations.pop(),
      (data: typeof good) => data.translations.reverse(),
      (data: typeof good) => { data.translations[0].id = "invented"; },
      (data: typeof good) => { data.translations[0].valueRu = "54 mmol/L"; },
      (data: typeof good) => { data.translations[0].valueRu = "5,4 mg/dL"; },
      (data: typeof good) => { data.translations[0].valueRu = "−5,4 mmol/L"; },
      (data: typeof good) => { data.translations[0].alternateValueRu = "добавлено"; },
    ]) {
      const changed = structuredClone(good);
      mutation(changed);
      expect(parseDocumentTranslation(JSON.stringify(changed), rows)).toBeNull();
    }
    expect(parseDocumentTranslation("not-json", rows)).toBeNull();
    const dateRows = [{ ...evidence(0), value: "29/09/2026 ≥ 5,4 mmol/L", label: "HbA1c" }];
    const changedDate = JSON.parse(response(dateRows));
    changedDate.translations[0].labelRu = "HbA1c";
    changedDate.translations[0].valueRu = dateRows[0].value;
    expect(parseDocumentTranslation(JSON.stringify(changedDate), dateRows)).not.toBeNull();
    changedDate.translations[0].valueRu = "09/29/2026 ≥ 5,4 mmol/L";
    expect(parseDocumentTranslation(JSON.stringify(changedDate), dateRows)).toBeNull();
    changedDate.translations[0].valueRu = dateRows[0].value;
    changedDate.translations[0].labelRu = "HbA2c";
    expect(parseDocumentTranslation(JSON.stringify(changedDate), dateRows)).toBeNull();
  });

  it("binds each bounded batch to its page and current evidence snapshot", () => {
    const rows = Array.from({ length: 21 }, (_, index) => evidence(index));
    const batches = translationBatches(rows);
    expect(batches.map(batch => batch.rows.length)).toEqual([20, 1]);
    expect(translationBatches([{ ...rows[0], reviewToken: "changed" }, ...rows.slice(1)])[0].token).not.toBe(batches[0].token);
    expect(translationBatches([evidence(0, 2)])[0].page).toBe(2);
  });

  it("shows a source link and separates machine translation from fact review in both UI locales", () => {
    const picture = buildCaseAnalyticalPicture({ caseId,
      documents: [{ id: documentId, name: "synthetic.pdf", status: "ready", createdAt: "2026-09-29", identityStatus: "unknown" }],
      facts: [], extractedEvidence: [evidence(0)], trends: {}, blocked: [], requests: [], excluded: [], notes: [], analysisRunId: null, analysisCurrent: false });
    for (const [locale, phrase] of [["ru", "помощь для чтения"], ["en", "helps reading"]] as const) {
      const html = renderToStaticMarkup(<DocumentTranslationPanel caseId={caseId} locale={locale} picture={picture} batches={translationBatches(picture.extractedEvidence)} />);
      expect(html).toContain(phrase);
      expect(html).toContain("synthetic.pdf");
      expect(html).toContain("batch_token");
      expect(html).not.toContain("Глюкоза"); // No translation is claimed until the action succeeds.
    }
  });
});
