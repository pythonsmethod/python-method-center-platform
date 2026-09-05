import type { ExtractedClinicalEvidence } from "./case-picture";

const TECHNICAL_PATTERN = /(?:header|footer|колонтитул|подвал|шапк|printed|deliver to|workstation|patient phone|mobile phone|accession|authorizing provider|ordering physician|institution|учреждени|address|адрес|page\b|номер отч[её]та|patient class|mrn|dob|gender|name:)/i;
const CRITICAL_PATTERN = /(?:final diagnosis|diagnosis|bi-rads|assessment|impression|pathology results|nottingham|mitoses|tubule|nuclear grade|invasive carcinoma|lymph.?vascular|lymph node|adenopathy|microcalc|her2|estrogen|progesterone|pgr|receptor|mass|размер|recommendation)/i;
const IMPORTANT_PATTERN = /(?:findings?|procedure|biopsy|density|indication|clinical data|collected|received|laterality|site)/i;

export function normalizeEvidenceText(value: string | null): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/^[\s*•–—-]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[.;,:]+$/g, "")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function evidencePriority(section: string, label: string): ExtractedClinicalEvidence["priority"] {
  const signal = `${section} ${label}`;
  if (TECHNICAL_PATTERN.test(signal)) return "TECHNICAL";
  if (CRITICAL_PATTERN.test(signal)) return "CRITICAL";
  if (IMPORTANT_PATTERN.test(signal)) return "IMPORTANT";
  return "SUPPORTING";
}

function semanticKey(item: ExtractedClinicalEvidence): string {
  return [item.documentId, normalizeEvidenceText(item.section), normalizeEvidenceText(item.label), normalizeEvidenceText(item.value), normalizeEvidenceText(item.alternateValue)].join("|");
}

export function prepareEvidenceForKaren(items: ExtractedClinicalEvidence[]): ExtractedClinicalEvidence[] {
  const unique = new Map<string, ExtractedClinicalEvidence>();
  for (const source of items) {
    const sameReading = source.alternateValue !== null
      && normalizeEvidenceText(source.value) === normalizeEvidenceText(source.alternateValue);
    const genericNote = /^(?:note|примечани)/i.test(source.section.trim())
      && /^(?:text|текст)$/i.test(source.label.trim());
    const base: ExtractedClinicalEvidence = {
      ...source,
      alternateValue: sameReading || genericNote ? null : source.alternateValue,
      disputeReason: sameReading || genericNote ? null : source.disputeReason,
      trustState: sameReading || genericNote ? "SOURCE_ONLY" : source.trustState,
      priority: evidencePriority(source.section, source.label),
    };
    const candidates = genericNote && source.alternateValue && normalizeEvidenceText(source.value) !== normalizeEvidenceText(source.alternateValue)
      ? [base, { ...base, id: `${base.id}-alternate`, value: source.alternateValue }]
      : [base];
    for (const item of candidates) {
      const key = semanticKey(item);
      const existing = unique.get(key);
      if (!existing || (existing.priority === "TECHNICAL" && item.priority !== "TECHNICAL")) unique.set(key, item);
    }
  }
  return [...unique.values()].sort((left, right) => {
    const rank = { CRITICAL: 0, IMPORTANT: 1, SUPPORTING: 2, TECHNICAL: 3 } as const;
    return rank[left.priority] - rank[right.priority] || left.section.localeCompare(right.section) || left.label.localeCompare(right.label);
  });
}

export function selectPrimaryEvidence(items: ExtractedClinicalEvidence[], limit = 25): ExtractedClinicalEvidence[] {
  return items.filter((item) => item.priority === "CRITICAL" || item.priority === "IMPORTANT").slice(0, limit);
}
