"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import { useActionState, useMemo, useState } from "react";
import {
  addMetricEntry,
  deleteMetricEntry,
  initialMetricActionState
} from "@/lib/metrics/actions";
import { buildChartGeometry } from "@/lib/metrics/chart";

export type MetricRow = {
  id: string;
  metric_name: string;
  value: number;
  unit: string | null;
  measured_at: string;
};

type MetricsPanelProps = {
  labels: Dictionary["cabinet"]["metrics"];
  rows: MetricRow[];
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}

// The person's numbers, drawn as a line through time. Every point is a
// value they typed in themselves — the platform never invents data, so an
// empty chart stays honestly empty until the first entry.
export function MetricsPanel({ rows, labels: t }: MetricsPanelProps) {
  const metricNames = useMemo(
    () => [...new Set(rows.map((row) => row.metric_name))].sort(),
    [rows]
  );
  const [selected, setSelected] = useState<string | null>(null);
  const activeMetric = selected ?? metricNames[0] ?? null;

  const activeRows = useMemo(
    () => rows.filter((row) => row.metric_name === activeMetric),
    [rows, activeMetric]
  );
  const geometry = useMemo(
    () =>
      buildChartGeometry(
        activeRows.map((row) => ({
          measured_at: row.measured_at,
          value: Number(row.value)
        }))
      ),
    [activeRows]
  );
  const unit = activeRows.find((row) => row.unit)?.unit ?? "";

  const [addState, addAction, addPending] = useActionState(
    addMetricEntry,
    initialMetricActionState
  );
  const [, deleteAction] = useActionState(
    deleteMetricEntry,
    initialMetricActionState
  );

  const first = geometry?.points[0];
  const last = geometry ? geometry.points[geometry.points.length - 1] : null;
  const delta =
    first && last && geometry!.points.length > 1
      ? Number((last.value - first.value).toFixed(2))
      : null;

  return (
    <>
      {metricNames.length > 0 ? (
        <div className="metrics-tabs" role="tablist" aria-label={t.tabsAria}>
          {metricNames.map((name) => (
            <button
              aria-selected={name === activeMetric}
              className={`metrics-tab${name === activeMetric ? " metrics-tab--on" : ""}`}
              key={name}
              onClick={() => setSelected(name)}
              role="tab"
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      {geometry && activeMetric ? (
        <section className="panel metrics-chart-panel" aria-label={activeMetric}>
          <div className="metrics-chart-head">
            <div>
              <span className="panel__label">{activeMetric}</span>
              <h2>
                {last?.value}
                {unit ? ` ${unit}` : ""}
                <span className="metrics-chart-date">
                  {" "}
                  · {formatDate(geometry.lastDate)}
                </span>
              </h2>
            </div>
            {delta !== null ? (
              <span
                className={`metrics-delta${delta < 0 ? " metrics-delta--down" : delta > 0 ? " metrics-delta--up" : ""}`}
              >
                {delta > 0 ? `+${delta}` : `${delta}`}
                {unit ? ` ${unit}` : ""} {t.since} {formatDate(geometry.firstDate)}
              </span>
            ) : null}
          </div>

          <svg
            aria-label={`${t.chartAria} — ${activeMetric}`}
            className="metrics-chart"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 100 100"
          >
            {[25, 50, 75].map((y) => (
              <line
                className="metrics-chart__grid"
                key={y}
                vectorEffect="non-scaling-stroke"
                x1="0"
                x2="100"
                y1={y}
                y2={y}
              />
            ))}
            {geometry.points.length > 1 ? (
              <>
                <polyline
                  className="metrics-chart__area"
                  points={`${geometry.points[0].x},100 ${geometry.path} ${geometry.points[geometry.points.length - 1].x},100`}
                />
                <polyline
                  className="metrics-chart__line"
                  points={geometry.path}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
            {/* Dots as zero-length round-cap strokes: the viewBox stretches
                non-uniformly, and a <circle> would stretch into an ellipse. */}
            {geometry.points.map((point) => (
              <path
                className="metrics-chart__dot"
                d={`M ${point.x} ${point.y} h 0.01`}
                key={`${point.date}-${point.x}`}
                vectorEffect="non-scaling-stroke"
              >
                <title>
                  {formatDate(point.date)}: {point.value}
                  {unit ? ` ${unit}` : ""}
                </title>
              </path>
            ))}
          </svg>

          <div className="metrics-chart-axis">
            <span>{formatDate(geometry.firstDate)}</span>
            <span>
              {geometry.yMin} – {geometry.yMax}
              {unit ? ` ${unit}` : ""}
            </span>
            <span>{formatDate(geometry.lastDate)}</span>
          </div>

          <ul className="metrics-entries">
            {[...activeRows]
              .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
              .map((row) => (
                <li key={row.id}>
                  <span>
                    {formatDate(row.measured_at)} — <strong>{row.value}</strong>
                    {row.unit ? ` ${row.unit}` : ""}
                  </span>
                  <form action={deleteAction}>
                    <input name="entry_id" type="hidden" value={row.id} />
                    <button
                      aria-label={t.deleteEntry}
                      className="metrics-entries__delete"
                      type="submit"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      ) : (
        <div className="cab-note">
          <strong>{t.emptyTitle}</strong>
          <span>
            {t.emptyText}
          </span>
        </div>
      )}

      <section className="panel" aria-label={t.addAria}>
        <span className="panel__label">{t.addLabel}</span>
        <h2>{t.addTitle}</h2>
        <p>
          {t.addText}
        </p>
        <form action={addAction} className="onboarding-form metrics-form">
          <div className="metrics-form__row">
            <label className="field">
              <span>{t.fieldName}</span>
              <input
                maxLength={80}
                name="metric_name"
                placeholder={t.namePlaceholder}
                required
                type="text"
              />
            </label>
            <label className="field">
              <span>{t.fieldValue}</span>
              <input
                inputMode="decimal"
                name="value"
                placeholder="132"
                required
                type="text"
              />
            </label>
            <label className="field">
              <span>{t.fieldUnit}</span>
              <input maxLength={30} name="unit" placeholder={t.unitPlaceholder} type="text" />
            </label>
            <label className="field">
              <span>{t.fieldDate}</span>
              <input name="measured_at" required type="date" />
            </label>
          </div>
          <button className="button" disabled={addPending} type="submit">
            {addPending ? t.saving : t.addCta}
          </button>
          {addState.message ? (
            <p
              className={`form-message form-message--${
                addState.status === "success" ? "success" : "error"
              }`}
            >
              {addState.message}
            </p>
          ) : null}
        </form>
      </section>
    </>
  );
}
