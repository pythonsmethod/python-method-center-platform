# Retired classification, atomic gaps and live transport release

Date: 2026-09-11

## Before

The published staff client list still rendered Case status and urgency. The
staff dashboard sorted by urgency, onboarding assigned `ready_for_review`, and
the first staff reply moved the Case to `in_review`. English Case detail also
fell back to Russian copy in the review panel and document timeline.

Gap capture created or reused a knowledge draft and then inserted its event in
separate requests. Concurrent guard replies could therefore race. Production
also recorded `TypeError: b.mask is not a function` in `/api/assistant/live`.
The separate `anham-mobile-app` Vercel project pointed at the absent
`apps/anham-mobile` directory.

## Change

- Active Case and support views, queries, labels and assistant datasets no
  longer expose status, urgency, direction or automatic classification.
- Onboarding and staff replies no longer write automatic Case transitions.
- Archived classification rows remain in the database and are filtered from
  active activity and founder timelines.
- Case review and document timeline state copy follows the active RU/EN locale.
- `record_assistant_gap_event(...)` serializes one topic draft, then
  deduplicates events by topic, audience and locale and writes atomically.
- Next.js keeps `ws` external to server bundles so the Node runtime loads its
  Buffer masking implementation directly.
- The Vercel Root Directory for `anham-mobile-app` is now empty, matching the
  root `package.json`.

## Data and safety

The new RPC accepts enumerated topic, audience, escalation target and locale,
plus generic draft seed copy. It accepts no question, profile, Case, email or
medical value. It is `SECURITY INVOKER`, has an empty `search_path`, and execute
is revoked from public, anon and authenticated before being granted only to
`service_role`. The event remains append-only. No production auto-verification,
diagnosis, recommendation or client-facing medical interpretation is enabled.

## Validation

Focused regression: 43/43 tests passed. Full regression: 1758 passed and one
opt-in provider test skipped. TypeScript, ESLint and security boundary checks
passed. Synthetic Ankh benchmark: 3 documents, 4 pages, 100% critical numeric
match and VERIFIED precision, zero false VERIFIED critical errors and zero
security issues.

Production migration, deployment and signed-in synthetic acceptance are
recorded below after completion.
