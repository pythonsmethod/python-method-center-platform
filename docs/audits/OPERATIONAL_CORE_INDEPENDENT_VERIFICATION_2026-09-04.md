# Operational Core — Independent Verification, 2026-09-04

Independent architectural and production review of PR #118
(`codex/close-operational-core-2026-09-03`, head `72d2ffb`, base `eef068f`).

This review was produced without reusing the implementer's report as evidence.
Every number below was obtained by reading the code at the PR head, running the
checks locally, or querying production directly. Where the implementer's claim
and the observed state agree, that is stated as confirmation; where they
disagree, the observation wins.

No production identifier, Case ID, email address, Stripe reference or client
content appears in this document. All production figures are aggregates.

---

## 0. Verdict summary

| Workstream | Verdict | One-line reason |
|---|---|---|
| 1 — Cron and maintenance | **PARTIAL** | Root cause proven; database remediation proven; the authorized path has never once succeeded in production. |
| 2 — Stripe reconciliation | **PARTIAL / BLOCKED** | Every unmatched event has a controlled outcome and nothing was guessed, but `offer_version` records an assertion rather than provenance. |
| 3 — Case sweep | **PARTIAL** | 26/26 Cases owned and gated without inferring direction; the sweep itself wrote no audit trail and has no terminal-status guard. |
| 4 — First production analysis run | **BLOCKED (correct)** | The consent gate is real and was verified independently: nothing ran, nothing was written, nothing was interpreted. |

Merge recommendation: **do not merge as-is.** Two items must be resolved first —
finding F1 (offer-version provenance, a correctness defect in payment records)
and finding F3 (the PR ships two contradictory root-cause records into
`docs/audits/`). Everything else can follow the merge.

---

## 1. What I verified myself

### 1.1 Local checks at the PR head (`72d2ffb`)

| Command | Result |
|---|---|
| `npm ci` | exit 0, 0 vulnerabilities |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm test` (`vitest run`) | **105 files, 771 tests, all passed** |
| `npm run build` | exit 0, compiled in 24.3 s |
| `git diff --check origin/main...HEAD` | **1 issue: new blank line at EOF in `docs/audits/OPERATIONAL_CORE_CLOSURE_2026-09-04.md`** |

The PR body states "npm test (770/770)" and that `git diff --check` passed.
The true figures are 771 tests and one whitespace finding. Both are trivial in
themselves; they are recorded because this review exists to check the evidence,
not to restate it.

### 1.2 Prohibited reintroductions

Counted per file at the PR head and compared with `origin/main`:

| Prohibited item | Result |
|---|---|
| Automatic emergency / red-flag escalation | **Absent.** Occurrences of red-flag vocabulary exist only in historical migrations and in unrelated legal text; every file's count is identical to `main`. |
| `escalation_events` | **Absent in code and absent in production** (`information_schema.tables` → 0). Remaining mentions are the historical migrations that created and then dropped it. |
| PayPal | **0 occurrences** anywhere in the tree. |
| Legacy Telegram logic | Notification code untouched by this PR; no new `notifyTeam` kind, no new channel. |
| Parallel Case state machine | **Not introduced.** The maintenance function transitions the existing `client_cases.status` enum only, and only `active_support → inactive_support`. See §4.3 for the one architectural watch item. |
| PMC Learning Loop | **0 occurrences.** |

### 1.3 Production state (read-only queries)

Production application SHA is still `eef068f` — the PR is **not merged** and the
new runtime is **not deployed**. The three migrations, however, are already
registered in production, and the production data was already remediated from
the unmerged branch. See finding F4.

---

## 2. Workstream 1 — cron and maintenance → **PARTIAL**

### 2.1 Is the cause of the 401 proven? — **Yes, and I proved it independently**

The Supabase job `process-uploaded-medical-documents` exists and is running.
`cron.job_run_details` reports the most recent wrapper execution as
`succeeded`, while the HTTP layer tells a different story:

| Measure (production, retained `net._http_response` window) | Value |
|---|---:|
| Retained response rows | 360 |
| of which HTTP 401 | **360** |
| of which HTTP 200 | **0** |
| of which HTTP 5xx | 0 |
| Most recent 200 | **never** |
| Distinct status codes in the last 2 hours | `401` only |

`net._http_response` records only responses to requests made by `pg_net` — that
is, by the database's own cron job. An external monitor or bot hitting the
Vercel endpoint could not appear in this table at all. The 401s are therefore
the platform's own scheduler failing closed, exactly as the 2026-09-04 document
concludes, and **not** an external scanner as the 2026-09-03 document in the
same PR claims. See F3.

The wrapper reporting `succeeded` while every HTTP response is 401 is the trap
worth keeping in the record: the SQL side of a `pg_net` call succeeds by
definition, so `cron.job_run_details` can never be used as evidence that a
cron job works.

### 2.2 Does an authorized cron request pass? — **Unproven**

This is the central gap. `isCronAuthorized` is unit-tested for four cases
(missing secret, absent header, wrong value, exact match) and the tests pass.
But in production **no request to this endpoint has ever returned 200** in the
retained history. The current 401s are consistent with the implementer's own
statement that the secret was added to project configuration but has not
entered a running deployment, and they are equally consistent with a secret
that does not match the value `pg_net` sends. Nothing available to me can
distinguish those two, and neither can the PR.

I did not attempt to obtain or use the secret, and an independent reviewer
should not: knowledge of the secret would make the test prove nothing about
the deployed configuration.

### 2.3 Does an unauthorized request stay closed? — **Yes**

Fail-closed behaviour is proven twice: by the unit tests, and by 360 live 401
responses in production against the same authorization logic.

### 2.4 Are expired periods completed, without duplicate lifecycle events? — **Yes**

| Measure | Value |
|---|---:|
| Active periods whose `ends_at` has elapsed | **0** |
| Periods `completed` | 4 |
| Periods `active` | 1 |
| `service_period_completed` lifecycle events | 4 |
| … of which written by `operational_maintenance` | 4 |
| Service-period IDs carrying more than one completion event | **0** |
| Future-dated `active` periods (renewal stacking) | 0 |

Idempotency is structural, not procedural: a partial unique index over
`(metadata ->> 'service_period_id')`, restricted to `service_period_completed`
events, makes a second completion event for the same period impossible rather
than merely unlikely. The function's `ON CONFLICT … DO NOTHING` infers that
index. This is the right shape and matches how the rest of this codebase
enforces its guarantees.

The Case-alignment step is conservative in the right direction: it moves a Case
out of `active_support` only when no later `active` or `scheduled` period
remains, so a renewal bought before the current period ends cannot cause a
spurious downgrade. In production it changed nothing, because all 26 Cases sit
in `ready_for_review` and none were in `active_support`.

### 2.5 Production evidence — **partial**

Database evidence: present and confirmed. HTTP evidence: absent.

### 2.6 Required actions

1. **Before merge (F3):** correct or withdraw the contradictory root-cause
   paragraph in `OPERATIONAL_CORE_CLOSURE_2026-09-03.md` §3.
2. **After merge and deployment:** confirm a real HTTP 200 in
   `net._http_response`, and the `operational-maintenance-complete` line in the
   runtime log. Until a 200 exists, this workstream is not closed.
3. **Fix F2** (below) before relying on the endpoint as the maintenance path.

---

## 3. Workstream 2 — Stripe reconciliation → **PARTIAL / BLOCKED**

### 3.1 Did every unmatched event get an outcome? — **Yes, in the weak sense**

| Measure | Value |
|---|---:|
| Unmatched payment alerts in `notification_events` | 5 |
| Alerts with no corresponding reconciliation item | **0** |
| Reconciliation items | 5 |
| … with status `REQUIRES_OWNER_IDENTIFICATION` | 5 |

Every historical unmatched event now has exactly one durable, server-only
record with a status, a reason and a named next action. None is resolved; all
five are parked behind an explicit human gate. That is an honest outcome, not
a closure, and the PR says so.

### 3.2 Was anything guessed during client matching? — **No**

| Measure | Value |
|---|---:|
| Reconciliation rows carrying a candidate profile or Case | **0** |
| Reconciliation rows containing an email-shaped string in reason, next action or metadata | **0** |

No identity was inferred, and no PII was copied into the new table.

### 3.3 Duplicate payments or periods? — **None**

Payments total 5 (`test_access` ×4, `support_5_weeks` ×1); service periods
total 5, one per payment. No duplicate rows were created by the remediation.

### 3.4 Does the 500 USD review open a service period? — **No, by code; untested in production**

`isPlanProduct` returns false for `preliminary_assessment`, so
`openServicePeriod` returns `not-applicable` before touching the table. This
logic is unchanged by the PR and is covered by existing tests. Production
cannot confirm it because **no review payment exists yet** (0 rows). Verdict:
correct by construction, unproven by observation — and it will stay unproven
until the first review is actually paid for.

### 3.5 Do renewals burn remaining days? — **No, by code; untested in production**

A renewal starts at the current period's `ends_at`, not at payment time. No
renewal has occurred in production (0 future-dated active periods), so again
this is proven by code and tests only.

### 3.6 Does `offer_version` have provable provenance? — **NO. This is finding F1**

**Severity: high.** The PR adds `offer_version: OFFER_VERSION` to the payment
record written by the Stripe webhook. `OFFER_VERSION` is a compile-time
constant — at this head, `oferta-v6`. It is not what the client accepted.

The platform already records the real acceptance:
`recordPaymentOfferAcceptance` writes a `consent_records` row with
`consent_type = 'offer_acceptance'`, the offer version **as it stood at the
moment of acceptance**, the source (`payment_page` or
`payment_immediate_start`), and the product in metadata.

Production makes the gap concrete:

| Measure | Value |
|---|---|
| Accepted offer acceptances | 25 |
| Distinct accepted versions | 3 |
| Which versions | `oferta-v2`, `oferta-v4`, `oferta-v5` |
| `OFFER_VERSION` at the PR head | `oferta-v6` |
| Payments carrying an `offer_version` | 0 of 5 (no backfill — correct) |

**No client in this database has ever accepted `oferta-v6`.** The next payment
processed by this code will be stamped `oferta-v6` regardless of which edition
the payer actually accepted. Two concrete ways this produces a false record:

1. A client accepts the current edition, the offer is republished, and their
   asynchronous payment settles afterwards — the payment claims an edition
   published after their acceptance.
2. A guest pays without signing in. `recordPaymentOfferAcceptance` returns
   early when there is no session, so **no acceptance exists at all** — and the
   payment still asserts one.

`payments.offer_version` is the field a refund dispute would rest on. A value
that restates the current constant is not provenance; it is an assertion the
platform cannot support.

The new test (`tests/stripe-offer-version.test.ts`) asserts only that the
constant is imported and referenced. It would pass unchanged if the recorded
version were wrong for every client, so it does not protect the property it
appears to protect.

**Required action.** Resolve the version from the client's own acceptance:
select the most recent accepted `offer_acceptance` consent row for that profile
and product at or before `paid_at`, and copy its `version`. When no acceptance
exists — the guest case — leave `offer_version` null and raise a reconciliation
item with an explicit reason, rather than writing a version nobody accepted.
Then change the test to assert the value's origin, not its presence.

### 3.7 Remaining risk and required action

Object-level reconciliation is genuinely blocked on access to the existing
Stripe merchant account, and refusing to create a replacement account was the
correct call. The five gated events remain unresolved until the owner signs in.
That blocker is outside the PR's control and is reported honestly.

---

## 4. Workstream 3 — operational Case sweep → **PARTIAL**

### 4.1 Owner and next action, or a controlled blocker? — **Yes, 26/26**

| Measure | Value |
|---|---:|
| Cases | 26 |
| Cases with a current owner | 26 |
| Cases with more than one current owner | **0** |
| Cases with an open next action | 26 |
| Next actions missing both a due date and a stated reason | **0** |
| Operational profiles | 26 |
| Distinct current owner roles | 1 (`karen`) |
| Assignments naming an individual person | **0** |

Ownership is assigned to a **role**, not to a guessed individual, and every
action carries `no_due_reason` instead of an invented deadline. One current
assignment per Case is enforced by a partial unique index. Actions are
bilingual as required.

### 4.2 Is direction inferred from medical data? — **No**

All 26 Cases retain `direction = not_set`; all 26 operational profiles are
`classification = 'unknown'`; all 26 next actions are `confirm_direction`,
addressed to a human. The migration derives the blocker solely from
`direction = 'not_set'` — there is no clinical input to the classification at
all.

### 4.3 Are test or duplicate Cases identified by name? — **No**

Zero Cases were classified as `real`, `test`, `duplicate`, `incomplete` or
`abandoned`. The SQL contains no name, email or string matching of any kind.
This is the correct refusal: the evidence did not support classification, so
none was made.

Architectural note, not a defect: `case_operational_profiles.classification`
introduces a second descriptive axis on a Case alongside `status` and
`direction`. It is operational rather than clinical and is documented as such,
but it is worth watching that it does not grow into a competing state model.

### 4.4 Do status changes write lifecycle or audit events? — **Partly. This is finding F4**

Period completion writes `case_lifecycle_events` — four events, one per period,
no duplicates. Good.

The Case sweep itself wrote **nothing to `audit_logs`**:

| Measure | Value |
|---|---:|
| `audit_logs` rows referencing the operational sweep in the last 48 h | **0** |
| Production rows created by the sweep | 26 + 26 + 26 |

Seventy-eight rows were written across three new tables in production, plus
four period completions, and the platform's own audit trail records none of it.
Provenance survives only as a jsonb field inside the rows the sweep created —
which is precisely the shape of evidence that cannot answer "who ran this, and
when". `writeAuditLog` exists for this and was not used.

### 4.5 Is the archived-versus-permanent conflict resolved, or resolved silently? — **Latent, finding F5**

`initialize_case_operational_control` selects `from public.client_cases` with
**no status filter**. `case_status` includes `completed` and `archived`. A Case
in either state would receive a role owner and an open "confirm the direction"
action, which contradicts its own terminal status.

Today this is not triggered: all 26 production Cases are `ready_for_review`,
and I confirmed 0 open actions and 0 owners on terminal-status Cases. The
defect is latent, not active — but the function is designed to be re-run, and
the first archived Case will surface it silently.

**Required action.** Exclude terminal statuses, or record an explicit reason
for including them.

---

## 5. Workstream 4 — first production analysis run → **BLOCKED (correctly)**

### 5.1 Was the consent gate really checked? — **Yes, and I verified it independently**

| Consent type | Accepted records |
|---|---:|
| `data_processing` | 23 |
| `document_processing` | **0** |
| `ai_processing` | **0** |

No Case in production carries the consent set an analysis run requires. The
gate did not merely report a refusal; the underlying data makes any other
outcome impossible.

### 5.2 Everything downstream — **correctly absent**

| Measure | Value |
|---|---:|
| `analysis_runs` | 0 |
| `lab_values` | 0 |

No run was created, so no `lab_values` exist, no identity/duplicate/unit
blocker was exercised on real data, and no diagnosis, treatment or client-facing
recommendation was produced. Repeat-run idempotency remains covered by the
existing test suite only; it has not been exercised in production, and cannot
be until a lawful Case exists.

This is the correct outcome. A task authorisation is not a client's consent,
and the implementation stopped at the right line.

### 5.3 Required action

Obtain explicit document-processing and AI-processing consent for one real Case
through an approved flow. Only then may the pipeline run — and the first run
should be reviewed with the same scrutiny as this PR.

---

## 6. Findings, by severity

| # | Severity | Finding | Required action |
|---|---|---|---|
| **F1** | **High** | `offer_version` records the current constant rather than the edition the client accepted. Production holds acceptances of v2/v4/v5; the constant is v6; a guest payment asserts an acceptance that does not exist. | Resolve from the client's accepted `consent_records` row at or before `paid_at`; null plus a reconciliation item when absent. Rewrite the test to assert origin, not presence. **Before merge.** |
| **F2** | Medium | `expireElapsedServicePeriods` now throws when the service client is unavailable (it previously returned 0) and on any RPC error. The route awaits it with no `try`/`catch`, after the document loop and before the log line, converting a successful document run into an uncaught 500 with no structured evidence. | Wrap the maintenance call; return 200 with an explicit `maintenanceError` flag, or log before failing. |
| **F3** | Medium | The PR adds two audit documents with **contradictory root causes** for the same 401. `…2026-09-03.md` §3 says the traffic is an external monitor and not the cron; `…2026-09-04.md` says it is the cron. Production data settles it in favour of the second. | Correct or withdraw the 2026-09-03 paragraph. **Before merge** — otherwise the repository permanently carries a false record. |
| **F4** | Medium | Production was remediated from an unmerged branch (3 migrations registered, 78 rows created, 4 periods completed) with **0 rows in `audit_logs`**. | Write an audit entry per operational mutation, or record the sweep invocation retrospectively. |
| **F5** | Low–Medium | The Case sweep has no terminal-status filter; `completed` and `archived` Cases would receive owners and open actions. Not triggered today. | Exclude terminal statuses, or state why they are included. |
| **F6** | Low | `summarizeMaintenance` counts retried documents as processed (`processedCount = documents − failed − needs_reupload`), so `processed + retried` can exceed `documents` in the very summary intended as production evidence. | Subtract retries, or rename the field to what it measures. |
| **F7** | Low | PR body says 770 tests and a clean `git diff --check`; actual is 771 tests and one blank-line-at-EOF finding. | Correct the body. |
| **F8** | Info | Both new functions are `SECURITY DEFINER` yet executable only by `service_role`, which already bypasses RLS — the definer rights add attack surface without adding capability. `search_path` is pinned, and Supabase advisors report no new warning. | Optional: switch to invoker. |

### Security, RLS, idempotency, audit, privacy — summary

- **RLS:** all four new tables have RLS enabled, **0 policies**, and no `anon`
  or `authenticated` grants. Verified directly against `pg_class`,
  `pg_policies` and `information_schema.role_table_grants`.
- **Function privileges:** `run_operational_maintenance` — `anon` execute
  false, `authenticated` execute false, `service_role` execute true.
- **Advisors:** security advisors report only INFO `rls_enabled_no_policy` for
  the four new tables — the same expected note that already applies to
  `analysis_runs`, `delivery_tasks`, `medical_digest_issues` and
  `volunteer_assignments`. **No new WARN or ERROR.**
- **Idempotency:** enforced by a partial unique index and by `ON CONFLICT DO
  NOTHING` on a stable dedupe key; 0 duplicate lifecycle groups observed.
- **Audit:** period completion audited; the Case sweep not audited (F4).
- **Privacy:** no email-shaped string and no candidate identity in any new
  table; next-action text is generic and bilingual.

---

## 7. Post-merge verification — **not performed, and it cannot be yet**

The PR is open, production still serves `eef068f`, and the new runtime does not
exist. Everything in step 7 of the review brief is therefore pending. When the
merge happens, these are the checks, and none of them may be inferred:

1. **Production SHA** equals the merge commit.
2. **Vercel deployment** for that SHA reaches `READY` on the production target.
3. **A real HTTP 200** appears in `net._http_response` — the single piece of
   evidence Workstream 1 still lacks. Currently: 360 retained rows, all 401,
   zero 200 ever.
4. **Runtime log** contains `operational-maintenance-complete` with a
   structured summary.
5. **A second cron call** changes nothing: expired periods stay 0, no new
   lifecycle events, no new Case alignment.
6. **No new 5xx** in the runtime logs — with F2 unfixed, a maintenance failure
   would surface here as a 500.
7. **Supabase aggregate after-state** unchanged except by the intended run.

### Merge gate

The PR's only failing check is `Vercel – anham-mobile-app`, a second Vercel
project pointed at this repository whose root directory does not exist on
`main`. It has failed on every PR for weeks, is unrelated to this change, and
was already documented as a known misconfiguration. It should be repaired or
removed rather than waived repeatedly — a permanently red check trains everyone
to merge past red checks, which is the exact habit that makes the next real
failure invisible.

---

## 8. Method and limits

- Reviewed at PR head `72d2ffb` against base `eef068f`; all 12 changed files
  read in full, not as patch fragments.
- Local checks run on a detached checkout of the PR head. The implementer's
  branch was not modified, and no alternative implementation was written.
- Production was queried read-only. No production data was changed by this
  review, and no migration, deployment or merge was performed.
- The cron secret was deliberately not obtained. Any test I could run with it
  would prove something about my knowledge, not about the deployed
  configuration.
- `net._http_response` is pruned by `pg_net`, so 360 rows is the retained
  window rather than a lifetime count. The relevant fact is not the count but
  that the retained window contains no 200 at all, and that no 200 exists in
  the table's history.

---

## 9. Re-verification after the correction pass (same day)

Re-reviewed at PR head `7d52872`, one commit above the head this report was
written against. The correction pass touched ten files; every one was read in
full, and every claim below was re-tested rather than accepted.

### 9.1 Findings F1–F7

| # | Verdict | What I verified |
|---|---|---|
| **F1** | **PASS** | `OFFER_VERSION` is no longer imported by the webhook. A new resolver reads the payer's own accepted `offer_acceptance` consent for the exact product, at or before settlement, newest first, and returns null when two acceptances share the newest timestamp with different versions. `paid_at` now comes from `event.created` rather than webhook-receipt time, so the comparison uses settlement, not processing. No provenance → `offer_version` null plus a reconciliation item; an unmatched payer → no payment row at all, plus a gate item. Six behavioural tests now cover the property, including "uses accepted v5 even when the current site offer is newer" — the exact case the old test could not fail on. |
| **F2** | **PASS** | The maintenance call is wrapped. On failure the document summary survives, an `operational-maintenance-failed` line is logged, the response carries `complete: false` and a sanitized `maintenanceError`, and the status is 500. A redaction helper strips bearer/secret/key/token patterns and truncates; a test asserts the secret never reaches the JSON. |
| **F3** | **PASS** | `OPERATIONAL_CORE_CLOSURE_2026-09-03.md` is deleted. One root-cause statement remains, and it is the one production data supports. |
| **F4** | **PASS** | The sweep function now writes one sanitized aggregate `audit_logs` row per invocation, zero-change repeats included. A guarded insert added exactly one honestly labelled retrospective row for the sweep already executed. Production: 1 audit row, correctly labelled retrospective. |
| **F5** | **PASS** | All three inserts and the eligibility count now exclude `completed` and `archived`. Verified in the deployed function body, not only in the migration file. |
| **F6** | **PASS** | Counts are mutually exclusive: attempted, completed, retried, failed, needs-reupload and other. A test asserts the five categories sum exactly to attempted; `identity_mismatch` lands in "other" rather than being counted as success. |
| **F7** | **PASS** | PR body and audit document both state 105 files and 783 tests. My own run: 105 files, 783 tests. `git diff --check` clean. |

### 9.2 My own checks at `7d52872`

`npm ci` (372 packages, 0 vulnerabilities), `npm run lint`, `npm run typecheck`,
`npx vitest run` (**105 files, 783 tests, all passed**), `npm run build`
(compiled in 27.2 s) and `git diff --check` — all clean.

### 9.3 New finding introduced by the correction pass

**F8 — medium — a second invocation of the sweep will duplicate every open next
action.** The corrected function changed the dedupe key prefix from
`operational-sweep-2026-09-03:` to `operational-control-v2:`. The assignments
insert guards on "no current assignment exists"; the next-actions insert guards
only on `ON CONFLICT (dedupe_key)`. Production holds 26 open actions under the
old prefix, so the first run of the corrected function adds 26 more — two open
actions per Case — while the audit row reports `actions_added: 26` as if it were
new work.

This does not block the merge: nothing in the PR invokes the function, and the
function is already live in production, so merging neither creates nor increases
the risk. It must be fixed before the sweep is next invoked.

*Required action:* add `and not exists (select 1 from public.case_next_actions
na where na.case_id = cc.id and na.status = 'open')` to the next-actions insert,
mirroring the guard the assignments insert already has.

### 9.4 Bookkeeping discrepancy

`20260904163000_operational_core_corrections` is **not registered** in
production's `supabase_migrations.schema_migrations`, although its effects are
applied: the function body carries the terminal-case filter and the audit write,
and the retrospective row exists. The three earlier migrations are all
registered. Re-application is harmless — the audit insert is guarded by `not
exists` and the function is `create or replace` — but the history should record
what was applied.

### 9.5 Production after-state, re-checked

| Measure | Value |
|---|---:|
| Open next actions | 26 |
| Cases with more than one open action | 0 |
| Current assignments | 26 |
| Operational profiles | 26 |
| Sweep audit rows | 1 (retrospective) |
| Payments carrying an `offer_version` | 0 of 5 (no backfill) |
| Reconciliation items | 5 |
| Analysis runs / lab values | 0 / 0 |

The mass sweep was not re-run, as claimed.

### 9.6 Verdict

**READY FOR MERGE.** All seven findings are closed, every check passes, and the
production state matches what the PR describes. Three things remain true and
must not be read as closed by this merge:

1. Workstream 1 stays **PARTIAL** until a real production HTTP 200 appears in
   `net._http_response`. That evidence cannot exist before deployment.
2. Finding F8 must be fixed before the sweep function is invoked again.
3. The `anham-mobile-app` check is still the only red status. It remains
   unrelated, and it should be repaired or removed rather than waived a fourth
   time.
