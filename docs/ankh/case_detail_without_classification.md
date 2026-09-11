# Case detail without the processing classification

The retired client processing classification is gone from the staff Case
detail page, from the controls that could set it, and from the snapshot the
assistant reads. Archived records are untouched.

`docs/architecture/CLIENT_PROCESSING_WITHOUT_CLASSIFICATION.md` and the
repository-wide rule in `AGENTS.md` are authoritative: client cases and support
requests have no processing status, urgency, prioritisation, automatic
transition, badge or filter.

## What was still there

`app/(admin)/admin/cases/[caseId]/page.tsx` carried a founder-gated panel
printing `caseStatusLabel`, `caseUrgencyLabel` and `caseDirectionLabel`, plus a
`CaseManagementForm` with three selects that wrote all three values back
through the `updateCaseState` server action. The case history section printed
every `status_changed` transition as a line of the timeline. The assistant's
case snapshot included `direction`.

## What changed

**The UI is gone.** The status/urgency/direction panel and
`CaseManagementForm.tsx` are deleted. No select, no label and no value from the
retired model renders anywhere on the page, in either language.

**The action is a closed door.** `updateCaseState` in
`lib/cases/staff-actions.ts` now returns a localised error and nothing else. It
performs no lookup, no update, no audit write and no lifecycle write, and it
never constructs a Supabase client. It survives only because a browser tab
opened before this release still holds the old form's action identifier, and a
POST from it must not reach the database.

**Classification history stays in storage and leaves the page.** Every
`status_changed` row remains exactly as written — nothing is deleted, edited or
back-filled. `lib/cases/activity.ts` withholds those rows from the timeline,
because printing "Статус кейса изменён: Изучается → Завершён" presents a
withdrawn model as the present state of a real person's case. The returned
entry type does not carry `from_status` or `to_status` at all, so no caller
downstream can render them back by accident.

**The assistant snapshot no longer receives the classification.**
`lib/assistant/case-context.ts` drops `direction` from the case source (status
and urgency were already absent) and filters classification events out of the
lifecycle source, for the same reason: a snapshot carrying a retired label lets
the assistant describe it as the Case's present state.

**The page is fully bilingual.** All copy moved to `lib/cases/detail-copy.ts`:
headings, labels, empty states, questionnaire field names, accessibility names
on every section, and the assistant's intro, placeholder and suggestions. The
page previously mixed English headings with Russian labels for an English
reader. Child components now receive the active locale — `getDictionary(locale)`
instead of the hardcoded `getDictionary("ru")` for `CaseMessageThread` and
`DocumentTimeline`, and `paymentProductLabel`, `paymentStatusLabel` and
`formatDateTime` are all called with it.

**Language switching keeps the route.** `languageSwitchHref` preserves
pathname, query and hash, so `?view=today` and `#case-conversation` survive
RU ↔ EN in both directions. This behaviour is now covered by a regression test
rather than left implicit.

## What was deliberately not done

- No archived audit or lifecycle record was deleted, rewritten or back-filled.
- The `client_cases.status`, `urgency` and `direction` columns and the
  `CASE_STATUSES` / `CASE_URGENCIES` / `CASE_DIRECTIONS` constants remain. They
  are still referenced by other surfaces and by archived data; removing the
  columns is a separate, larger task with its own migration.
- `writeLifecycleEvent` is unchanged and still used by the payment path.
- No badge, filter, prioritisation or automatic transition was introduced
  anywhere.

## Files

- `app/(admin)/admin/cases/[caseId]/page.tsx` — rewritten, fully localised
- `app/(admin)/admin/cases/[caseId]/CaseManagementForm.tsx` — deleted
- `lib/cases/staff-actions.ts` — `updateCaseState` neutralised
- `lib/cases/activity.ts` — new
- `lib/cases/detail-copy.ts` — new
- `lib/assistant/case-context.ts` — snapshot cleaned

## Tests

- `tests/case-detail-cleanup.test.tsx` — renders the page in RU, EN and RU
  again and asserts no status/urgency/direction label, value or control; one
  language at a time; the archived transition withheld while other activity
  shows; the retired action returning a localised error without opening a
  database client; and RU/EN copy parity.
- `tests/language-switch-route.test.ts` — pathname, query and hash preserved in
  both directions.
- `tests/karen-today-conversation.test.ts` — existing assertion that the focused
  view contains no `CaseManagementForm` continues to hold.
