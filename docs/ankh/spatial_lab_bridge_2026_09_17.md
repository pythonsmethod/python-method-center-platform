# Anham spatial laboratory bridge and next gates — 2026-09-17

## Implemented scope

Before: Google native-table parser returned 0 rows for the live OCR raster fixture, although all source cells were read exactly. Added an opt-in bridge from normalized provider tokens through existing spatial reconstruction to existing canonical lab facts. Native table rows take precedence per page; fallback applies on pages without parsed native rows. No changes to production invocation or database schema.

Files: lib/canonical-facts/spatial-lab-adapter.ts; lib/clinical-evidence/spatial-table.ts (opt-out of automatic value continuation merge); lib/document-extraction/synthetic-raster-stress.ts; synthetic-processor-manifest.ts; tests/spatial-lab-adapter.test.ts; this report and project memory documents.

Exact single-token EN/RU semantic header aliases route columns. All original data tokens are preserved separately, including page, polygon, token IDs and original text spans checked against document text. Joined display text is not advertised as one contiguous source span. No P4 claim. Invalid/missing geometry or duplicate token IDs block fallback for that page. Missing cells remain null; missing required values and competing numeric values remain unresolved. No automatic borrowing from neighboring rows. All returned canonical candidates are NEEDS_REVIEW, including native-parser candidates. The new bridge writes nothing and emits no diagnosis.

The diagnostic now compares structured candidate rows against the same frozen authored source separately from the old source-cell OCR scorer. Gold values and rectangles are not inputs to reconstruction. This is development/regression data, not blind human Gold.

## Local validation

13 new adapter tests: EN/RU headers, literal comma/comparator preservation, missing unit/result, missing geometry, invalid anchors, competing numbers, absent headers, shuffled token order, immutable source, orphan continuation, page boundary, duplicate token IDs. Focused final adapter/pin tests: 22/22. Full suite before final receipt-only scoring change: 1852 passed, 1 skipped (205 files passed, 1 skipped). Final TypeScript and scoped ESLint pass; security self-tests 6/6 and inventory pass; diff check pass. Existing synthetic canonical benchmark remains passing, not proof of real-world quality. No dependency added; repeat npm audit blocked by ENOSPC on local disk (prior task's audit was clean, not a fresh result).

Implementation commit 6409280. Final repeat full suite also passed 1852 tests, 1 skipped. After the transient disk error, free space was available without deletion and npm audit retry returned 0 vulnerabilities.

## Live result

Preview https://anham-clinical-staging-8f5yi8xmq-pythonsmethods-projects.vercel.app/admin/anham/wif-smoke served commit 6409280, manifest anham-google-synthetic-v3 and pinned pretrained-ocr-v2.1-2024-08-07. Actual three-page processing completed:

| Fixture | OCR cells | Exact reconstructed rows | Elapsed ms |
| --- | --- | --- | --- |
| clean | 24/24 | 6/6 | 1724 |
| rotated 3 degrees | 24/24 | 0/6 | 1851 |
| degraded | 24/24 | 6/6 | 1651 |

Before: 0/18 canonical rows. Now: 12/18 source-exact structured rows; 0 VERIFIED. Each of the 12 rows retained four cell token sets with validated text anchors. Equality ignores whitespace only: e.g. original OCR tokens render as `mg / L` and `< 0.05`. All signs, digits, units and ranges matched the frozen source in those rows. No PHI or database writes. Actual cost remains unknown.

Failure retained: rotated fixture reports NO_SUPPORTED_SPATIAL_TABLE and 0 candidates. Axis-aligned row grouping cannot join sloped headers across page width. No target angle/Gold-based deskew was added to make the score look better. Production remains NO-GO. Generalization is not demonstrated: fixtures are the same development layout, not unseen laboratory human Gold.

Additional measured gap: `mg / L`, `g / L`, `mmol / L` remain unit_normalization_unresolved although their literal extraction is correct. `%` normalizes. Numeric values, comparators and negative ranges in emitted rows parsed correctly. Terminology for intentionally artificial labels remains unresolved by design. A separate conservative whitespace/unit canonicalization layer must not overwrite source tokens or infer missing units.

## What is still missing — ordered acceptance gates

1. **Layout completeness and preprocessing.** Test previously unseen synthetic laboratory layouts, RU/EN multiword and merged headers, rotated/photographed pages, scientific notation, superscript units, footnotes, two tables per page and continued pages. The current row grouper is axis-aligned; it is not a deskew implementation. Partial native tables currently suppress fallback for the entire page: add region-level coverage reconciliation before claiming full-page extraction. Do not fill cells from prior pages automatically. Define deterministic omitted/unresolved counters.
2. **Durable provenance and numeric integrity.** Persist per-cell token sets, immutable source hash, coordinate system and original-to-derivative transforms through the existing authorized fact/evidence store. Current sidecar is in-memory only. Add exact value/unit/reference round-trip tests and source highlighting; never use confidence as a substitute for correctness. Ensure negative ranges, comparators and exponents remain literal even when normalization is unresolved.
3. **One deployed integration path.** Reconcile the local shadow/runtime Case code with the committed deployed architecture, without publishing unrelated root changes. Connect intake, canonical facts, evidence/trust, QA and Karen projection using one store. Validate ownership, blocked users, cross-Case references, corrections and omitted documents. Merely passing OCR into a diagnostic harness is not this integration.
4. **Queue, idempotency, budgets and recovery.** Source hash + document version + processor manifest define a run identity. Duplicate events and button clicks must not double-charge or duplicate facts. Add atomic attempt reservation, bounded retries, partial-page failures, crash/redeploy recovery and auditable terminal outcomes. Existing smoke has no durable job/idempotency layer.
5. **Independent audit and human Gold.** Freeze unfamiliar source bytes and candidate-hidden human annotations before provider comparison. Invoke source-only OpenAI/Anthropic readers through approved transports, separately budgeted and versioned. Measure exact fields, misses/extras, row associations, provenance, false VERIFIED and review time. Model agreement is not truth. Zero denominators stay n/a. Reader contracts passing local tests is not live validation.
6. **Karen's actual review workflow.** One concise RU/EN view showing document coverage, original crop beside each disputed value, reasons, corrections and explicit approval. A view/open action must not approve evidence. Record source-version-bound decisions and re-review requirements after document replacement; test refresh, concurrent edits and audit history. Measure time saved on a whole Center Case before clinic onboarding.
7. **Operational and PHI release.** Verify region/retention/vendor agreements, access logs without source text, least privilege, deletion policy, incident response and restore drills. Record latency and actual billed cost (currently unknown), input-quality drift and rollback criteria. No general PHI or production activation follows from synthetic success.

## Deliberately not implemented

No automatic verification, production upload routing, persistent cell schema, new tenant registry, queue, live OpenAI/Anthropic comparison, real patient Case, independent human Gold or client publication. No deletion to fix local disk capacity. No clinical interpretation for artificial ALPHA/BETA labels. Native coverage, multiword headers and unsupported layouts remain explicit follow-up risks.

Basic spatial bridge implemented and live exercised, but robust-layout acceptance NOT CLOSED (rotated fixture fails). GO for isolated hardening and the above integration work only. Whole-chain/clinical phase NOT CLOSED; production NO-GO. Exact next action: implement source-derived deskew with inverse provenance mapping and unit-whitespace normalization tests; then freeze two previously unseen laboratory layouts and add region-level native/fallback coverage before the persistent Case bridge.
