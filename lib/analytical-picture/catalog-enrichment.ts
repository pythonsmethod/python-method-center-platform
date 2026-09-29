import { getDiagnosticCatalog, emptyLookup } from "@/lib/nexora/diagnostic-catalog/catalog";
import type { CatalogLookup, DiagnosticCatalog } from "@/lib/nexora/diagnostic-catalog/types";
import { resolveAnalyteLabel } from "@/lib/analysis/analyte-labels";
import { REFERENCE_TABLES } from "@/lib/reference/tables";
import type { CaseAnalyticalPicture, PictureFact, ExtractedClinicalEvidence } from "./case-picture";

function factName(fact: PictureFact): { name: string; paired: boolean } {
  const related = fact.provenance.related;
  if (/^(result|результат)$/i.test(fact.label.trim()) && related?.excerpt && fact.provenance.sourceHash && related.sourceHash === fact.provenance.sourceHash && related.page !== null && related.page === fact.provenance.page) {
    const match = related.excerpt.match(/^(?:Test|Анализ|Показатель)\s*[:|]\s*([^|]+)(?:\||$)/iu);
    if (match) return { name: match[1].trim(), paired: true };
  }
  return { name: fact.label, paired: false };
}

/** Add a versioned read-only reference projection after the existing scoped source read.
 * This does not change extraction snapshots, trust, standard codes, trend keys or Karen decisions.
 */
export function enrichPictureWithCatalog(picture: CaseAnalyticalPicture, load: () => DiagnosticCatalog = getDiagnosticCatalog): CaseAnalyticalPicture {
  let catalog: DiagnosticCatalog;
  try { catalog = load(); }
  catch {
    const unavailable = (name: string) => emptyLookup({ name }, "unavailable");
    const facts = picture.timeline.map(fact => ({ ...fact, catalog: unavailable(fact.label) }));
    const evidence = picture.extractedEvidence.map(item => ({ ...item, catalog: unavailable(item.label) }));
    return project(picture, facts, evidence);
  }
  // Query memoization lasts only for this already-authorized picture, never across people.
  const memo = new Map<string, CatalogLookup>();
  const lookup = (name: string, unit?: string | null): CatalogLookup => {
    const key = JSON.stringify([name, unit ?? null]);
    const cached = memo.get(key); if (cached) return cached;
    let result = catalog.resolve({ name, unit });
    if (result.state === "unknown" || (result.state === "candidates" && result.candidates.every(item => item.system === "PMC_FAMILY"))) {
      const known = resolveAnalyteLabel(name);
      if (known.status === "resolved") {
        // Reuse the existing PMC synonym table only as a search hint. No new translation or mapping.
        const labels = (REFERENCE_TABLES.analyteLabels.labels as Record<string, string[]>)[known.analyte];
        const english = labels?.find(label => /[A-Za-z]/.test(label) && !/[А-Яа-яЁё]/.test(label));
        if (english) {
          const aliasResult = catalog.resolve({ name: english, unit });
          if (aliasResult.state === "candidates") result = { ...aliasResult, query: name, queryBasis: "pmc_name_alias" };
        }
      }
    }
    memo.set(key, result); return result;
  };
  const facts = picture.timeline.map(fact => {
    const input = factName(fact), result = lookup(input.name, fact.sourceUnit ?? fact.originalUnit);
    return { ...fact, catalog: input.paired && result.queryBasis === "source_name" ? { ...result, queryBasis: "source_linked_test" as const } : result };
  });
  const evidence = picture.extractedEvidence.map(item => {
    // A disputed Test value cannot supply an agreed analyte name.
    const name = /^(test|анализ|показатель)$/i.test(item.label.trim()) && item.trustState === "SOURCE_ONLY" && item.disputeReason === null && item.value && item.alternateValue === null ? item.value : item.label;
    return { ...item, catalog: lookup(name) };
  });
  return project(picture, facts, evidence);
}
function project(picture: CaseAnalyticalPicture, facts: PictureFact[], evidence: ExtractedClinicalEvidence[]): CaseAnalyticalPicture {
  const factMap = new Map(facts.map(fact => [fact.id, fact]));
  const evidenceMap = new Map(evidence.map(item => [item.id, item]));
  return { ...picture, timeline: facts, extractedEvidence: evidence,
    primaryEvidence: picture.primaryEvidence.map(item => evidenceMap.get(item.id) ?? item),
    reviewQueue: picture.reviewQueue.map(fact => factMap.get(fact.id) ?? fact) };
}
