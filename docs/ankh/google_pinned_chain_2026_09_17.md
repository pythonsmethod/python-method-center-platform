# Pinned Google OCR and downstream boundary test — 2026-09-17

## Outcome

Version pinning CLOSED for fixed-fixture Preview diagnostics. Whole-chain validation NOT CLOSED / NO-GO: the live OCR response produced no native table objects, so the current native-table canonical laboratory parser produced zero candidates. No independent audit, persistence, or Karen runtime acceptance occurred. Do not call this a successful full-chain test.

## Before / changes

Before: raster diagnostics used the mutable processor default and checked known source cells only. Added an optional explicit version ID to the shared Google adapter (online and batch); reject common mutable aliases and path/query injection. Existing callers without a version retain their behavior. Both fixed-fixture diagnostics now use the dated version verified read-only in Google Cloud Manage versions: `pretrained-ocr-v2.1-2024-08-07`. No cloud default or IAM was changed.

Added a frozen diagnostic configuration manifest and direct calls from the raster diagnostic to the existing native-table canonical parser and existing in-memory connected clinical harness. The scorer's expected cells are never supplied to either parser. The receipt separately reports OCR exactness, native table count, canonical candidates, legacy verified candidates blocked, in-memory evidence counters and stages NOT_RUN. No candidate or trust state is persisted.

This pins the Google provider request, not every model in the whole product. The manifest contains declared component labels; exact code is additionally identified by commit b5f7902. It is not a persistent tenant/processor registry. Rollback target: ed05040 (previous unpinned synthetic diagnostic); no production rollout is authorized.

Files: lib/document-extraction/google-document-ai.ts, synthetic-processor-manifest.ts, synthetic-google-smoke.ts, synthetic-raster-stress.ts; tests/google-version-pin.test.ts; project state/roadmap/decisions and this report. No database/schema/dependency change.

## Live evidence

- Commit: b5f7902c99813afa5f2f9228a231f51df17e2fb4.
- Vercel Preview: uqyLnbMSNVTRvEDxXjzF9Wz6NWqp, READY, Next.js, build 1m 42s.
- URL: https://anham-clinical-staging-7fxlsn9y1-pythonsmethods-projects.vercel.app/admin/anham/wif-smoke
- Fixed endpoint version: projects/pythons-ankh-analysis/locations/us/processors/2ca773b0daa15488/processorVersions/pretrained-ocr-v2.1-2024-08-07:process.
- Receipt versionPinned=true; phiSent=false; clinicalValidation=false; cost=null.

| Frozen fixture | Exact fields | Source-cell rows | Native tables | Canonical rows | Elapsed ms |
| --- | --- | --- | --- | --- | --- |
| clean | 24/24 | 6/6 | 0 | 0/6 | 1782 |
| rotated | 24/24 | 6/6 | 0 | 0/6 | 1645 |
| degraded | 24/24 | 6/6 | 0 | 0/6 | 1604 |

Source bytes/hashes unchanged from google_raster_stress_live_2026_09_17.md. All 72 fields remained exact in the frozen scorer. This is a repeatability check, not a new held-out corpus. Elapsed time now includes downstream in-memory diagnostics and is not a controlled provider-latency comparison to the previous run.

Each native chain returned BLOCKED_NO_CANONICAL_ROWS. Each connected clinical harness returned documentType UNKNOWN, extractedFacts=0, verified=0, missingContext=1, zero internal external calls and zero persistence writes. The harness's zero external calls describes only the in-memory stage, not the preceding three Google OCR requests.

## Root cause / interpretation

`parseGoogleDocumentAILabRows` only reads page.tables with recognized semantic headers. The observed Document OCR response has tokens but no tables. Existing source-cell scoring uses authored rectangles, so its 72/72 score never proved the real parser could discover table structure. The existing spatial clinical mapper handles selected pathology biomarkers, not arbitrary laboratory rows; the non-medical ALPHA/BETA fixture remains UNKNOWN, which is not itself a medical-classification defect. Do not add clinical meanings or target-value rules for these labels.

The next genuine laboratory test needs semantically valid synthetic laboratory documents, frozen before execution, and a reviewed generic token-to-laboratory-row adapter when native tables are absent. It must preserve value/comparator/unit/reference associations and exact provenance, return ambiguity rather than guesses, and feed review-only facts to the canonical chain. Do not derive input candidates from scorer Gold. Only after this boundary works should independent audit, persistence and Karen UI be exercised.

There is also repository divergence: root workspace local shadow orchestration/runtime assembly differs from the committed deployed worktree and contains many unrelated changes. Do not bulk-copy or deploy the root. Reconcile the required components against current canonical code in a dedicated integration increment.

## Verification and security

Exact final implementation: full regression 1839 passed, 1 skipped (204 files passed, 1 skipped). Focused pin/raster tests 13/13; earlier pin/PDF/raster checks 22/22. TypeScript, scoped ESLint, security self-test 6/6 and inventory passed; diff check passed. Existing synthetic canonical benchmark reports 100% critical numeric exactness and zero critical/false-VERIFIED errors, but uses offline fixtures and is NOT the above live boundary result.

Read-only local root checks: 26/26 tests across shadow intake, runtime assembly, clinical reader contracts, experiment contracts and transcription adapter. These are separate local/mock contract tests, not deployed end-to-end acceptance. Dependency audit initially failed from restricted network; approved retry returned zero production dependency vulnerabilities. Initial security check rejected a new fetch-default reference; test injection was moved to a test-only stub, and the final implementation reuses the existing network adapter with unchanged inventory.

No PHI, client documents, new permanent credentials, IAM expansion, production flags, schema writes, automatic verification, diagnosis or client publication. Three synthetic pages processed. No durable idempotency or persisted receipt added. No live OpenAI/Anthropic call. No independent human Gold. No unseen-case accuracy claim.

GO: isolated generic laboratory spatial-adapter integration and frozen synthetic laboratory validation. NO-GO: real-client rollout and claims that the whole chain is validated. Exact next action: connect normalized OCR tokens to the existing spatial reconstruction, implement general laboratory column mapping with adversarial fixtures, then feed source-linked NEEDS_REVIEW facts through the reviewed Case assembly and audit path.

API reference: https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/projects.locations.processors.processorVersions/process
