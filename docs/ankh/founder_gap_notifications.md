# Founder knowledge-gap notification centre

Internal, founder-only record of the moments Anham could not answer from the
centre's available knowledge. No external notification of any kind is sent.

## Why it exists

The honesty rule in `lib/assistant/factual-honesty.ts` makes Anham say "I can't
confirm this, and I don't want to mislead you" and hand the question on rather
than invent an answer. That refusal is correct, and it is also the only moment
the platform reliably knows that the centre's own knowledge is missing a piece.

Nothing recorded it. The same gap produced the same apology the next day, and
the founder had no way to see which subjects kept arriving unanswered.

## What is recorded

One append-only row per gap, carrying four enumerated values and a timestamp:

| Column              | Values                                                    |
| ------------------- | --------------------------------------------------------- |
| `topic`             | `service_scope`, `pricing_and_plans`, `payment_or_refund`, `access_or_account`, `documents_and_uploads`, `schedule_and_timing`, `methodology`, `medical_review`, `unclassified` |
| `audience`          | `client`, `staff`                                          |
| `escalation_target` | `karen`, `support`, `team`, `clarify`                      |
| `locale`            | `ru`, `en`                                                 |
| `knowledge_draft_id`| the inactive draft opened for this subject, or null        |

## What is deliberately NOT recorded

- The client's question, in whole or in part.
- Any medical text, analysis value, symptom, marker or diagnosis.
- The profile, case, email, IP or any other identifier of the person asking.

The question is read in exactly one place — `classifyGapTopic` in
`lib/assistant/escalation.ts` — to choose one value from the closed list above,
and is then discarded. A question about ferritin and fatigue becomes
`medical_review`: the fact that Professor Python's domain came up, with no
trace of what was asked. This is the same rule the voice diagnostics follow:
enumerated codes, never the speech.

Because no client identifier is stored, a gap event cannot be traced back to a
person even by someone holding the whole table.

## What does not happen

- **No Telegram and no email.** The centre is read in the workspace. The
  existing `notifyTeam` path is not used by this feature.
- **No production auto-verification.** Nothing here promotes evidence, changes
  a trust level or touches `NEEDS_REVIEW`.
- **No diagnosis or medical recommendation.** A gap event names a subject area
  and nothing else.
- **No PHI leaves the platform.** Nothing is sent to any external service.
- **No archived audit record is removed.** The table is append-only by grant.

## Detection

A gap is recorded only when the honesty guard itself replaced the model's
answer — the delivered reply is matched exactly against every sentence
`unconfirmedReply` can produce, in both languages, for every audience and
target. A model that merely sounds unsure is not a gap.

`clarify` is excluded on purpose: the assistant asking which figure someone
means is a good conversation, not missing knowledge, and recording it would
bury the real gaps.

Capture points: `app/api/assistant/client/route.ts` and
`app/api/assistant/staff/route.ts`, after the reply is finalised. The call is
awaited rather than left floating, because a serverless instance can freeze the
moment the response is returned. It never throws: an unreachable centre costs
nobody their answer.

Repeats of the same `(topic, audience, locale)` inside 60 minutes are
deduplicated, so one popular missing answer cannot drown every other gap.

## The inactive knowledge draft

Each new subject opens one placeholder in the existing `assistant_knowledge`
table with `is_active = false` and `audience = 'staff'`. It can never reach a
prompt before a human writes the real answer and switches it on, and if it were
activated by accident it would reach staff rather than clients. Its text is
derived from the enumerated topic alone and states, in both languages, that it
contains no client question and no medical data.

The title is bilingual in one string because it is also the deduplication key:
it must not change with whichever language the founder happened to be reading.

## Access control

- Both tables have RLS enabled and **no policy at all**. `anon` and
  `authenticated` are revoked; only the service role reads or writes them.
- The migration revokes from `service_role` **before** granting, and this is
  load-bearing. The project carries an `ALTER DEFAULT PRIVILEGES` for schema
  `public` granting `ALL` on every new table to `anon`, `authenticated` and
  `service_role`. A bare `grant select, insert` adds nothing on top of that and
  leaves `UPDATE`, `DELETE` and `TRUNCATE` in place. This was found by checking
  the applied grants in production after the first migration, and corrected by
  `assistant_gap_notifications_service_role_least_privilege`. Verified in
  production: `has_table_privilege('service_role', 'assistant_gap_events',
  'UPDATE')` is false.
- `assistant_gap_events` is granted `select, insert` only. There is no `update`
  and no `delete` grant: a recorded gap is audit material.
- `assistant_gap_reads` is granted `select, insert, delete` — deleting a read
  mark is how an event returns to one founder's unread list.
- `assistant_gap_unread_count(uuid)` is revoked from `public`, `anon` and
  `authenticated`, and executable by the service role only.
- `/admin/notifications`, `/admin/notifications/[eventId]` and
  `/api/admin/notifications/unread` all require `getFounderState()`: the admin
  role **and** the founder allowlist. The pages call `notFound()` rather than
  showing a message, so the route does not confirm its own existence. The API
  returns 403 with no number.
- Karen does not receive this centre. The nav entry is rendered only for a
  founder, by the same gate the routes use.
- The unread count is derived from the caller's session, never from a
  parameter, so one founder cannot read another's count.

## Independent read state

`assistant_gap_reads` is unique per `(gap_event_id, founder_profile_id)`. Each
founder's reading changes only their own list; the event row is never touched
in either direction.

## Files

- `supabase/migrations/20260909211104_assistant_knowledge_gap_notifications.sql`
- `lib/assistant/escalation.ts` — pure classification, no I/O
- `lib/assistant/escalation-store.ts` — service-role storage and capture
- `lib/assistant/escalation-copy.ts` — RU/EN copy and draft seeds
- `lib/assistant/escalation-actions.ts` — read/unread server actions
- `components/founder/GapReadToggle.tsx`
- `app/(admin)/admin/notifications/page.tsx`
- `app/(admin)/admin/notifications/[eventId]/page.tsx`
- `app/api/admin/notifications/unread/route.ts`

## Tests

- `tests/assistant-gap-detection.test.ts` — detection, classification and the
  assertion that no fragment of the question survives into the signal.
- `tests/assistant-gap-store.test.ts` — enumerated columns only, inactive
  staff-only draft, deduplication, per-founder read state, fail-soft.
- `tests/assistant-gap-access.test.ts` — founder-only endpoint and the
  migration's RLS, grant, uniqueness and additive-only guarantees.

## Known limitations

- Classification is pattern-based and ordered. A question spanning two subjects
  is filed under the first that matches, and an unusual phrasing falls to
  `unclassified` rather than being guessed at. This is deliberate: the
  alternative is sending question text to a classifier, which this design
  refuses.
- The 60-minute deduplication window means the table shows which subjects
  recur, not how many times each was asked. Counting occurrences would require
  an `update` grant that the append-only rule withholds.
- The centre records gaps; it does not measure whether filling one worked.
