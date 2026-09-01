import type { QuestionnaireCopy } from "@/lib/health/copy";
import type { StoredVersion } from "@/lib/health/queries";
import { formatDateTime } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";

type HealthQuestionnaireHistoryProps = {
  history: StoredVersion[];
  copy: QuestionnaireCopy;
  locale: Locale;
};

// Earlier versions, newest first.
//
// Shown to the person and not only kept for the staff: somebody who wrote
// "tired since spring" in March and "tired constantly" in September has
// described a course of events, and they should be able to see that they
// did. Only the fields they actually filled are listed — a version padded
// with a dozen "not filled in" lines hides the two lines that changed.
export function HealthQuestionnaireHistory({
  history,
  copy: t,
  locale
}: HealthQuestionnaireHistoryProps) {
  if (history.length === 0) {
    return <p className="hq__note">{t.versionsEmpty}</p>;
  }

  const fields = (version: StoredVersion): Array<[string, string]> =>
    (
      [
        [t.complaints, version.complaints],
        [t.chronic, version.chronic_conditions],
        [t.surgeries, version.surgeries],
        [t.allergies, version.allergies],
        [t.habits, version.habits],
        [t.cycleNote, version.cycle_note],
        [t.height, version.height_cm === null ? null : String(version.height_cm)],
        [t.weight, version.weight_kg === null ? null : String(version.weight_kg)],
        [t.own, version.self_description]
      ] as Array<[string, string | null]>
    ).filter((pair): pair is [string, string] => Boolean(pair[1]));

  return (
    <ol className="hq-history">
      {history.map((version) => (
        <li className="hq-history__item" key={version.id}>
          <details>
            <summary>
              <span>{t.savedOn} {formatDateTime(version.created_at, locale)}</span>
            </summary>
            <dl className="hq-history__fields">
              {fields(version).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </li>
      ))}
    </ol>
  );
}
