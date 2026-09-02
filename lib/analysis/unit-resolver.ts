import { REFERENCE_TABLES } from "@/lib/reference/tables";
import {
  parseReferenceRange,
  positionInReference,
  type ReferenceRange
} from "@/lib/analysis/reference-range";

// Which unit a value arrived in, and what it is in the centre's own unit.
//
// The centre reads documents from laboratories it has no agreement with, in
// countries that print different units, and no laboratory is going to change
// for us. So the unit has to be recovered from the paper — and recovered,
// never guessed. Calcium 2.4 and calcium 9.6 are the same measurement on two
// scales; a system that picks the likelier-looking number will be confidently
// wrong about a person's blood.
//
// The original is never touched. The value, its unit and its interval are
// kept exactly as printed and are what a person sees. The canonical figure
// computed here lives beside them and exists for two jobs only: comparing
// against a safety threshold, and comparing this month against last.

export type UnitResolutionMethod =
  | "explicit"
  | "resolved_by_reference"
  | "resolved_by_locale"
  | "unresolved";

export type UnitResolution = {
  unitOriginal: string;
  referenceOriginal: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  unitResolved: string | null;
  method: UnitResolutionMethod;
  valueCanonical: number | null;
  conversionFactor: number | null;
  positionInReference: number | null;
  // Why nothing could be resolved, in words the person settling it can act
  // on. Null whenever the unit was resolved.
  unresolvedReason: string | null;
};

type AltUnit = {
  unit: string;
  factor?: number;
  formula?: string;
  ref_low_range?: number[];
  ref_high_range?: number[];
};

type AnalyteEntry = { canonical: string; alt: AltUnit[] };

const ANALYTES = REFERENCE_TABLES.analyteUnits.analytes as unknown as Record<
  string,
  AnalyteEntry
>;

// Conversions that are not a multiplication. The arithmetic lives here and
// the choice of it lives in the table: an alternative unit naming a formula
// this map does not know converts nothing, rather than being multiplied by
// something plausible.
const FORMULAS: Record<string, (value: number) => number> = {
  "ngsp = ifcc/10.929 + 2.15": (ifcc) => ifcc / 10.929 + 2.15
};

function normaliseUnit(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s ]/g, "")
    .replace(/[«»"'`]/g, "")
    .replace(/\.$/, "")
    .trim();
}

// "г/л" and "g/L" are one unit written in two alphabets. The table of
// spellings is data, because it grows with every new country's forms.
const ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const table = REFERENCE_TABLES.unitAliases.aliases as Record<string, string[]>;

  for (const [canonical, spellings] of Object.entries(table)) {
    map[normaliseUnit(canonical)] = canonical;

    for (const spelling of spellings) {
      map[normaliseUnit(spelling)] = canonical;
    }
  }

  return map;
})();

export function canonicaliseUnitSpelling(printed: string): string | null {
  const key = normaliseUnit(printed);

  return key.length === 0 ? null : (ALIASES[key] ?? null);
}

// What one unit of `unit` is worth in the analyte's canonical unit.
function converterFor(
  entry: AnalyteEntry,
  unit: string
): { factor: number | null; convert: (value: number) => number } | null {
  if (unit === entry.canonical) {
    return { factor: 1, convert: (value) => value };
  }

  const alt = entry.alt.find((candidate) => candidate.unit === unit);

  if (!alt) {
    return null;
  }

  if (typeof alt.factor === "number") {
    const factor = alt.factor;

    return { factor, convert: (value) => value * factor };
  }

  if (alt.formula && FORMULAS[alt.formula]) {
    // A formula is not a factor: there is no single number to record, and
    // writing one down would invite somebody to multiply by it later.
    return { factor: null, convert: FORMULAS[alt.formula] };
  }

  return null;
}

// The canonical unit does not carry its own interval fingerprints — the
// table gives them for the alternatives only. They follow arithmetically:
// an interval of 10–14 in g/dL is an interval of 100–140 in g/L. Deriving
// them is what lets "120–155" resolve to g/L rather than to nothing.
function canonicalFingerprint(
  entry: AnalyteEntry
): { low: [number, number]; high: [number, number] } | null {
  const lows: number[] = [];
  const highs: number[] = [];

  for (const alt of entry.alt) {
    if (typeof alt.factor !== "number" || !alt.ref_low_range || !alt.ref_high_range) {
      continue;
    }

    lows.push(alt.ref_low_range[0] * alt.factor, alt.ref_low_range[1] * alt.factor);
    highs.push(alt.ref_high_range[0] * alt.factor, alt.ref_high_range[1] * alt.factor);
  }

  if (lows.length === 0) {
    return null;
  }

  return {
    low: [Math.min(...lows), Math.max(...lows)],
    high: [Math.min(...highs), Math.max(...highs)]
  };
}

function within(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

// Every unit whose printed interval matches the one on this form.
function candidatesFor(entry: AnalyteEntry, range: ReferenceRange): string[] {
  if (range.low === null || range.high === null) {
    // A one-sided limit is not a fingerprint: "< 5.0" fits a great many
    // scales at once.
    return [];
  }

  const found: string[] = [];
  const canonical = canonicalFingerprint(entry);

  if (canonical && within(range.low, canonical.low) && within(range.high, canonical.high)) {
    found.push(entry.canonical);
  }

  for (const alt of entry.alt) {
    if (!alt.ref_low_range || !alt.ref_high_range) {
      continue;
    }

    const low: [number, number] = [alt.ref_low_range[0], alt.ref_low_range[1]];
    const high: [number, number] = [alt.ref_high_range[0], alt.ref_high_range[1]];

    if (within(range.low, low) && within(range.high, high)) {
      found.push(alt.unit);
    }
  }

  return found;
}

function unresolved(
  base: Omit<UnitResolution, "method" | "unitResolved" | "valueCanonical" | "conversionFactor" | "unresolvedReason">,
  reason: string
): UnitResolution {
  return {
    ...base,
    unitResolved: null,
    method: "unresolved",
    valueCanonical: null,
    conversionFactor: null,
    unresolvedReason: reason
  };
}

export type UnitResolutionInput = {
  // The analyte's key in the reference tables, not the label printed on the
  // form. Turning one into the other is a separate step.
  analyte: string;
  value: number;
  // Exactly as printed beside the value, in whatever alphabet.
  unitPrinted?: string | null;
  referencePrinted?: string | null;
  // Whether both readings of the document found the same interval. It has
  // to be true for the interval to decide anything: the difference between
  // two readings of an interval is a factor of ten in what the value
  // means, so an unstated confirmation is treated as no confirmation.
  referenceConfirmed?: boolean;
};

export function resolveUnit(input: UnitResolutionInput): UnitResolution {
  const unitOriginal = (input.unitPrinted ?? "").trim();
  const referenceOriginal = (input.referencePrinted ?? "").trim();
  const range = parseReferenceRange(referenceOriginal);

  const base = {
    unitOriginal,
    referenceOriginal,
    referenceLow: range?.low ?? null,
    referenceHigh: range?.high ?? null,
    positionInReference: null as number | null
  };

  const entry = ANALYTES[input.analyte];

  if (!entry) {
    return unresolved(base, `Показатель «${input.analyte}» отсутствует в справочнике единиц.`);
  }

  const settle = (unit: string, method: UnitResolutionMethod): UnitResolution => {
    const converter = converterFor(entry, unit);

    if (!converter) {
      return unresolved(
        base,
        `Единица «${unit}» известна, но пересчёт в «${entry.canonical}» не описан в справочнике.`
      );
    }

    return {
      ...base,
      unitResolved: entry.canonical,
      method,
      valueCanonical: converter.convert(input.value),
      conversionFactor: converter.factor,
      // Position is computed against the interval as printed, in the unit
      // it was printed in — the value and its interval are on the same
      // scale whatever that scale is, so no conversion is needed and none
      // is applied.
      positionInReference: positionInReference(input.value, range),
      unresolvedReason: null
    };
  };

  // 1. The unit is printed and unambiguous. The interval is not consulted:
  //    a laboratory naming its own unit is better evidence than a
  //    fingerprint, and it is what the person sees on their paper.
  if (unitOriginal.length > 0) {
    const spelled = canonicaliseUnitSpelling(unitOriginal);

    if (spelled && (spelled === entry.canonical || entry.alt.some((a) => a.unit === spelled))) {
      return settle(spelled, "explicit");
    }
  }

  // 2. No usable unit. The printed interval is the fingerprint — but only
  //    an interval both readings agreed on. Confirmation has to be stated:
  //    a caller that forgets gets a visible refusal and a task for a
  //    person, not a silently chosen unit.
  if (range && input.referenceConfirmed === true) {
    const candidates = candidatesFor(entry, range);

    if (candidates.length === 1) {
      return settle(candidates[0], "resolved_by_reference");
    }

    if (candidates.length > 1) {
      return unresolved(
        base,
        `Интервал «${referenceOriginal}» подходит сразу нескольким единицам (${candidates.join(", ")}). Нужна проверка человеком.`
      );
    }

    return unresolved(
      base,
      `Интервал «${referenceOriginal}» не совпал ни с одной известной единицей показателя. Нужна проверка человеком.`
    );
  }

  if (range) {
    return unresolved(
      base,
      input.referenceConfirmed === false
        ? "Два чтения документа увидели разные референсные интервалы, поэтому интервал не определяет единицу. Нужна проверка человеком."
        : "Референсный интервал не подтверждён вторым чтением, поэтому единицу не определяет. Нужна проверка человеком."
    );
  }

  // 3. The specification's third step is the laboratory's country as a
  //    hint. It is not implemented, and deliberately not faked: nothing in
  //    the reference tables says which units which country prints, and
  //    inventing that mapping here would be exactly the guessing this file
  //    exists to prevent.

  return unresolved(
    base,
    unitOriginal.length > 0
      ? `Единица «${unitOriginal}» не опознана, а референсного интервала рядом нет. Нужна проверка человеком.`
      : "В бланке нет ни единицы, ни референсного интервала. Нужна проверка человеком."
  );
}
