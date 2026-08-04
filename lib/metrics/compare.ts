// Comparing an earlier set of results against a later one.
//
// Deliberately arithmetic, and deliberately not a model. The founder asked
// for a picture of what changed between two sets of analyses and for no
// recommendations whatsoever — the safest way to guarantee the second is
// for nothing here to be capable of an opinion. This file subtracts two
// numbers. It cannot say "хорошо", because it does not know what that
// would mean, and that is the point.
//
// Everything it produces is a fact the person could check themselves with
// their own two printouts side by side.

export type MetricReading = {
  metric_name: string;
  value: number;
  unit: string | null;
  measured_at: string;
};

export type MetricChange = {
  name: string;
  unit: string | null;
  previousValue: number;
  previousDate: string;
  currentValue: number;
  currentDate: string;
  delta: number;
  // Null when the earlier value is zero: a share of nothing is not a
  // number, and printing "∞ %" would be worse than printing nothing.
  percent: number | null;
  direction: "up" | "down" | "same";
};

export type MetricComparison = {
  changes: MetricChange[];
  // Indicators that appear only once so far: nothing to compare them with
  // yet, and saying so is more useful than hiding them.
  firstTime: { name: string; value: number; unit: string | null; date: string }[];
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// The two most recent distinct dates for each indicator. Two readings on
// the same day are one point in time, not a change, so the later of them
// wins and the comparison reaches back to the previous day that has data.
export function compareMetrics(rows: MetricReading[]): MetricComparison {
  const byName = new Map<string, MetricReading[]>();

  for (const row of rows) {
    const key = row.metric_name;
    const list = byName.get(key);

    if (list) {
      list.push(row);
    } else {
      byName.set(key, [row]);
    }
  }

  const changes: MetricChange[] = [];
  const firstTime: MetricComparison["firstTime"] = [];

  for (const [name, list] of byName) {
    const byDate = new Map<string, MetricReading>();

    // Later rows for the same date replace earlier ones, so a corrected
    // reading entered afterwards is the one that counts.
    for (const row of [...list].sort((a, b) =>
      a.measured_at.localeCompare(b.measured_at)
    )) {
      byDate.set(row.measured_at, row);
    }

    const dates = [...byDate.keys()].sort();

    if (dates.length < 2) {
      const only = byDate.get(dates[0]);

      if (only) {
        firstTime.push({
          name,
          value: only.value,
          unit: only.unit,
          date: only.measured_at
        });
      }

      continue;
    }

    const previous = byDate.get(dates[dates.length - 2])!;
    const current = byDate.get(dates[dates.length - 1])!;
    const delta = round(current.value - previous.value);

    changes.push({
      name,
      unit: current.unit ?? previous.unit,
      previousValue: previous.value,
      previousDate: previous.measured_at,
      currentValue: current.value,
      currentDate: current.measured_at,
      delta,
      percent:
        previous.value === 0 ? null : round((delta / Math.abs(previous.value)) * 100),
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "same"
    });
  }

  // Largest movement first, in percentage terms where there is one: what
  // moved most is what a person looks for first. Indicators that did not
  // move at all sink to the bottom rather than disappearing.
  changes.sort((a, b) => {
    const aSize = a.percent === null ? Math.abs(a.delta) : Math.abs(a.percent);
    const bSize = b.percent === null ? Math.abs(b.delta) : Math.abs(b.percent);

    return bSize - aSize || a.name.localeCompare(b.name);
  });

  firstTime.sort((a, b) => a.name.localeCompare(b.name));

  return { changes, firstTime };
}
