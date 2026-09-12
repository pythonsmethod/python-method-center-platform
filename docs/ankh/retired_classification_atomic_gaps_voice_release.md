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
- Gap detection accepts both the server guard's canonical refusal and a narrow
  provider-authored refusal at the start of the answer. Generic uncertainty
  still does not create an event.
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

## Production acceptance — 2026-09-12

PR #182 merged as `ff65c8a` and Vercel production deployment
`dpl_HAsRBFuHiZNtgUN4E29iCCFw1qp8` reached READY. Signed-in RU/EN acceptance
confirmed that `/admin/cases` no longer renders status or urgency, RU → EN
preserves the Case route, and the synthetic Case detail renders its review and
document states in English.

The first signed-in non-PHI refusal test exposed a real acceptance defect:
the provider refused a false completed-action claim in its own words, while
the detector accepted only the guard's exact substituted sentence. PRs #183,
#184 and #185 generalized the detector to a narrow factual-refusal marker and
added every observed production wording as a regression fixture. The final
merge commit `7f0fc48` was deployed by
`dpl_2LTmtBS8oxSXg8eNnpV1XQu5cSrm`, which reached READY.

The final signed-in production run created event
`4183d64c-3cf5-486a-8a77-7957e566caf9` and inactive knowledge draft
`024055a8-e76e-4b03-9dbd-17446b618704`. The founder workspace displayed one
unread Payments and refunds event. The stored event contains only topic,
audience, escalation target, locale, draft reference and timestamp; the
question, profile and Case identifier are absent. The draft is staff/general
and `is_active=false`. Because the synthetic prompt explicitly said "medical
data", the existing clinical-first escalation rule selected Karen while the
ordered gap topic remained payment/refund. This is a test-phrase artifact and
documents the existing mixed-domain routing rule rather than a new Case state.

The mobile Root Directory was cleared. Preview deployment
`dpl_GwcDsAMbPnnYjJXgWP9oaNvRXUqw` reached READY, proving the prior
"No Next.js version detected" failure is resolved. Subsequent mobile previews
for the refusal fixes also reached READY. Main commits with no mobile-scope
change are correctly skipped in production by the project's Ignored Build
Step.

The live route now builds in production with `ws` externalized. The three
historical `b.mask is not a function` errors remain attributable to old
deployment `dpl_AcMWjJw3TogRbytoDyTkptnZhQjH`; Vercel reports no
`/api/assistant/live` runtime errors after the #182 production release. A new
microphone session was not started during this acceptance, so audio/provider
acceptance remains covered by the existing opt-in live test rather than this
browser run.

The detached dirty worktree was preserved without losing evidence as local
branch `codex/recovered-claude-gap-work-20260911`, commit `68e7cca`, and is now
clean. Implementation continued from a separate clean worktree based on main.

Final validation after the natural-refusal repair: focused tests 21/21, full
regression 1760 passed with one opt-in provider test skipped, TypeScript,
ESLint and `git diff --check` passed. The synthetic Ankh benchmark remained 3
documents / 4 pages, 100% critical numeric match and VERIFIED precision, zero
false VERIFIED critical errors and zero security issues.
