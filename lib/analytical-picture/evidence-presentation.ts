import type { ExtractedClinicalEvidence } from "./case-picture";

const TECHNICAL_PATTERN = /(?:header|footer|колонтитул|подвал|шапк|printed|deliver to|workstation|patient phone|mobile phone|accession|authorizing provider|ordering physician|institution|учреждени|address|адрес|page\b|номер отч[её]та|patient class|mrn|dob|gender|name:)/i;
const CRITICAL_PATTERN = /(?:final diagnosis|diagnosis|bi-rads|assessment|impression|pathology results|nottingham|mitoses|tubule|nuclear grade|invasive carcinoma|lymph.?vascular|lymph node|adenopathy|microcalc|her2|estrogen|progesterone|pgr|receptor|mass|размер|recommendation)/i;
const IMPORTANT_PATTERN = /(?:findings?|procedure|biopsy|density|indication|clinical data|collected|received|laterality|site)/i;

export function evidencePriority(section: string, label: string): ExtractedClinicalEvidence["priority"] {
  const signal = `${section} ${label}`;
  if (TECHNICAL_PATTERN.test(signal)) return "TECHNICAL";
  if (CRITICAL_PATTERN.test(signal)) return "CRITICAL";
  if (IMPORTANT_PATTERN.test(signal)) return "IMPORTANT";
  return "SUPPORTING";
}

export function prepareEvidenceForKaren(items: ExtractedClinicalEvidence[]): ExtractedClinicalEvidence[] {
  const unique = new Map<string, ExtractedClinicalEvidence>();
  for (const source of items) {
    const item: ExtractedClinicalEvidence = {
      ...source,
      priority: evidencePriority(source.section, source.label),
    };
    // Presentation is not verification. Preserve units, signs, both reads,
    // uncertainty and each source-bound human decision. Only a repeated
    // occurrence of the identical row (including its ID and snapshot) can
    // be omitted; text similarity cannot establish source-row identity.
    unique.set(JSON.stringify(item), item);
  }

  return [...unique.values()].sort((left, right) => {
    const rank = { CRITICAL: 0, IMPORTANT: 1, SUPPORTING: 2, TECHNICAL: 3 } as const;
    return rank[left.priority] - rank[right.priority] || left.section.localeCompare(right.section) || left.label.localeCompare(right.label);
  });
}

export function selectPrimaryEvidence(items: ExtractedClinicalEvidence[], limit = 25): ExtractedClinicalEvidence[] {
  return items.filter((item) => item.priority === "CRITICAL" || item.priority === "IMPORTANT").slice(0, limit);
}
