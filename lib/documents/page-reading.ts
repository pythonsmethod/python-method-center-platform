import { toIsoDate } from "@/lib/assistant/metadata";
import { compareTranscriptions, parseTranscription, type DisputedValue, type TranscribedValue } from "@/lib/assistant/transcription";
import type { ExtractedValueRow } from "@/lib/analysis/pipeline";
import type { PageCoverage, SourceAnchor } from "./source";

export type ReadPage = {
  page: number;
  first: TranscribedValue[];
  second: TranscribedValue[];
  agreed: TranscribedValue[];
  disputed: DisputedValue[];
  coverage: PageCoverage;
};

export function analysisRowsFromPageReadings(rows: TranscribedValue[]): ExtractedValueRow[] {
  return rows.map(row => ({
    section: row.section, label: row.label, value: row.value,
    reference: row.reference, referenceConfirmed: row.referenceConfirmed,
    source: row.source,
    // An absent row date inherits the document's collection date. A printed
    // but ambiguous row date remains null and never inherits another date.
    collectionDate: row.contextDisputed?.includes("collectionDatePrinted") ? null
      : row.collectionDatePrinted ? toIsoDate(row.collectionDatePrinted) : undefined,
    comparisonContext: { specimen: row.specimen ?? null, method: row.method ?? null,
      ...(row.contextDisputed?.length || row.unitDisputed ? { review_required: true as const } : {}),
      ...(row.unitDisputed ? { unit_review_required: true as const } : {}) }
  }));
}

export function buildReadPage(firstText: string, secondText: string, page: number, hash: string, filename: string): ReadPage {
  const anchor = (excerpt: string | null): SourceAnchor => ({ level: "PAGE", page, sourceHash: hash, excerpt, region: null });
  const parse = (text: string) => parseTranscription(text).map(row => ({ ...row, file: filename, collectionDatePrinted: row.collectionDatePrinted ?? null, specimen: row.specimen ?? null, method: row.method ?? null,
    source: anchor([row.label, row.value, row.reference].filter(Boolean).join(" | ")) }));
  const first = parse(firstText);
  const second = parse(secondText);
  const coverageRows = [...first, ...second].filter(row => /ПОКРЫТИЕ ДОКУМЕНТА|DOCUMENT COVERAGE/i.test(row.label));
  const complete = firstText.trim().endsWith("[[PMC_PAGE_END]]") && secondText.trim().endsWith("[[PMC_PAGE_END]]") && coverageRows.length === 2 && coverageRows.every(row => row.value === "COMPLETE");
  const status = complete ? "COMPLETE" : coverageRows.some(row => row.value === "UNREADABLE") ? "UNREADABLE" : "PARTIAL";
  const comparison = compareTranscriptions(first, second);
  // A missing end marker or incomplete coverage invalidates agreement even
  // if the visible value matched in both readings.
  const agreed = complete ? comparison.agreed : [];
  const disputed = [
    ...comparison.disputed,
    ...(!complete ? comparison.agreed.map(row => ({ file: row.file, section: row.section, label: row.label,
      first: row.value, second: row.value, reason: "источник виден не полностью" as const,
      note: "PAGE_COVERAGE_REVIEW_REQUIRED" })) : [])
  ].map(row => ({ ...row, source: anchor([row.label, row.first, row.second].filter(Boolean).join(" | ")) }));
  for (const row of agreed) {
    if (row.collectionDatePrinted && !toIsoDate(row.collectionDatePrinted)) disputed.push({ file: filename, section: "DATE", label: `${row.label}: collection date`, first: row.collectionDatePrinted, second: null, reason: "чтение неуверенное", note: "AMBIGUOUS_OR_UNSUPPORTED_DATE", source: anchor(row.collectionDatePrinted) });
    if (!row.referenceConfirmed && row.reference && !/^[—-]$/.test(row.reference)) {
      const other = second.find(candidate => candidate.section === row.section && candidate.label === row.label);
      disputed.push({ file: filename, section: row.section, label: `${row.label}: reference`, first: row.reference, second: other?.reference ?? null, reason: "разные значения", note: "REFERENCE_INTERVAL_CONFLICT", source: anchor([row.label, row.reference, other?.reference].join(" | ")) });
    }
  }
  if (!complete) disputed.push({ file: filename, section: "SOURCE COVERAGE", label: `Page ${page}`,
    first: coverageRows[0]?.value ?? null, second: coverageRows[1]?.value ?? null,
    reason: "источник виден не полностью", note: "PAGE_COVERAGE_REVIEW_REQUIRED", source: anchor(null) });
  return { page, first, second, agreed: agreed.map(row => ({ ...row, source: anchor([row.label, row.value, row.reference].filter(Boolean).join(" | ")) })), disputed,
    coverage: { page, status, reasons: complete ? [] : ["PAGE_COVERAGE_REVIEW_REQUIRED"] } };
}
