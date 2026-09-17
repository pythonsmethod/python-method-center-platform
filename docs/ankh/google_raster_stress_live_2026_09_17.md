# Google raster stress live test — 2026-09-17

## Before and change

The previous fixed digital PDF passed 6/6 lines but did not test raster tables. Added three fixed synthetic PNGs, authored source-cell expectations, geometric row/column scoring, four scorer regression tests and a RU/EN button on the existing admin Preview page. No patient source is accepted.

Code commits: 9f2138c and 63a24d8. Live deployment: https://anham-clinical-staging-re0hzidcb-pythonsmethods-projects.vercel.app/admin/anham/wif-smoke . Fixture set: anham-raster-stress-v1.

## Measured live results

| Variant | Exact fields | Exact rows | Processing time | Provider quality score |
| --- | --- | --- | --- | --- |
| Clean | 24/24 | 6/6 | 1567 ms | 0.98684573 |
| Rotated 3 degrees | 24/24 | 6/6 | 1667 ms | 0.98932976 |
| Downsampled and blurred | 24/24 | 6/6 | 1466 ms | 0.993644 |

Total 72/72 fields, 18/18 rows. One page per request, zero unlocated tokens in each response. All expected/observed strings matched, including decimal commas, minus signs, < and >, units and ranges. Equality removes whitespace only. Fields are assigned using token polygon centres, inverse known rotation and authored source rectangles; source geometry was fixed before candidate extraction.

Source SHA-256:

- clean: 22b6fff02f1d15a4e89b3ffc81cab4dee77717a0ed2079b2e8d560531b7f958d
- rotated: 119f55ee747bf6b967968d4c660e66ab13c99a17feec59198cae97fc248b4920
- degraded: 12d1bfb029b0fb42449d82094cf13c218c814a94c49a55af7456290f6a8bc937

Expected rows (four cells each): ALPHA / 12,34 / mg/L / 10,00-20,00; BETA / <0.05 / g/L / 0.01-0.09; GAMMA / >1234 / count / 1000-2000; DELTA / -0,07 / mmol/L / -0,10-0,00; EPSILON / 0.001 / mg/L / 0.000-0.009; ZETA / 100.0 / % / 95.0-100.0.

## Failure and correction

The first deployment returned document_ai_http_403 before the receipt. The added processor metadata lookup was then made optional; the same processing-only identity successfully completed all three process requests without IAM expansion. Processor version remains unknown (null), versionPinned=false. Do not interpret unavailable metadata as proof of a pinned version.

## Files and validation

Added: tests/fixtures/ocr-stress.svg; lib/document-extraction/synthetic-raster-fixtures.json; lib/document-extraction/synthetic-raster-stress.ts; tests/synthetic-raster-stress.test.ts. Changed: app/(admin)/admin/anham/wif-smoke/actions.ts and SyntheticTest.tsx; CURRENT_STATE.md, ROADMAP.md, DECISIONS.md and this report.

Focused PDF/raster tests 13/13; full regression 1830 passed, 1 skipped (203 files passed, 1 skipped). TypeScript, scoped ESLint, security self-tests 6/6, security inventory and git diff --check passed. After the optional metadata correction, raster tests 4/4, TypeScript, scoped ESLint and diff check passed. RU-to-EN UI switch retained the diagnostic route. Prior dependency audit was clean; no dependency was added in this change.

## Security and limits

No schema changes, migration, PHI, patient documents, production activation, trust promotion or permanent credentials. General OCR/PHI flags remain disabled. Only fixed authored fixtures use the existing Google adapter and short-lived WIF credentials behind the existing admin, Preview, exact staging database/hostname and same-origin checks. Three successful processing requests may be billed; actual cost is unknown. The diagnostic has no durable idempotency or persisted receipt; locale switching clears its in-memory result.

This is one authored layout in three variants, not independent human clinical Gold, a real Case, or a full Anham skill-chain benchmark. Source-cell matching is not general layout discovery. No handwritten, Cyrillic, multipage, severe-damage or unknown-template test was performed. No OpenAI/Anthropic comparison or medical interpretation was performed. Quality score is not a calibrated probability of correctness; the blurred image scored highest and must not imply superior reliability. Clinical false-VERIFIED rate is not measured by this OCR-only test.

Synthetic raster smoke CLOSED. GO for a version-pinned, broader held-out extraction benchmark; NO-GO for clinical accuracy or production readiness claims. Exact next action: resolve and pin an authorized processor version, then freeze unfamiliar layouts with independently checked field/row truth and test the complete extraction/audit/review chain without enabling production.
