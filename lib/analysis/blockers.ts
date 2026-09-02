import { REFERENCE_TABLES } from "@/lib/reference/tables";
import type { QuestionnaireVersion } from "@/lib/health/questionnaire";

// Which measurements may not be read on their own.
//
// Ferritin is an acute-phase protein: without CRP from the same period a
// normal ferritin does not exclude iron deficiency, and a system that
// interprets it anyway will be confidently wrong. Calcium without albumin,
// cortisol without the time of draw, potassium without knowing whether the
// sample haemolysed — each is a number that is visible, real, and not yet
// readable.
//
// The rules live in interpretation_blockers.json. A requirement in a rule
// is one of two things, and the table of analytes decides which: a code the
// unit table knows is a companion measurement that has to exist within the
// rule's window; anything else is a fact somebody has to supply — the time
// of draw, the person's age and sex, a haemolysis flag. A fact nobody
// supplied is a fact that is missing. Nothing here infers one.
//
// A blocked measurement stays visible. What it cannot do is reach a
// conclusion, and the function that hands measurements to the
// interpretation is the only way to produce the type the interpretation
// accepts — so a blocked value cannot get there by accident.

export type Measurement = {
  analyte: string;
  measuredOn: string | null;
  valueCanonical: number | null;
  unitResolved: string | null;
  // Facts known about this particular sample — the time of draw, a
  // haemolysis flag. Keys are the requirement names of the rules table.
  facts?: Partial<Record<FactName, boolean>>;
};

// Every non-analyte requirement the rules table may name. A test pins the
// table to this list, so a misspelt companion cannot quietly become an
// unsatisfiable "fact".
export const FACT_NAMES = [
  "collection_time",
  "age",
  "sex",
  "hemolysis_flag",
  "no_anemia",
  "no_recent_transfusion",
  "homocysteine_or_mma"
] as const;

export type FactName = (typeof FACT_NAMES)[number];

export type BlockStatus =
  // No rule, or the rule's condition does not apply to this value.
  | "ok"
  // A companion or a fact is missing. The value is visible and not read.
  | "blocked";

export type BlockAssessment = {
  analyte: string;
  measuredOn: string | null;
  status: BlockStatus;
  // Why the rule exists, from the table. Null when nothing is blocked.
  reason: string | null;
  // The requirements that were not met, by name.
  missing: string[];
  satisfied: string[];
  // What to ask for — specific, so the person is told "CRP from the same
  // period, to read the ferritin", never "more tests". Null when nothing
  // is missing.
  request: string | null;
  // Carried through from the table where present. It is data about the
  // rule, not an instruction to anything in this file.
  severity: string | null;
};

type Rule = {
  analyte: string;
  requires: string[];
  window_days: number | null;
  applies_when?: { value_between: [number, number]; unit: string };
  reason: string;
  severity?: string;
};

const TABLE = REFERENCE_TABLES.interpretationBlockers;
const RULES = TABLE.rules as unknown as Rule[];
const WINDOW_DEFAULT = TABLE._meta.window_days_default as number;
const ANALYTES = REFERENCE_TABLES.analyteUnits.analytes as unknown as Record<
  string,
  { canonical: string }
>;
const LABELS = REFERENCE_TABLES.analyteLabels.labels as Record<string, string[]>;

export function ruleFor(analyte: string): Rule | null {
  return RULES.find((rule) => rule.analyte === analyte) ?? null;
}

export function isAnalyteRequirement(requirement: string): boolean {
  return Object.prototype.hasOwnProperty.call(ANALYTES, requirement);
}

// The name a person would print, for the request. The first spelling in the
// labels table is the ordinary Russian name.
function displayName(analyte: string): string {
  return LABELS[analyte]?.[0] ?? analyte;
}

// How each fact is asked for. Wording, not clinical content: which facts
// exist is decided by the rules table and pinned by FACT_NAMES.
const FACT_REQUESTS: Record<FactName, string> = {
  collection_time: "время забора крови",
  age: "дата рождения в анкете",
  sex: "пол в анкете",
  hemolysis_flag: "отметка лаборатории о гемолизе пробы",
  no_anemia: "подтверждение, что анемии нет (гемоглобин и индексы того же периода)",
  no_recent_transfusion: "подтверждение, что за последние 90 дней не было переливания крови",
  homocysteine_or_mma: "гомоцистеин или метилмалоновая кислота того же периода"
};

function daysBetween(a: string, b: string): number | null {
  const first = Date.parse(`${a}T00:00:00Z`);
  const second = Date.parse(`${b}T00:00:00Z`);

  if (Number.isNaN(first) || Number.isNaN(second)) {
    return null;
  }

  return Math.abs(first - second) / 86_400_000;
}

// Whether a companion measurement exists close enough in time.
function companionWithin(
  target: Measurement,
  companion: string,
  windowDays: number | null,
  others: Measurement[]
): boolean {
  return others.some((other) => {
    if (other.analyte !== companion) {
      return false;
    }

    // An unresolved companion is a number on an unknown scale; it does not
    // make anything readable.
    if (other.valueCanonical === null) {
      return false;
    }

    if (windowDays === null) {
      return true;
    }

    // A companion whose date is unknown cannot be shown to be from the
    // same period, and "probably the same period" is a guess.
    if (!target.measuredOn || !other.measuredOn) {
      return false;
    }

    const gap = daysBetween(target.measuredOn, other.measuredOn);

    return gap !== null && gap <= windowDays;
  });
}

function windowText(windowDays: number | null): string {
  if (windowDays === null) {
    return "";
  }

  if (windowDays === 0) {
    return " того же дня";
  }

  return ` в пределах ${windowDays} дн. от даты забора`;
}

// Whether the rule's condition covers this value. A rule with no condition
// always applies. One with a condition needs the value in the rule's own
// unit; a value that cannot be placed against the condition is not exempt
// from it — exemption has to be shown, not assumed.
function ruleApplies(rule: Rule, measurement: Measurement): boolean {
  if (!rule.applies_when) {
    return true;
  }

  if (measurement.valueCanonical === null) {
    return true;
  }

  if (ANALYTES[rule.analyte]?.canonical !== rule.applies_when.unit) {
    // The table says the condition is in a unit the canonical value is
    // not in. That is a table error, and the safe reading of it is that
    // the rule stands.
    return true;
  }

  const [low, high] = rule.applies_when.value_between;

  return measurement.valueCanonical >= low && measurement.valueCanonical <= high;
}

export function assessBlockers(
  measurement: Measurement,
  others: Measurement[],
  // Facts about the person rather than the sample: age and sex from the
  // questionnaire, the transfusion and anaemia statements.
  personFacts: Partial<Record<FactName, boolean>> = {}
): BlockAssessment {
  const base = { analyte: measurement.analyte, measuredOn: measurement.measuredOn };
  const rule = ruleFor(measurement.analyte);

  if (!rule || !ruleApplies(rule, measurement)) {
    return { ...base, status: "ok", reason: null, missing: [], satisfied: [], request: null, severity: null };
  }

  const windowDays = rule.window_days === undefined ? WINDOW_DEFAULT : rule.window_days;
  const facts = { ...personFacts, ...(measurement.facts ?? {}) };
  const missing: string[] = [];
  const satisfied: string[] = [];

  for (const requirement of rule.requires) {
    const met = isAnalyteRequirement(requirement)
      ? companionWithin(measurement, requirement, windowDays, others)
      : facts[requirement as FactName] === true;

    (met ? satisfied : missing).push(requirement);
  }

  if (missing.length === 0) {
    return { ...base, status: "ok", reason: null, missing: [], satisfied, request: null, severity: rule.severity ?? null };
  }

  const asks = missing.map((requirement) =>
    isAnalyteRequirement(requirement)
      ? `${displayName(requirement)}${windowText(windowDays)}`
      : (FACT_REQUESTS[requirement as FactName] ?? requirement)
  );

  const when = measurement.measuredOn ? ` (${measurement.measuredOn})` : "";

  return {
    ...base,
    status: "blocked",
    reason: rule.reason,
    missing,
    satisfied,
    request: `Чтобы прочитать ${displayName(measurement.analyte).toLowerCase()}${when}, нужно: ${asks.join("; ")}.`,
    severity: rule.severity ?? null
  };
}

// Age and sex as facts, from the questionnaire. Present only when the
// questionnaire actually says them.
export function personFactsFrom(
  questionnaire: Pick<QuestionnaireVersion, "birth_date" | "sex"> | null
): Partial<Record<FactName, boolean>> {
  if (!questionnaire) {
    return {};
  }

  return {
    ...(questionnaire.birth_date ? { age: true } : {}),
    ...(questionnaire.sex === "female" || questionnaire.sex === "male" ? { sex: true } : {})
  };
}

// What the interpretation is allowed to see.
//
// The brand is the point: an InterpretableMeasurement can only be made
// here, after the check, so a blocked value cannot reach a conclusion by
// any path that type-checks. "Zero cases of bypass" is a property of the
// types rather than a promise.
declare const interpretable: unique symbol;

export type InterpretableMeasurement = Measurement & {
  readonly [interpretable]: true;
};

export function forInterpretation(
  measurements: Measurement[],
  personFacts: Partial<Record<FactName, boolean>> = {},
  // Where to look for companions. By default the same list; a run passes
  // the whole case, because the CRP that makes today's ferritin readable
  // may sit in a document from last month.
  companions: Measurement[] = measurements
): { interpretable: InterpretableMeasurement[]; blocked: BlockAssessment[] } {
  const interpretableOnes: InterpretableMeasurement[] = [];
  const blocked: BlockAssessment[] = [];

  for (const measurement of measurements) {
    // An unresolved value is not blocked by a rule; it never had a scale.
    // It stays out of interpretation for the same reason, upstream.
    if (measurement.valueCanonical === null) {
      continue;
    }

    const assessment = assessBlockers(measurement, companions, personFacts);

    if (assessment.status === "blocked") {
      blocked.push(assessment);
    } else {
      interpretableOnes.push(measurement as InterpretableMeasurement);
    }
  }

  return { interpretable: interpretableOnes, blocked };
}
