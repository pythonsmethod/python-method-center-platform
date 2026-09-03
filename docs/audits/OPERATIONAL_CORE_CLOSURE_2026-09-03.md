# Operational Core Closure — 2026-09-03

## 1. Executive verdict

The operational core is **partially closed**. Deterministic service-period expiry is remediated in production with audit and idempotency. Every current Case now has a role owner, an explicit human gate, and a bilingual next action. Every historical unmatched-payment alert has an explicit protected reconciliation status. Stripe object-level reconciliation is blocked by access to the existing merchant account, and the first real analysis run is blocked by the absence of qualifying consent records. No identity, clinical direction, or medical fact was guessed.

## 2. Baseline

- Main SHA: `eef068f034c4c454019d4bc8091831caef1828c6`
- Production SHA: `eef068f034c4c454019d4bc8091831caef1828c6`
- Deployment ID: `5UoQ5XmdsFKoFRe16p8ZHzNMw4js`
- Deployment state: Ready
- Repository migrations: 40 before this branch; production migration-history rows: 26 before remediation.
- Cases: 26 `ready_for_review`; 26 `not_set` directions.
- Onboarding submissions: 23.
- Payments: 1 paid 5-week support; 4 paid test-access records.
- Service periods before remediation: 1 active 5-week; 4 active test-access; 4 active periods already elapsed.
- Stripe event ledger: 3 async-success, 7 checkout-completed, 23 payment-failed.
- Unmatched payment notifications: 5 (4 sent, 1 failed).
- Documents/jobs: 41 ready, 3 failed, 1 needs reupload.
- Analysis runs: 0; lab values: 0; Case AI reviews: 4; review learning events: 0.

## 3. Workstream 1 — Cron

- Root cause: production had no `CRON_SECRET`. The observed 401 traffic was once per minute and therefore was not the configured Vercel Cron (`0 15 * * *`); it is an external monitor/bot. A legitimate Vercel Cron request would also fail closed while the secret was absent.
- Code: authenticated endpoint retained; added structured aggregate result/logging and a canonical transactional maintenance RPC.
- Configuration: production-only `CRON_SECRET` added without exposing its value; a new deployment is required for it to enter the runtime.
- Migration: idempotent period completion, unique `service_period_completed` lifecycle event, and conservative Case alignment only from `active_support` when no later entitlement exists.
- Tests: unauthorized/authorized auth helper, empty/batch/retry summary, elapsed/future/scheduled/multiple-period/idempotency/audit SQL contract.
- Production evidence: canonical remediation completed 4 periods and wrote 4 lifecycle events; immediate repeat returned 0/0/0.
- Expired active periods: 4 before, 0 after.
- Status: **PARTIALLY CLOSED** pending deployment of the new endpoint and an authenticated production HTTP acceptance call visible in runtime logs.

## 4. Workstream 2 — Stripe reconciliation

- Total unmatched events: 5.
- Resolved automatically: 0.
- Already recorded: 0 proven.
- Test/duplicate: 0 proven.
- Remaining human-identity blockers: 5.
- All five now have status `REQUIRES_OWNER_IDENTIFICATION`, an exact reason, and an exact next action in a server-only RLS table.
- The retained notification payload contains only title/link; Stripe Checkout objects required for strict matching are not stored in Postgres.
- Existing Stripe merchant access was unavailable; the attempted Google route offered to create a new Stripe account, which was intentionally refused.
- `offer_version`: no historical backfill was made without consent-time provenance.
- Status: **BLOCKED** on owner access to the existing Stripe merchant account; no payment or service period was guessed or duplicated.

## 5. Workstream 3 — Case sweep

- Total Cases: 26.
- Confirmed real/test/duplicate/incomplete: 0/0/0/0; evidence was insufficient for automatic identity classification.
- Active support: 0 Cases by Case status; period state remains a separate model.
- Waiting for client/in review: 0/0 by Case status.
- Blocked for human direction: 26.
- Cases without owner: 0 after sweep (assigned to canonical Karen role; no profile identity was guessed).
- Cases without next action: 0 after sweep.
- Every Case retains `direction=not_set` and has an explicit secure-review blocker, bilingual next action, responsible role, and a recorded reason for no inferred due date.
- No mass archive or clinical/status inference was performed.
- Status: **PARTIALLY CLOSED**. Data control is complete; a dedicated consolidated admin operational screen and per-Case human confirmations remain.

## 6. Workstream 4 — Analysis pipeline

- Permitted Case selected: no.
- Consent gate: 0 Cases have the required accepted data-processing, document-processing, and AI-processing consent set; 0 objectively eligible non-test Cases.
- Analysis run created: no.
- Lab values created: 0.
- Unresolved/blocker count: production run blocked by consent; no PHI was opened or exported.
- Idempotency: existing automated tests cover pipeline persistence/idempotency; no production write was attempted.
- No-interpretation boundary: held; no diagnosis, recommendation, or client message was produced.
- Status: **BLOCKED_BY_CONSENT**.

## 7. Files changed

- `app/api/documents/process/route.ts`
- `lib/maintenance/cron.ts`
- `lib/payments/expire-periods.ts`
- three operational migrations
- operational regression tests
- this sanitized audit report

## 8. Migrations added/applied

- `operational_core_maintenance` — applied and registered.
- `case_operational_control` — applied and registered.
- `payment_reconciliation_items` — applied and registered.

All new public tables have RLS enabled, no client policies, and explicit `anon`/`authenticated` revocation because they are intentionally server-only.

## 9. Tests

- Baseline `npm ci`: passed, 0 vulnerabilities.
- Baseline lint: passed.
- Baseline typecheck: passed.
- Baseline tests: 102 files, 759 tests passed.
- Baseline build: passed after allowing the existing Google Font fetch.
- New operational tests: passed.
- Final full checks: pending final commit run.
- Production smoke: database remediation and repeat-run acceptance passed; HTTP acceptance pending deployment.

## 10. Production evidence

- Baseline deployment SHA/state: `eef068f…`, Ready.
- Runtime logs: repeated minute-by-minute unauthenticated `GET /api/documents/process` returned 401; no new 5xx were visible in the inspected window.
- Database after-state: elapsed active periods 0; Cases without current assignment 0; Cases without open next action 0; payment reconciliation statuses total 5, all controlled; analysis runs/lab values remain 0 because consent gate failed.

## 11. Remaining blockers

1. Existing Stripe merchant access — the available sign-in route offered account creation, not access. Owner action: sign in to the existing merchant account in the protected browser. The protected queue can then resolve each event by strict trust order.
2. Case direction — no direction is human-confirmed. Owner action: Karen completes the secure operational queue. Each confirmation can update direction/status through an audited server action.
3. Analysis consent — no Case has the required accepted consent set. Owner action: approve/use a lawful secure consent flow for a suitable Case. The canonical pipeline can then run without further architecture work.
4. Cron HTTP acceptance — new runtime is not yet deployed. Owner action: none if CI/deployment succeeds; the authenticated acceptance call continues after deployment.
5. Merge gate — the primary project preview is Ready/SUCCESS, but the unrelated `anham-mobile-app` Vercel project reports FAILURE on the PR. Owner action: repair or explicitly waive that repository check; merge and production acceptance then continue.

## 12. Final workstream table

| Workstream | Code | Production | Data remediated | Verdict |
|---|---|---|---|---|
| Cron | Implemented/tested | DB applied; runtime deployment pending | 4 periods, 4 audit events | PARTIALLY CLOSED |
| Stripe | Protected queue implemented | Applied | 5 events controlled; 0 guessed | BLOCKED |
| Cases | Ownership/next-action schema implemented | Applied | 26/26 controlled | PARTIALLY CLOSED |
| Analysis | Existing pipeline verified | Consent gate failed safely | No PHI write | BLOCKED_BY_CONSENT |

## 13. Commits and deployment

- Branch: `codex/close-operational-core-2026-09-03`
- PR URL: https://github.com/pythonsmethod/python-method-center-platform/pull/118
- Merge SHA: pending
- Production deployment ID: pending post-merge
