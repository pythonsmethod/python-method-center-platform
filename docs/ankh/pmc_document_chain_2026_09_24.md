# PMC document chain — 2026-09-24

Owner direction: finish the eleven steps inside PMC; do not move to NEXORA. The old Case 2.9, its documents and real-data replays remain excluded. No existing client record was selected. Branch `fix/pmc-document-chain-20260924` is based on main `42b441d92ba9ca711c1ca7c4d3d99ee95fd1e673`, with the independent literal-data repair, instruction packages and source-bound review concept from PR #189. NEXORA migration PR #222 is not merged.

## Before and after

The existing worker read whole attachments, wrote extraction/lab/run state separately and lost progress on timeout. Source rows could disappear in presentation, and approval/publication lacked a complete version binding. This increment reuses existing PMC storage, Cases, extractions, runs, notes, learning events and messages.

| Step | Current implementation | Verification boundary |
|---|---|---|
| 1. Upload | Owner/Case/path checks; idempotent atomic document and job registration; readback; original retained on uncertain save | Hosted synthetic owner upload/storage/opening passed; clinical acceptance remains open |
| 2. Original | Original-byte SHA256, separate provider derivatives, immutable run snapshot; source overwrite denied | PDF/image and SQL tests; no bounding-box/token claim |
| 3. Preflight | MIME/byte validation, image decode/rotation, physical PDF page count, 25 MiB / 250-page bounds | Synthetic sources; no general clinical OCR accuracy claim |
| 4. Reading | Header checkpoint, physical page per lease, two independent reads, end marker, resumable progress, 90-second deadline | Three hosted attempts failed at header reader; precise provider response not captured in deployed build |
| 5. Facts | Raw values/readings and page/hash/excerpt retained; per-row printed dates/material/method; separate numeric projection | No document-wide date substituted for an explicitly unknown row date |
| 6. Review | Repeated captions cannot overwrite one another; uncertainty/date/reference differences preserved; optional correction on every row | Exact extraction/snapshot/token binding; no stale review transfer |
| 7. Labs | Explicit units only; ambiguous/censored/range values remain source-only; missing/different material/method blocks trends | Conservative comparison tests; human corrections do not silently rewrite normalized values |
| 8. ANHAM | One selected-Case paginated evidence tool for text/voice; synthesis includes saved Case context, current staff knowledge and authenticated speaker's Case history | Knowledge/history excerpts explicitly partial; no other staff member's private chat |
| 9. Internal synthesis | Internal wording, valid source references required, complete pending queue, source fingerprint checked before reads and during save | Oversized context rejected; no automatic diagnosis or approval |
| 10. Karen | Verified sign-in, exact draft timestamp/fingerprint, source-bound decisions, all pending disputes block approval | App tests and synthetic DB actor; legitimate hosted Karen session pending |
| 11. Client result | Separate explicit publication of saved approved text; one immutable linked message per approval; readback | Actual isolated DB path passed and rolled back; no real client message |

The provider boundary remains the existing PMC Claude attachment reader. No new external API/provider or NEXORA runtime is activated. Document/lab instruction packages and their 55 checks are retained contracts, not proof that every named ANHAM dependency or the entire v2 skill runtime exists.

## Reliability and access

- Lost HTTP acknowledgement after committed success reconciles to ready; stale leases cannot reset another worker.
- Extraction, numeric projection, immutable snapshot and ready state commit atomically; errors roll everything back.
- The active cabinet resumes its owner's queue on entry, upload and visibility return, with a one-minute retry timer and bounded page requests. The existing daily cron remains the closed-cabinet fallback. Five-minute cron was rejected by the current Vercel Hobby plan; that incompatible change was removed. Closed-cabinet background retries can wait until the next daily run. No existing hosted worker was invoked.
- Source/reading/review changes invalidate approval. Multi-query evidence reads check a stable fingerprint. Save success requires readback.
- Queries paginate past PostgREST's row cap; a failed page or 100,000-row ceiling returns unavailable. Internal synthesis has an explicit 180,000-character picture bound.
- New RPCs are invoker-rights and service-role-only. No client Case status, urgency or priority was added.
- Staging lacked the original-document bucket and retained permissive metadata policies. Added private source storage, own-Case upload, owner-only read, no overwrite and restrictive server-only document metadata writes. Existing permissive policies cannot widen these boundaries.

## Files and schema

Implementation: `lib/documents`, `lib/assistant`, `lib/analysis`, `lib/analytical-picture`, `lib/cases`, upload/process/source-view routes and the two Case review panels. Regression tests and a bounded synthetic workflow are included. `pdf-lib@1.17.1` is pinned for physical page inventory and derivatives; existing lockfile platform metadata is retained.

Four additive migrations, applied only to isolated staging `thylrayzjczsxlyqhtfc`:

1. `20260924012755_pmc_document_chain.sql`: job progress, raw values/source anchors, immutable snapshots, approval-linked messages and transactional RPCs.
2. `20260924015616_pmc_document_chain_settlement.sql`: real document-intake enum in retry/failure settlement.
3. `20260924020407_pmc_document_chain_lab_context.sql`: specimen/method context beside numeric projections.
4. `20260924021210_pmc_document_chain_source_boundary.sql`: private bucket and restrictive source policies.

Production `zdrfttgwnyorifmpqgwe` was not migrated. `tests/sql/pmc-document-chain-staging-smoke.sql` creates random synthetic identities/Case in a transaction, exercises registration through linked publication and rolls back all synthetic rows. It reads no existing Case and sends no email. Bucket/policy changes are persistent staging configuration.

## Validation

- `npm run test:pmc-document-chain`: **280 passed**, 21 files after the local diagnostic/status repair; source bytes, page coverage, dates/units, duplicate captions, review/approval binding, text/voice parity, localization and persistence.
- Included SQL portion: **13 passed**; real enum, atomic rollback, stale lease, lost success acknowledgement, immutable snapshot, idempotent publication and authenticated RLS against deliberately permissive legacy policies.
- Python document/lab contracts: **55 passed** on new synthetic fixtures.
- Compatible synthetic benchmark: **1 passed**, 3 synthetic documents / 4 pages, zero critical extraction errors, false-VERIFIED critical errors or security issues. Fixture regression, not a live OCR/provider trial.
- TypeScript, ESLint, security boundary check, production build and `git diff --check`: PASS. Existing CSS compatibility warning remains.
- Actual staging SQL smoke: PASS after all four migrations, with RPCs executed as `service_role`, followed by rollback. Bucket and restrictive policies inspected after source-boundary migration.
- Full historical suite: NOT RUN because excluded real-source fixtures are included. Existing full release workflow is unchanged. The new branch-only synthetic workflow is an additional bounded check, not a replacement production gate. Remote CI is separate from local results.

Legacy expectations were changed explicitly for the new conservative contract: no unit inference from reference ranges; retain raw evidence beside numeric rows; preserve historical source IDs; use SQL queue claims; bind table cells by headers/geometry instead of medical plausibility. No evidence threshold was weakened.

## Completion, limitations and next action

Implementation and isolated DB path are complete for this increment. The application builds successfully on Vercel preview. Hosted role acceptance and production release are **NOT CLOSED**. Do not claim all eleven steps are accepted on the live site.

Automatic Git preview **READY**: commit `f0aa757d38f2f7e6aeb535e96fe70dabb74bf8d1`, deployment `dpl_EAifp1MPctLApepC5463JgitHybB`, project `python-method-center-platform`, target preview (not production). [Preview](https://python-method-center-platform-hyysb3dwu-pythonsmethods-projects.vercel.app). The remote tree matches local tested tree `b8c3e61a14530115ad784e4b78c8132344b4c56e`. The first branch commit was rejected because five-minute cron exceeds Hobby; restoring daily cron and adding cabinet resume resolved the build blocker. `/login` returned HTTP 200 with Russian page markup. Protected root/assets/API fetches could not be consistently completed through the connector; these are not claimed as passing application checks. The preview's database isolation has not been confirmed, so no upload/provider/Case request was made there.

The owner approved browser fallback after the deployment connector returned `Tool deploy_to_vercel not found`. Dedicated isolated project `anham-clinical-staging` now has **READY** preview `dpl_Fkvpy2YbndZHNvsHjvAB7771hDhS` of exact remote commit `454cd0642487360a5cdbf8d92979b9faeb4bb890`, tree `6ffcbad5bbd222283f95f79c9a13c46662a8ac4e`. [Isolated preview](https://anham-clinical-staging-h36a03vzy-pythonsmethods-projects.vercel.app/) and [deployment evidence](https://vercel.com/pythonsmethods-projects/anham-clinical-staging/Fkvpy2YbndZHNvsHjvAB7771hDhS). Its emitted document-page bundle points to `thylrayzjczsxlyqhtfc.supabase.co`, the isolated migrated database. This binding was verified through Vercel's deployed Output viewer without disclosing credentials. Production database and deployment remain unchanged.

Browser checks: public home opens; login switches RU → EN → RU while retaining its route; unauthenticated `/admin` redirects to `/login?next=%2Fadmin`. Direct browser navigation to `/api/documents/process` was blocked by the browser client, so HTTP/API authorization is not claimed as a passing hosted check. No source was uploaded or provider processing triggered. A fresh two-page synthetic PDF is ready: CRP 1.2 mg/L dated 2026-09-20 and CRP 1.4 mg/L dated 2026-09-24, both with range 0.0–5.0, serum and immunoturbidimetry; no real patient identity.

**Legitimate client access:** the owner's existing production client email was absent from isolated staging, explaining the initial `invalid_credentials` error. The owner created and confirmed a separate staging client account and signed in; the browser visibly showed the client cabinet. Credentials were not read or changed by the agent. The documents page requires an onboarding Case. The owner completed the form and submitted it herself, including her own consents, but the server returned `Could not find the 'country_code' column of 'profiles' in the schema cache`. No Case or onboarding row for this account was created on that failed attempt.

**Staging schema repair:** `profiles.country_code` was physically missing in `thylrayzjczsxlyqhtfc`, while the deployed onboarding action upserts it and production has it. The repo already contains `20260830152813_add_profile_country_code.sql`, which is absent from staging's migration history; its unrelated historical data update was deliberately not replayed. A narrow stage-only migration `20260924044828_restore_staging_profiles_country_code_20260924` added the nullable text column, the existing two-letter ISO format constraint and column comment, then signalled PostgREST schema reload. Readback confirmed column and constraint. No user data was overwritten; production remains unchanged. The owner resubmitted the form and reached `/cabinet/health?onboarding=submitted`; stage readback found one Case, one onboarding submission and two consents for this account. No resubmission is needed.

**Interrupted upload and onboarding draft:** the client's documents page is available but has zero uploaded documents. Two browser file-chooser attempts for the new fictional two-page PDF stalled; stage SQL again confirmed zero documents. Do not claim upload, provider reading or review occurred. The owner observed that a failed form submit cleared all her answers. The local form now prevents React's automatic reset while dispatching a snapshot through the same server action, so a server validation error can be corrected in place; no browser storage of health, identity or address answers was added. A focused retry regression, relevant onboarding/representation tests (8 total), TypeScript, targeted ESLint, security checker, production build and `git diff --check` pass. The focused test mocks the form action; it does not replace a hosted browser retry. This fix is local only; the deployed preview remains at `454cd064`, so hosted behavior has not yet been verified or repaired for the owner.

**Later upload and first live boundary (supersedes zero-document state):** the owner uploaded the synthetic `pmc-synthetic-lab-20260924.pdf` at 20:33:46 UTC into the newly created isolated Case. DB and private storage readback confirm document `eacf482a-010f-4573-8023-386dc3f75900`, job `50dd3d51-1942-478c-be72-aff7c10b7392` and original storage object; the authenticated source link visibly opens two fictional pages. Three owner-scoped attempts (last at 20:41:38 UTC) ended `failed`, `last_error=HEADER_READER_UNAVAILABLE`; zero extraction or analysis rows exist. The file is intact and does not require reupload. The `ANTHROPIC_API_KEY` setting is present for Preview and the model name exists in the provider's model list; neither proves that the key/request succeeded. No exact provider status was logged by the deployed code. The currently deployed client badge misleadingly says `Нужен новый файл` for a service failure. A local-only patch records bounded safe error categories, refuses provider policy text as clinical evidence, and labels a service failure `Сбой обработки` / `Processing failed`. The repair passed 280 relevant app tests, one synthetic benchmark, TypeScript, targeted ESLint, security and diff checks. It has not been deployed; the failed job has not been requeued or claimed as accepted. Hosted steps 4–11, legitimate Karen review and client result remain open.

**Configuration cleanup approved and verified:** staging originally had no Git connection. Its already-authorized repository was temporarily connected to permit exact-commit preview creation. Automatic approval review rejected restoring the disconnected state without specific owner approval. The owner provided that approval on 2026-09-24, and the Vercel staging Git settings now show no connected repository. A Git push does not itself deploy this isolated project; exact target deployment and runtime checks are still required. The deployed head stays `454cd064` until independently verified.

GO: deploy the tested local diagnostics/status and draft-retention fixes to this isolated project, requeue the same stored synthetic document, read the precise safe failure category and repair the corresponding provider boundary. Then verify source-to-client steps 4–11 under legitimate roles in RU/EN. NO-GO: production clinical activation, automatic VERIFIED, universal accuracy claims or the excluded Case.
