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

function normalizeFieldValue(value: string | null, label: string): string {
  const normalized = normalizeEvidenceText(value);
  const normalizedLabel = normalizeEvidenceText(label).replace(/[:]+$/g, "");
  return normalizedLabel && normalized.startsWith(normalizedLabel)
    ? normalized.slice(normalizedLabel.length).replace(/^\s*[:=-]\s*/, "")
    : normalized;
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

function comparableResult(value: string | null, label: string): string {
  return normalizeFieldValue(value, label)
    .replace(/\[[^\]]+\]/g, "")
    .replace(/(?:10\s*\^\s*\d+\s*\/\s*l|mmol\s*\/\s*l|µ?mol\s*\/\s*l|g\s*\/\s*l|mg\s*\/\s*l|ng\s*\/\s*ml|fl|pg|%|u\s*\/\s*l)/gi, "")
    .replace(/(?:^|\s)[hl+\-](?:\s|$)/gi, " ")
    .replace(/[^\p{L}\p{N}.,<>]+/gu, " ")
    .replace(/,(?=\d)/g, ".")
    .trim();
}

function nonEmptyResults(item: ExtractedClinicalEvidence): string[] {
  return [item.value, item.alternateValue]
    .map((value) => comparableResult(value, item.label))
    .filter(Boolean);
}

function moreCompleteValue(item: ExtractedClinicalEvidence): string | null {
  return [item.value, item.alternateValue]
    .filter((value): value is string => Boolean(value?.trim()))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

export function prepareEvidenceForKaren(items: ExtractedClinicalEvidence[]): ExtractedClinicalEvidence[] {
  const unique = new Map<string, ExtractedClinicalEvidence>();
  for (const source of items) {
    const sameReading = source.alternateValue !== null
      && normalizeFieldValue(source.value, source.label) === normalizeFieldValue(source.alternateValue, source.label);
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
  const projected = [...unique.values()];
  const complementary = new Map<string, ExtractedClinicalEvidence[]>();
  for (const item of projected) {
    const results = nonEmptyResults(item);
    if (results.length !== 1) continue;
    const key = [item.documentId, normalizeEvidenceText(item.label), results[0]].join("|");
    complementary.set(key, [...(complementary.get(key) ?? []), item]);
  }

  const consumed = new Set<string>();
  const corroborated: ExtractedClinicalEvidence[] = [];
  for (const group of complementary.values()) {
    if (group.length < 2) continue;
    const representative = [...group].sort((left, right) => {
      const reviewed = Number(right.reviewDecision !== "PENDING") - Number(left.reviewDecision !== "PENDING");
      return reviewed || String(moreCompleteValue(right)).length - String(moreCompleteValue(left)).length;
    })[0];
    group.forEach((item) => consumed.add(item.id));
    corroborated.push({
      ...representative,
      value: moreCompleteValue(representative),
      alternateValue: null,
      disputeReason: null,
      trustState: "SOURCE_ONLY",
    });
  }

  return [...projected.filter((item) => !consumed.has(item.id)), ...corroborated].sort((left, right) => {
    const rank = { CRITICAL: 0, IMPORTANT: 1, SUPPORTING: 2, TECHNICAL: 3 } as const;
    return rank[left.priority] - rank[right.priority] || left.section.localeCompare(right.section) || left.label.localeCompare(right.label);
  });
}

export function selectPrimaryEvidence(items: ExtractedClinicalEvidence[], limit = 25): ExtractedClinicalEvidence[] {
  return items.filter((item) => item.priority === "CRITICAL" || item.priority === "IMPORTANT").slice(0, limit);
}
