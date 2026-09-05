import type { ClinicalEvidenceItem, ClinicalEvidenceLink } from "@/lib/clinical-evidence/types";

export type TimelineEvent = { sourceDocumentId: string; date: string; dateKind: NonNullable<ClinicalEvidenceItem["dateKind"]>; evidenceId: string };

export function buildTechnicalTimeline(items: ClinicalEvidenceItem[]): TimelineEvent[] {
  return items.flatMap((entry) => entry.eventDate && entry.dateKind ? [{ sourceDocumentId: entry.sourceDocumentId, date: entry.eventDate, dateKind: entry.dateKind, evidenceId: entry.evidenceId }] : [])
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function linkDocumentsDeterministically(items: ClinicalEvidenceItem[]): ClinicalEvidenceLink[] {
  const documents = new Map<string, ClinicalEvidenceItem[]>();
  for (const item of items) documents.set(item.sourceDocumentId, [...(documents.get(item.sourceDocumentId) ?? []), item]);
  const links: ClinicalEvidenceLink[] = [];
  for (const [sourceId, source] of documents) for (const [targetId, target] of documents) {
    if (sourceId === targetId) continue;
    const recommendsBiopsy = source.some((item) => item.evidenceType === "RECOMMENDATION" && /biopsy/i.test(item.originalText));
    const isProcedure = target.some((item) => item.documentType === "PROCEDURE" && /biopsy/i.test(item.originalText));
    if (recommendsBiopsy && isProcedure) links.push({ sourceDocumentId: sourceId, targetDocumentId: targetId, linkType: "RECOMMENDS", basis: "explicit biopsy recommendation + biopsy procedure", confidence: 0.95, verificationStatus: "VERIFIED" });
  }
  return links;
}
