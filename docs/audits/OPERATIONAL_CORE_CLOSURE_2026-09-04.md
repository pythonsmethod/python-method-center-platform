# Operational Core Closure — 2026-09-04

## Executive verdict

**NOT CLOSED.** Workstream 1 has production database remediation evidence but still lacks a post-deployment HTTP 200. Workstream 2 has a protected queue and a code fix for new-payment offer provenance, but object-level reconciliation and the Stripe test-mode smoke are blocked by access to the existing merchant account. Workstream 3 has complete operational control records without guessing direction, but human confirmations remain open. Workstream 4 is blocked by missing document-processing and AI-processing consent. No medical interpretation or client message was created.

## Scope and safety boundaries

- Repository: `pythonsmethod/python-method-center-platform` only.
- No PayPal work, legacy Telegram repository, emergency/red-flag automation, or PMC Learning Loop work.
- No client identity, Case direction, due date, Stripe ownership, consent, medical fact, or interpretation was inferred.
- Production identifiers and PHI are omitted from this report.

## Baseline and production after-state

| Measure | Baseline / after-state |
|---|---:|
| Cases | 26 |
| Cases with human direction blocker | 26 |
| Cases missing operational role owner | 0 |
| Cases missing open next action | 0 |
| Expired active service periods before remediation | 4 |
| Expired active service periods after remediation | 0 |
| Lifecycle events created by remediation | 4 |
| Unmatched Stripe events | 5 |
| Reconciliation items requiring owner identification | 5 |
| Accepted data-processing consents | 23 |
| Accepted document-processing consents | 0 |
| Accepted AI-processing consents | 0 |
| Production analysis runs | 0 |
| Production lab values | 0 |

## Workstream 1 — cron and maintenance

### Root cause

The production Supabase job `process-uploaded-medical-documents` runs once per minute and invokes the application through `pg_net`. `cron.job_run_details` reports the SQL wrapper as succeeded, but the corresponding `net._http_response` records are HTTP 401. Therefore the 401 is the canonical Supabase cron invocation, not an unrelated monitor. The deployed application runtime does not accept the authorization value supplied from Vault: the runtime secret is absent from the old deployment or does not match the Vault secret.

### Implemented and proven

- The endpoint retains fail-closed bearer authentication and now emits a structured maintenance summary.
- `run_operational_maintenance(timestamptz)` is the canonical transactional expiry function.
- Four elapsed periods were completed and four unique `service_period_completed` lifecycle records were created.
- Immediate repeat returned zero period, lifecycle, and Case changes: production database idempotency proven.
- Current after-state has zero elapsed active periods.

### Remaining acceptance

The code is in PR #118 and the target PMC Vercel preview is successful. Production is still on the prior main SHA. A post-merge deployment and a real cron response with HTTP 200 plus runtime log `operational-maintenance-complete` remain mandatory. Status: **PARTIALLY CLOSED**.

## Workstream 2 — Stripe reconciliation

- Real unmatched count: 5.
- Each event has one protected, server-only reconciliation item with RLS enabled and `anon`/`authenticated` access revoked.
- All five are `REQUIRES_OWNER_IDENTIFICATION`; Postgres retains event IDs but not the Checkout objects needed for strict matching.
- Neither available Google identity opened the existing merchant dashboard: one offered account creation and the other returned to password sign-in. A new account was not created.
- No event was linked, no payment or service period was duplicated, and no customer was guessed.
- New webhook payments now persist the canonical `OFFER_VERSION`; historical values were not backfilled without consent-time provenance.
- Stripe test-mode smoke remains blocked by merchant access. Status: **BLOCKED**.

## Workstream 3 — operational sweep of Cases

- All 26 Cases have a canonical responsible role, explicit bilingual next action, and a documented reason why no due date was inferred.
- All 26 retain `direction=not_set` and are behind a human review gate.
- Operational records are server-only. The client-facing retired processing-status model was not restored.
- No Case was labelled real, test, duplicate, incomplete, or abandoned without evidence.
- Human confirmation and audited per-Case decisions remain open. Status: **PARTIALLY CLOSED**.

## Workstream 4 — one real production analysis run

The lawful gate failed before any PHI access: production has zero accepted `document_processing` and zero accepted `ai_processing` consent records. Task authorization is not a substitute for a client's explicit consent. Consequently no Case was selected, no document content was opened or exported, and no `analysis_run`, `lab_values`, interpretation, or client message was created. Status: **BLOCKED_BY_CONSENT**.

## Code, migrations, and tests

Branch: `codex/close-operational-core-2026-09-03`; PR: https://github.com/pythonsmethod/python-method-center-platform/pull/118

Affected components:

- `app/api/documents/process/route.ts`
- `lib/maintenance/cron.ts`
- `lib/payments/expire-periods.ts`
- `app/api/stripe/webhook/route.ts`
- `lib/payments/offer-provenance.ts`
- `supabase/migrations/20260903204800_operational_core_maintenance.sql`
- `supabase/migrations/20260903205342_case_operational_control.sql`
- `supabase/migrations/20260903205711_payment_reconciliation_items.sql`
- `supabase/migrations/20260904163000_operational_core_corrections.sql`
- operational maintenance, schema, and Stripe offer-version regression tests

Focused correction pass after independent verification:

- Offer provenance is resolved from the exact profile's latest accepted `offer_acceptance` for the paid product at or before Stripe settlement. The current site constant is never a fallback. Missing or ambiguous provenance leaves `payments.offer_version` null and creates one reconciliation gate keyed by Stripe event.
- Document outcomes and operational maintenance outcomes are reported separately. Maintenance failure produces a sanitized `operational-maintenance-failed` log and controlled HTTP 500 with `complete=false`, while retaining the document summary.
- Document result categories are mutually exclusive and satisfy the recorded arithmetic invariant.
- The superseded 2026-09-03 closure report was removed; this file is the single current root-cause record.
- Future operational sweeps exclude `completed` and `archived` Cases and write one sanitized aggregate audit entry per invocation, including zero-change repeats.
- Migration `20260904163000_operational_core_corrections.sql` creates one honestly labelled retrospective production audit record without replaying the sweep or backdating the event.

Verification on the final branch state:

- ESLint: passed.
- TypeScript: passed.
- `npm ci --no-audit --no-fund`: passed from the committed lockfile (359 packages installed).
- Vitest: 105 files, 783 tests passed.
- Next.js production build: passed.
- `git diff --check`: passed.
- Target `python-method-center-platform` Vercel preview: SUCCESS.
- Separate `anham-mobile-app` Vercel status: FAILURE before build with `NEXT_NO_VERSION`; that project is configured against this repository but does not detect the root `package.json`. Its unrelated configuration was not changed in this task.

## Production and merge evidence

- Production application remains on baseline SHA `eef068f034c4c454019d4bc8091831caef1828c6` until PR merge.
- Operational migrations are already registered in production.
- Correction migration `operational_core_corrections` was applied after an aggregate dry-run. It inserted exactly one retrospective audit row, installed the terminal-case filter, retained 26 profiles / 26 current assignments / 26 open actions, and did not invoke the sweep.
- Post-correction security verification: `anon` and `authenticated` cannot execute the function; `service_role` can. Advisors contain only the expected INFO notices for intentionally policy-free server-only RLS tables, with no new warning or error.
- Production remained at 0 analysis runs and 0 lab values after the correction.
- PR #118 is mergeable but GitHub reports `UNSTABLE` solely because of the separate `anham-mobile-app` status.
- Merge was not performed because the required green-check boundary is not met. Therefore no claim of production deployment or HTTP 200 is made.

## Exact blockers and owner decisions

1. **Merge gate:** repair/remove the unrelated `anham-mobile-app` repository integration, or explicitly approve merging with that known unrelated failed status.
2. **Stripe:** authenticate to the existing merchant account; do not create a replacement account. Then inspect and classify all five retained event IDs and run a test-mode webhook smoke.
3. **Case direction:** Karen must confirm each direction through the secure review gate; the system must not infer it.
4. **Analysis:** obtain explicit document-processing and AI-processing consent for one lawful real Case through an approved flow. Only then may the production pipeline run.
5. **Cron:** after merge/deploy, verify a real Supabase cron HTTP 200, structured runtime log, and a second idempotent production call.

## Final workstream table

| Workstream | Code | Production evidence | Verdict |
|---|---|---|---|
| Cron | Implemented and tested | DB remediation/idempotency yes; HTTP 200 no | PARTIALLY CLOSED |
| Stripe | Queue and offer-version fix implemented | 5 controlled; object inspection/smoke unavailable | BLOCKED |
| Cases | Operational ownership/gates implemented | 26/26 controlled; human decisions pending | PARTIALLY CLOSED |
| Analysis | Existing pipeline retained | consent gate failed safely; no PHI write | BLOCKED_BY_CONSENT |
