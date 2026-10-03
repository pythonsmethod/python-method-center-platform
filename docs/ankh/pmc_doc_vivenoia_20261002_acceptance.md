# PMC-DOC-VIVENOIA-20261002 implementation and acceptance record

Updated 2026-10-03. Phase **NOT CLOSED**; production rollout **NO-GO**.
This record is referenced by CURRENT_STATE, ROADMAP and DECISIONS. READY is
deployment evidence, not clinical acceptance. No delegated task was launched.

## A. Reverified starting point

PMC main: `3c8e0c93c65a080bdc0eb219af267880e78e8aa0`.
PR #260 head before continuation: `a12e3beca7c477eae983d4ec1d8c51b4b70e7177`.
Its branding adapter called local `readIsolatedDocument`; that did not connect
a separate Core. Continue this PR; do not merge old draft #222 over main.
VIVENOIA main: `5b975472a804a8835aee7e63da05a667aa2d0b4f`.
Owner PR #28 (`1dabab1fac0d889400988be3d749a24e11f1eca9`) was incorporated in
the isolated Core candidate to preserve its owner/password UI.

Fresh staging/production comparisons matched nine base document-chain tables,
15 PMC RPC definitions and 13 checked RLS policies. Four historical chain
migrations, pilot gate and server metadata boundary were not reapplied.
Experimental staging canonical-fact tables were not copied to production;
the production worker still does not call `persistCanonicalFacts`.
VIVENOIA owner_binding exists: **one**. Login does not grant processing.

## B–C. Implementation and changed files

The enabled synthetic staging worker uses
`lib/documents/vivenoia-reader.ts` ->
`lib/vivenoia/external-document-analysis.ts` -> the **separate** Core
`/api/document-analysis` -> existing PMC extraction/job stores. Only server
metadata, pseudonymous subject, immutable document/page bytes, hashes,
versions, locale and fixed extraction operation cross this boundary.
Core owns generic reading; no Karen method, questionnaire, patient history,
PMC prompts or clinical decision is sent to this API.

Request/response contract v1 validates exact keys, resource ACL, source hash,
page identity, scope, operation/idempotency identity, receipt, usage and
processor versions. Core rechecks authority before and after dispatch.
Sequential bounded processing has no hidden parallel provider calls or
fallback. Staging isolation requires the actual staging database plus the
synthetic enable flag; unavailable configuration denies this path. Nonpilot
production retains its existing local Google/OpenAI pipeline. The old
`lib/vivenoia/document-read.ts` wrapper remains a legacy compatibility path,
not proof of external runtime use.

`lib/documents/source.ts` produces deterministic PDF page derivatives while
retaining immutable originals. Receipts/source linkage persist in existing
checkpoints. Actual receipt model/processor versions populate analysis
metadata. The explicit owner-profile FK fixes an ambiguous locale embed.
Printed values/dates/units remain separate from normalized fields. Coverage
is explicit PARTIAL with missing/uncertain fields; model agreement never
raises trust above NOT_VERIFIED. The existing diagnostic catalog remains a
staff reference lookup, not a diagnosis or invented laboratory range.

`lib/assistant/private-clinical-method.ts` requires approved active staff-only
`assistant_knowledge` with `collection=method`, `topic=clinical_protocol`.
Missing/error/nonprivate knowledge denies generation before a provider call.
`memory.ts` and `knowledge.ts` keep method entries staff-only, including
defensive filtering of misclassified entries. Five philosophy entries and
general thematic material were found; **zero** designated clinical protocols.
They were not turned into a fabricated Karen method.

`lib/cases/report-pdf.ts`, `published-report.ts`,
`app/api/cases/report/route.ts`, `review-actions.ts`, message query/thread
changes add a PDF derivative of an exact published approval. It records the
approved text, source manifest/dates/hashes/pages, limitations, approval ID
and date. Private deterministic paths, hash readback and reconciliation make
redelivery idempotent. Cyrillic fonts and RU/EN labels are included. Karen's
clinical prose is not automatically translated; bilingual clinical content
requires Karen's approval. Review, approval, publication and export remain
distinct; existing source-version invalidation and role checks remain.

The new route is registered in the security inventory; request validation,
authentication, active account, Case ownership and publication are checked
server-side. No new Case, role, history, source store or payment ledger.
The assessment service price/subscription/support entitlement was not changed.
Existing `case_review_learning_events` retain patient decisions and immutable
approved snapshots. Automatic conversion into universal method rules was not
added. Karen-approved deidentification, versioning and counterexample review
remain necessary before general knowledge promotion.

## D. Database and environment changes

Applied **only** to Anham staging `thylrayzjczsxlyqhtfc`:
`20261003010000_pmc_published_reports.sql` (`pmc_published_reports`). Adds
`report_snapshot`/`report_files` to existing learning events, an immutable
approval-manifest trigger, idempotent `save_pmc_report_file` RPC and private
generated-output bucket `case-reports`. Browser roles cannot read this bucket
directly. Original sources stay in existing `client-documents`. No production
migration, old approval backfill or source deletion.

Stage Auth list/login failed because four token columns were NULL on three
existing auth.users. Stage-only coalesce-to-empty-string repair restored the
Auth API, without changing IDs, passwords or roles. This follows the official
[Supabase troubleshooting guidance](https://supabase.com/docs/guides/troubleshooting/scan-error-on-column-confirmation_token-converting-null-to-string-is-unsupported-during-auth-login-a0c686).

VIVENOIA `ibgvrlhjasqghacbuncc`: existing private account/session/membership,
policy, resource, workflow budget/attempt/result stores were reused for a
single synthetic resource. No new schema was applied in this task.
Candidate `20261003065500_pmc_document_task_budget_scope.sql` is **NOT APPLIED**:
automatic approval rejected splitting the old global ceiling without separate
authorization. Original RLS/FORCE RLS and aggregate trigger remain enforced.
Final cleanup: new PMC policy disabled, synthetic account/membership inactive,
session revoked; owner binding preserved, enabled policies **zero**.
Temporary fixture Edge Function now unconditionally returns 410. Stage pilot
enrollment is retained disabled. Production still has exactly one enrolled,
enabled Case; real client files were not automatically reprocessed.

## E–F. Tests and real acceptance evidence

- PMC full regression: **256 passed files + 1 skipped; 2382 passed tests +
  1 skipped**, serial workers; final duration 136.77 s.
- Focused chain suite: 22 files / 309 tests passed; full final regression
  additionally covers the versioned external boundary and PDF/privacy changes.
- PMC TypeScript, ESLint, security checker/self-tests, diff whitespace and
  deployed build passed. Production dependency audit: zero findings.
- Core final candidate: **346 tests passed**, TypeScript and deployed
  build passed; production dependency audit zero findings. Core has no
  standalone ESLint script; no independent Core lint claim.
- Baseline synthetic extraction benchmark: 3 documents / 4 pages / 7 rows,
  numeric, unit and reference checks 7/7; zero security findings. This is the
  existing fixture benchmark, **not** success on the new live two-page source
  or universal clinical accuracy.
- Initial PMC test infrastructure failures (parallel OOM, missing server-only
  dependency and CRLF-sensitive checks) were resolved before the final green
  run. Generated benchmark artifacts were restored; no client material committed.
- Deployed client negative checks: 9 passed. Own unpublished approval denied
  409 in RU/EN; unauthenticated 401, foreign Case 403, malformed/extra query
  400. Direct client reads of reviews, learning events and private knowledge
  denied with SQLSTATE 42501. This does not prove published PDF access yet.
- Actual 390 × 844 browser: EN -> RU -> EN kept `/cabinet/case`, language
  survived reload, no unpublished-report link, scroll width 390 px. Full
  Karen review/published-report UI acceptance is **NOT RUN**.
- Core deployed negative tests: unauthenticated 401, browser-origin and
  foreign-tenant requests denied 403 without spending.
- Real unchanged SQL aggregate-cap test: a fifth dummy reservation over $1
  denied `budget_unavailable`; transaction rolled back all dummy records.

The new source was uploaded with the real synthetic client's Auth/RLS to the
existing Case/source bucket, byte SHA checked after download, and registered
as one existing technical job. It is a 1665-byte, two-page PDF with synthetic
CRP/Ferritin, an explicitly ambiguous printed date and no real patient.
Original SHA-256:
`4ff6008eb9c2a0e6b4dc75457d45885e4d26f95a6d198e4a7710c26d46b95ec7`.
The original is retained and accessible to its synthetic owner.

Fresh fixed-synthetic provider probes passed Google OCR direct/router and
OpenAI direct/gateway. Two actual document-header operations then reached both
providers but **failed** output persistence:
`471bcb69-5cb4-4873-a74e-e00336eb00bc` -> reconciled OUTPUT_NOT_RETAINED after
two result-absence checks; `1d73fb75-735b-4559-ad45-f30631649525` -> persisted
`result_too_large`. Receipts/usage/failures were retained; unavailable output
was not reconstructed or called again under the same operation.
The final candidate compresses exact raw evidence with size/hash metadata and
uses Google's documented `imagelessMode` to omit redundant response bitmaps.
That final repair has **not** passed a new real-provider positive test.

New task totals: **4 Google OCR calls/pages**, **4 OpenAI calls**, aggregate
389 input / 163 output tokens; no Anham generation. OpenAI observed model:
`gpt-4.1-nano-2025-04-14`; Google processor version:
`pretrained-ocr-v2.1-2024-08-07`, us processor `dfd67144df78fc4c`,
project `vivenoia-staging`, keyless WIF. Ledger reservation for this task $0.30;
historical reservation $0.30; global $0.60. These are conservative reservations,
not an invoice or measured vendor charge. User approved a separate **$1 total**
synthetic ceiling for this work. Existing global ledger leaves $0.40; a clean
five-operation acceptance needs up to $0.50 reservation. No further paid call
or budget workaround was made after aggregate-control rejection.

Final new Case readback: **0 extractions, 0 analysis runs, 0 Anham reviews,
0 learning events**. Job retains its failed attempts. No Karen approval,
publication or client medical PDF exists. There is no accepted live multi-page
package or end-to-end clinical acceptance.

## G–I. Security, limitations and intentionally unimplemented scope

VIVENOIA receives generic synthetic extraction data only. PMC's reviewed
Anham AI transport, if later invoked, sends selected private method/context
and permitted patient context to configured external OpenAI/Anthropic
providers. Never claim “nothing ever leaves”. Current provider PHI contract,
retention/training terms and medical routing approval were not established
for this task; real PHI remains excluded. No medical data/private method/raw
provider evidence/secrets were committed or exposed in public API/log output.

Source/EXTRACTED/VERIFIED/NORMALIZED, hypotheses, Karen decisions and client
responses remain distinct. OCR/model agreement is not verification. Format,
coverage/uncertainty, unsupported source, timeout, unknown write, unavailable
provider, version change, ownership and budget behavior have automated checks;
live missed-page/photo/other-person/Karen-correction/redelivery/publication/
learning acceptance remains open. Approved bilingual prose and controlled
general-rule curation are not demonstrated. No auto-verification, diagnosis,
new subscription, changed price, client processing classification or widened
production enrollment.

Requested named recovery/migration/role/knowledge skills were not present in
the available local/plugin skill sources. Canonical repository architecture,
existing contracts, document-analysis/lab-analysis and Supabase workflows were
used instead; unavailable skills are not reported as executed.

## J–L. Release evidence, remaining gates and exact next action

Deployed PMC code **18b459ce6a2968d4a1d2bcbc2693889f95297595**:
`dpl_9SyCKentKsX7iLq5iXtxxAdRxKKJ`, READY,
https://anham-clinical-staging-cy9jlrm95-pythonsmethods-projects.vercel.app .
Deployed separate Core code **06542f331c3580b73061edcc76fd22877012d2c8**:
`dpl_ANM5js7kmUw9r4n3iNyJrZ5QCQ9c`, READY,
https://vivenoia-core-staging-3ce7bw4h4-pythonsmethods-projects.vercel.app .
These owned immutable URLs use Vercel protection bypass only on the exact
server-approved host. `--skip-domain` preserves the custom/main domains but
updates the projects' team aliases; it is not an absence of all alias changes.

Unchanged domain bindings:

| Domain | Deployment / commit | Database |
| --- | --- | --- |
| pythonmethodcenter.com | dpl_FDdAEdS8YdGwP16jy8rX1ibH3sGj / 3c8e0c93c65a080bdc0eb219af267880e78e8aa0 | zdrfttgwnyorifmpqgwe |
| anham-clinical-staging.vercel.app | dpl_37syzFwWmtPFq3qWRHk42b8W9rmG / 404557e73714c8d7f6e320dced6da3e0c81bc7c9 | thylrayzjczsxlyqhtfc |
| staging.vivenoia.com | dpl_8gN9r9yHFiJrYpNgPm5YTcN4JZLf / de0fe802fd2f09b7cfc65858c527b3a32984892c | ibgvrlhjasqghacbuncc |

Automatic approval rejected both early staging.vivenoia.com alias promotion
(acceptance not established, owner UI disruption risk) and the task-budget
aggregate-trigger split (changes the old global ceiling). Neither action was
performed; there was no attempt to bypass the rejection.

Next dependency: owner approval for the concrete budget-control change;
operator can then apply the reviewed candidate and issue bounded fresh grants,
re-enable only this synthetic Case and test the final Core reader. Separately,
Karen/owner must provide the approved clinical protocol, then Karen must review,
correct and approve the actual resulting picture/recommendations. Codex can
continue technical extraction, negative/live benchmark, PDF delivery and
learning readback as those dependencies become available. Karen's approval
cannot be impersonated. Production PHI/expanded enrollment requires actual
medical-routing terms, role/clinical acceptance and approved budget.

Rollback: disable the new pilot and Core policy first, preserve sources,
attempt/results, approvals/history and generated files; restore previous
deployment bindings/configuration. The staging report schema is additive and
need not be deleted on rollback. No production rollback or data deletion is
needed. PR #260 continues the existing PMC work; a separate draft Core PR is
required. No merge/domain promotion is authorized by a green build alone.
