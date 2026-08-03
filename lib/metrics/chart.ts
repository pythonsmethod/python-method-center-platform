// The chart math, kept pure so tests can pin it. The chart draws ONLY
// client-entered values: the platform never invents a number, so every
// point here corresponds to a row the person typed in themselves.

export type MetricPoint = {
  measured_at: string; // ISO date
  value: number;
};

export type ChartGeometry = {
  // Polyline coordinates inside the 0..100 × 0..100 viewBox.
  points: { x: number; y: number; value: number; date: string }[];
  path: string;
  yMin: number;
  yMax: number;
  firstDate: string;
  lastDate: string;
};

const PAD_X = 6;
const PAD_Y = 10;

// Dates spread along X by real time distance (a gap of five months looks
// like a gap), values along Y with padding so the line never kisses the
// frame. A single point renders centered — a dot, not a line.
export function buildChartGeometry(
  rawPoints: MetricPoint[]
): ChartGeometry | null {
  const points = [...rawPoints]
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));

  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => point.value);
  const yMinRaw = Math.min(...values);
  const yMaxRaw = Math.max(...values);
  // A flat line (all values equal) still needs a visible band.
  const spread = yMaxRaw - yMinRaw || Math.abs(yMaxRaw) * 0.1 || 1;
  const yMin = yMinRaw - spread * 0.08;
  const yMax = yMaxRaw + spread * 0.08;

  const t0 = Date.parse(points[0].measured_at);
  const t1 = Date.parse(points[points.length - 1].measured_at);
  const timeSpread = t1 - t0 || 1;

  const scaled = points.map((point) => {
    const t = Date.parse(point.measured_at);
    const x =
      points.length === 1
        ? 50
        : PAD_X + ((t - t0) / timeSpread) * (100 - PAD_X * 2);
    const y =
      100 - PAD_Y - ((point.value - yMin) / (yMax - yMin)) * (100 - PAD_Y * 2);

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      value: point.value,
      date: point.measured_at
    };
  });

  return {
    points: scaled,
    path: scaled.map((p) => `${p.x},${p.y}`).join(" "),
    yMin: yMinRaw,
    yMax: yMaxRaw,
    firstDate: points[0].measured_at,
    lastDate: points[points.length - 1].measured_at
  };
}

// "Гемоглобин " and "гемоглобин" are one metric, not two.
export function normalizeMetricName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");

  return clean.length > 0
    ? clean[0].toUpperCase() + clean.slice(1)
    : "";
}
