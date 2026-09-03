export type ParsedNumeric = {
  numeric: number | null;
  comparator: "<" | ">" | "<=" | ">=" | null;
};

function canonicalNumberText(value: string): string {
  return value.trim().replace(/\u2212/g, "-").replace(/,/g, ".").replace(/\s+/g, "");
}

export function parseNumericValue(value: string): ParsedNumeric {
  const match = canonicalNumberText(value).match(/^(<=|>=|<|>|≤|≥)?([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)$/i);
  if (!match) return { numeric: null, comparator: null };
  const numeric = Number(match[2]);
  const rawComparator = match[1] ?? null;
  const comparator = rawComparator === "≤" ? "<=" : rawComparator === "≥" ? ">=" : rawComparator;
  return Number.isFinite(numeric)
    ? { numeric, comparator: comparator as ParsedNumeric["comparator"] }
    : { numeric: null, comparator: null };
}

export function parseReferenceInterval(value?: string | null): { low: number | null; high: number | null } {
  if (!value?.trim()) return { low: null, high: null };
  const normalized = value.trim().replace(/\u2212/g, "-").replace(/,/g, ".");
  const range = normalized.match(/([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:-|–|—|to)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/i);
  if (range) return { low: Number(range[1]), high: Number(range[2]) };
  const bound = normalized.match(/^(<=|≤|<|>=|≥|>)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if (!bound) return { low: null, high: null };
  const number = Number(bound[2]);
  return bound[1].startsWith("<") || bound[1] === "≤"
    ? { low: null, high: number }
    : { low: number, high: null };
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeLabFlag(value?: string | null): string | null {
  const flag = normalizeWhitespace(value ?? "").toUpperCase();
  if (!flag) return null;
  const known: Record<string, string> = { H: "HIGH", HIGH: "HIGH", L: "LOW", LOW: "LOW", ABNORMAL: "ABNORMAL", A: "ABNORMAL" };
  return known[flag] ?? flag;
}

const TEST_NAMES: Record<string, string> = {
  hgb: "Hemoglobin",
  hb: "Hemoglobin",
  hemoglobin: "Hemoglobin",
  haemoglobin: "Hemoglobin",
  ferritin: "Ferritin",
  alt: "ALT",
  "alanine aminotransferase": "ALT",
  albumin: "Albumin",
  glucose: "Glucose",
  crp: "C-reactive protein",
  "c reactive protein": "C-reactive protein",
  "c-reactive protein": "C-reactive protein"
};

export function normalizeTestName(value: string): string | null {
  const key = normalizeWhitespace(value).toLowerCase().replace(/[._]/g, " ").replace(/\s+/g, " ");
  return TEST_NAMES[key] ?? null;
}

const SAFE_UNITS: Record<string, string> = {
  "g/dl": "g/dL",
  "g/l": "g/L",
  "mg/l": "mg/L",
  "ng/ml": "ng/mL",
  "mmol/l": "mmol/L",
  "u/l": "U/L"
};

export function normalizeUnit(value?: string | null): string | null {
  const key = normalizeWhitespace(value ?? "").toLowerCase().replace(/µ/g, "u");
  return SAFE_UNITS[key] ?? null;
}
