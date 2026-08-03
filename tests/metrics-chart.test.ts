import { describe, expect, it } from "vitest";
import { buildChartGeometry, normalizeMetricName } from "@/lib/metrics/chart";

describe("dynamics chart geometry", () => {
  it("spreads points by real time distance, oldest left", () => {
    const geometry = buildChartGeometry([
      { measured_at: "2026-08-01", value: 140 },
      { measured_at: "2026-02-01", value: 110 },
      { measured_at: "2026-03-01", value: 120 }
    ]);

    expect(geometry).not.toBeNull();
    const xs = geometry!.points.map((p) => p.x);

    // Sorted chronologically and monotonic in x.
    expect(geometry!.points[0].date).toBe("2026-02-01");
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    // Feb→Mar is a much smaller step than Mar→Aug.
    expect(xs[1] - xs[0]).toBeLessThan(xs[2] - xs[1]);
  });

  it("puts higher values higher on the chart", () => {
    const geometry = buildChartGeometry([
      { measured_at: "2026-01-01", value: 10 },
      { measured_at: "2026-06-01", value: 20 }
    ])!;

    // SVG y grows downward: the larger value has the smaller y.
    expect(geometry.points[1].y).toBeLessThan(geometry.points[0].y);
    expect(geometry.yMin).toBe(10);
    expect(geometry.yMax).toBe(20);
  });

  it("renders a single measurement as a centered dot", () => {
    const geometry = buildChartGeometry([
      { measured_at: "2026-05-10", value: 42 }
    ])!;

    expect(geometry.points).toHaveLength(1);
    expect(geometry.points[0].x).toBe(50);
  });

  it("keeps a flat series visible instead of dividing by zero", () => {
    const geometry = buildChartGeometry([
      { measured_at: "2026-01-01", value: 5 },
      { measured_at: "2026-02-01", value: 5 }
    ])!;

    expect(Number.isFinite(geometry.points[0].y)).toBe(true);
    expect(geometry.points[0].y).toBeCloseTo(geometry.points[1].y);
  });

  it("returns null when there is nothing to draw", () => {
    expect(buildChartGeometry([])).toBeNull();
  });
});

describe("metric name normalization", () => {
  it("merges spelling variants into one metric", () => {
    expect(normalizeMetricName("  гемоглобин ")).toBe("Гемоглобин");
    expect(normalizeMetricName("ферритин   общий")).toBe("Ферритин общий");
  });
});
