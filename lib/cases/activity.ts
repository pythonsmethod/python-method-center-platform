import type { CaseLifecycleEvent } from "@/lib/cases/lifecycle";
import { lifecycleEventLabel } from "@/lib/i18n/status-labels";
import type { Locale } from "@/lib/i18n/locale";

// What actually happened on a case, as opposed to what it was once
// classified as.
//
// The lifecycle table still holds every `status_changed` row written while
// the client processing classification existed. Those rows are archive: they
// are audit records and are never deleted, edited or back-filled. But they
// are also not facts about the case today — the classification they refer to
// was retired, and printing "Статус кейса изменён: Изучается → Завершён" on
// the detail page presents a withdrawn model as the present state of a real
// person's case.
//
// So the timeline shows what was done — a questionnaire arrived, a payment
// was confirmed, a support period opened — and stays silent about what the
// case was labelled. Nothing is removed from storage to achieve this.
//
// `docs/architecture/CLIENT_PROCESSING_WITHOUT_CLASSIFICATION.md` is
// authoritative.

/** Event types that exist only to record a retired classification transition. */
const CLASSIFICATION_EVENT_TYPES = new Set(["status_changed"]);

export type CaseActivityEntry = {
  id: string;
  createdAt: string;
  label: string;
  notes: string | null;
};

export function isClassificationEvent(event: CaseLifecycleEvent): boolean {
  // A row is classification history either because that is its whole purpose,
  // or because its only content is a transition between two retired values.
  return (
    CLASSIFICATION_EVENT_TYPES.has(event.event_type) ||
    Boolean(event.from_status || event.to_status)
  );
}

/**
 * The case timeline a human should read: newest first, classification
 * transitions withheld, every label in the active locale.
 *
 * Note what is deliberately absent from the returned entry: `from_status` and
 * `to_status` are not carried at all, so no caller downstream can render them
 * back into the page by accident.
 */
export function caseActivityEntries(
  events: readonly CaseLifecycleEvent[],
  locale: Locale
): CaseActivityEntry[] {
  return events
    .filter((event) => !isClassificationEvent(event))
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((event) => ({
      id: event.id,
      createdAt: event.created_at,
      label: lifecycleEventLabel(event.event_type, locale),
      notes: event.notes
    }));
}
