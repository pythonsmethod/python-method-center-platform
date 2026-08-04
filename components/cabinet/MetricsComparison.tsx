import type { Dictionary } from "@/lib/i18n/dictionaries";
import { compareMetrics, type MetricReading } from "@/lib/metrics/compare";

type MetricsComparisonProps = {
  labels: Dictionary["cabinet"]["metricsCompare"];
  rows: MetricReading[];
  dateLocale: string;
};

function formatDate(iso: string, dateLocale: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}

// The last two sets of results side by side.
//
// Every line here is subtraction. Nothing on this page says whether a
// change is good or bad, and that is deliberate: on this platform the
// reading of a result belongs to Professor Python, and a machine that
// starts offering one — even gently, even as a hint — is the exact failure
// the whole thing is built to avoid. The block says so out loud at the
// bottom, so nobody is left to guess why there is no verdict.
export function MetricsComparison({
  labels: t,
  rows,
  dateLocale
}: MetricsComparisonProps) {
  const { changes, firstTime } = compareMetrics(rows);

  if (changes.length === 0) {
    return null;
  }

  return (
    <section className="panel metrics-compare" aria-label={t.aria}>
      <span className="panel__label">{t.label}</span>
      <h2>{t.title}</h2>
      <p>{t.text}</p>

      <ul className="metrics-compare__list">
        {changes.map((change) => (
          <li className="metrics-compare__row" key={change.name}>
            <span className="metrics-compare__name">{change.name}</span>
            <span className="metrics-compare__values">
              {change.previousValue}
              {change.unit ? ` ${change.unit}` : ""}
              <span aria-hidden="true"> → </span>
              <strong>
                {change.currentValue}
                {change.unit ? ` ${change.unit}` : ""}
              </strong>
            </span>
            <span
              className={`metrics-compare__delta metrics-compare__delta--${change.direction}`}
            >
              {change.direction === "same"
                ? t.same
                : `${change.delta > 0 ? "+" : ""}${change.delta}${
                    change.percent === null
                      ? ""
                      : ` (${change.percent > 0 ? "+" : ""}${change.percent}%)`
                  }`}
            </span>
            <span className="metrics-compare__dates">
              {formatDate(change.previousDate, dateLocale)} →{" "}
              {formatDate(change.currentDate, dateLocale)}
            </span>
          </li>
        ))}
      </ul>

      {firstTime.length > 0 ? (
        <p className="metrics-compare__first">
          {t.firstTime}{" "}
          {firstTime.map((item) => item.name).join(", ")}
        </p>
      ) : null}

      <p className="metrics-compare__boundary">{t.boundary}</p>
    </section>
  );
}
