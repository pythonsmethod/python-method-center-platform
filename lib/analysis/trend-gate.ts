import { REFERENCE_TABLES } from "@/lib/reference/tables";

// Whether a change between two measurements is a change at all.
//
// Every measurement carries two kinds of scatter: the instrument's (CVa)
// and the body's own day-to-day variation (CVi). A difference smaller than
// the two together is not a difference — it is the same person measured
// twice. The reference change value, RCV, is the size a difference has to
// reach before it means anything, and this file refuses to call anything
// smaller a trend.
//
// Conservative on purpose. The centre does not have the laboratories'
// analytical figures, so the default RCV assumes the worst acceptable
// instrument. The system would rather stay quiet about a real change than
// announce a false one: the false one is what gets a person worried, or
// treated, for nothing.
//
// Nothing here is interpreted for the person. What a significant change
// means is the team's reading; this file only says whether the numbers
// moved by more than the noise.

export type TrendPoint = {
  // The measurement in the analyte's canonical unit, or null when the unit
  // could not be resolved — in which case no trend is built at all.
  valueCanonical: number | null;
  unitResolutionMethod: string;
  unitResolved: string | null;
  measuredOn: string | null;
  // Where the value sat inside its own laboratory's interval.
  positionInReference: number | null;
  referenceLow: number | null;
  referenceHigh: number | null;
};

export type RcvSource = "exact" | "default";

// One comparison — the newest point against an earlier one — with every
// field the specification requires to be kept beside a trend.
export type TrendComparison = {
  delta_percent: number;
  rcv_used: number;
  rcv_source: RcvSource;
  is_significant: boolean;
  points_used: number;
};

export type TrendVerdict =
  // Fewer than two usable points.
  | "insufficient_points"
  // A point is unresolved, the points are not in one unit, the analyte has
  // no variation figure, or an earlier value is zero. No trend is built.
  | "not_comparable"
  // The change is inside the noise.
  | "noise"
  | "significant";

export type TrendAssessment = {
  analyte: string;
  verdict: TrendVerdict;
  // Why nothing could be compared. Null whenever a comparison was made.
  reason: string | null;
  versus_previous: TrendComparison | null;
  versus_baseline: TrendComparison | null;
  // Whether the newest point sits inside its own laboratory's interval. A
  // significant change inside the interval is one of the main things the
  // system exists to notice; a sub-RCV change outside it is not described
  // as a worsening.
  latest_within_reference: boolean | null;
  // With three or more points: whether every step moved the same way.
  // Recorded, not used as a gate — the specification asks for it to be
  // taken into account and does not say how, and a rule invented here would
  // be a rule nobody signed.
  direction: "up" | "down" | "flat" | "mixed" | null;
  // Indices after which the printed reference interval changed. A change of
  // reference is a change of scale or of laboratory, and the line has to
  // show the break rather than draw across it.
  reference_breaks: number[];
};

type VariationEntry = { cvi_percent: number; rcv_default_percent: number };

const VARIATION = REFERENCE_TABLES.biologicalVariation.analytes as unknown as Record<
  string,
  VariationEntry
>;

// The exact formula, keyed by the table's own statement of it. If the
// table's text changes, the map no longer matches and the test that pins it
// fails — so the arithmetic and the document describing it cannot drift.
const EXACT_FORMULAS: Record<string, (cva: number, cvi: number) => number> = {
  "RCV = 2.77 * sqrt(CVa^2 + CVi^2)  — применяется, если CVa лаборатории известен.":
    (cva, cvi) => 2.77 * Math.sqrt(cva * cva + cvi * cvi)
};

export function exactFormulaKnown(): boolean {
  return Boolean(EXACT_FORMULAS[REFERENCE_TABLES.biologicalVariation._meta.formula_exact]);
}

// The threshold for an analyte, and where it came from.
export function referenceChangeValue(
  analyte: string,
  cvaPercent?: number | null
): { rcv: number; source: RcvSource } | null {
  const entry = VARIATION[analyte];

  if (!entry) {
    return null;
  }

  if (typeof cvaPercent === "number" && Number.isFinite(cvaPercent) && cvaPercent >= 0) {
    const formula = EXACT_FORMULAS[REFERENCE_TABLES.biologicalVariation._meta.formula_exact];

    if (formula) {
      return { rcv: formula(cvaPercent, entry.cvi_percent), source: "exact" };
    }
  }

  // The default is read from the table rather than recomputed: the factor
  // behind it is a clinical judgement written down in the file, and a copy
  // of it here would be a second place for it to be wrong.
  return { rcv: entry.rcv_default_percent, source: "default" };
}

function compare(
  earlier: number,
  latest: number,
  rcv: { rcv: number; source: RcvSource },
  pointsUsed: number
): TrendComparison {
  const delta = ((latest - earlier) / earlier) * 100;

  return {
    delta_percent: delta,
    rcv_used: rcv.rcv,
    rcv_source: rcv.source,
    // Strictly greater: a change exactly at the threshold is still the
    // threshold, and the specification says "above".
    is_significant: Math.abs(delta) > rcv.rcv,
    points_used: pointsUsed
  };
}

function sameReference(a: TrendPoint, b: TrendPoint): boolean {
  return a.referenceLow === b.referenceLow && a.referenceHigh === b.referenceHigh;
}

function directionOf(values: number[]): TrendAssessment["direction"] {
  if (values.length < 3) {
    return null;
  }

  let up = false;
  let down = false;

  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[i - 1]) up = true;
    if (values[i] < values[i - 1]) down = true;
  }

  if (up && down) return "mixed";
  if (up) return "up";
  if (down) return "down";
  return "flat";
}

function refuse(analyte: string, verdict: TrendVerdict, reason: string): TrendAssessment {
  return {
    analyte,
    verdict,
    reason,
    versus_previous: null,
    versus_baseline: null,
    latest_within_reference: null,
    direction: null,
    reference_breaks: []
  };
}

// Points in the order they were measured, oldest first. The first is the
// baseline; the last is what is being assessed.
export function assessTrend(
  analyte: string,
  points: TrendPoint[],
  options: { cvaPercent?: number | null } = {}
): TrendAssessment {
  if (points.length < 2) {
    return refuse(analyte, "insufficient_points", "Для сравнения нужны как минимум две точки.");
  }

  // An unresolved point is a number whose scale nobody knows. Comparing
  // through it is not a weaker comparison; it is not a comparison. The
  // caller may pass fewer points, but it does so visibly, not here.
  const unresolved = points.findIndex(
    (p) => p.unitResolutionMethod === "unresolved" || p.valueCanonical === null
  );

  if (unresolved !== -1) {
    return refuse(
      analyte,
      "not_comparable",
      `Точка ${unresolved + 1} не имеет определённой единицы, поэтому тренд не строится.`
    );
  }

  const units = new Set(points.map((p) => p.unitResolved));

  if (units.size !== 1) {
    return refuse(
      analyte,
      "not_comparable",
      `Точки приведены к разным единицам (${[...units].join(", ")}), поэтому несопоставимы.`
    );
  }

  const rcv = referenceChangeValue(analyte, options.cvaPercent);

  if (!rcv) {
    // No CVi means no threshold, and a threshold is not something to make
    // up on the spot for an analyte the table left out.
    return refuse(
      analyte,
      "not_comparable",
      `Для показателя «${analyte}» нет величины биологической вариации, поэтому порог значимости неизвестен.`
    );
  }

  const values = points.map((p) => p.valueCanonical as number);
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const baseline = values[0];

  if (previous <= 0 || baseline <= 0) {
    return refuse(
      analyte,
      "not_comparable",
      "Предыдущее значение равно нулю или отрицательно — процент изменения не определён."
    );
  }

  const versusPrevious = compare(previous, latest, rcv, 2);
  const versusBaseline = compare(baseline, latest, rcv, points.length);
  const latestPoint = points[points.length - 1];
  const position = latestPoint.positionInReference;

  const breaks: number[] = [];

  for (let i = 1; i < points.length; i += 1) {
    if (!sameReference(points[i - 1], points[i])) {
      breaks.push(i - 1);
    }
  }

  return {
    analyte,
    // The verdict follows the comparison with the previous point: that is
    // what "has it changed" means to the person reading it. The baseline
    // comparison sits beside it for the longer view.
    verdict: versusPrevious.is_significant ? "significant" : "noise",
    reason: null,
    versus_previous: versusPrevious,
    versus_baseline: versusBaseline,
    latest_within_reference: position === null ? null : position >= 0 && position <= 1,
    direction: directionOf(values),
    reference_breaks: breaks
  };
}
