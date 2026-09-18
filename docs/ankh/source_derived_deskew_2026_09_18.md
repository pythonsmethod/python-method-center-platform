# Anham source-derived page deskew — 2026-09-18

## A. What existed before

The review-only spatial laboratory bridge reconstructed clean and degraded fixed
rasters, but its axis-aligned line grouping returned `NO_SUPPORTED_SPATIAL_TABLE`
for the same table rotated by 3 degrees. Live baseline: 12/18 exact structured
rows total and 0 VERIFIED. Google OCR itself read 72/72 source cells exactly.

## B. What changed

Before row grouping, Anham now estimates a robust page slope from the longest
near-horizontal edge of each OCR token polygon. A median plus median absolute
deviation check accepts only a consistent source-derived orientation. A bounded
normalized Y-shear then creates a separate in-memory association geometry.

The algorithm never receives the fixture angle, expected cells or Gold. It does
not change OCR text, token identity, text anchors, source polygons or source bytes.
Transforms below the threshold are skipped. Unstable, excessive and out-of-page
transforms fail closed. Deskewed rows receive `SOURCE_DERIVED_DESKEW_APPLIED` and
remain `NEEDS_REVIEW`; automatic verification remains impossible in this bridge.

Each applied page records algorithm version, normalized coordinate system, pivot,
slope, sample count, median absolute deviation, reversibility and SHA-256 hashes
of both source and derivative geometry. Each cell retains exact original token
polygons separately from association coordinates.

## C. Files created or changed

- `lib/clinical-evidence/spatial-table.ts`
- `lib/canonical-facts/spatial-lab-adapter.ts`
- `lib/document-extraction/synthetic-processor-manifest.ts`
- `tests/spatial-lab-adapter.test.ts`
- `CURRENT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`
- this report

Implementation commit: `dec973e` on isolated branch
`codex/anham-wif-live-smoke`. Vercel Preview build is Ready.

## D. Data and schema changes

None. No database migration, persistence write, client document, production route
or provider key was added. The new transform receipt exists only in diagnostic
memory/output.

## E. Tests and exact results

- focused spatial/raster tests: 19/19 passed;
- full regression: 205 files passed, 1 skipped; 1,854 tests passed, 1 skipped;
- TypeScript: passed;
- full ESLint: passed with zero warnings;
- security self-test: 6/6; route/security inventory: passed;
- `git diff --check`: passed;
- `npm audit --audit-level=high`: 0 vulnerabilities;
- Vercel Preview for `dec973e`: Ready.

The new regression reconstructs all three rows from a uniformly tilted synthetic
table, proves source and association geometry differ, verifies both geometry
hashes, confirms exact original token polygons remain available, confirms no
source mutation, and rejects an excessive slope instead of forcing associations.

## F. Benchmark and live result

The existing synthetic canonical benchmark remains at 100% for its established
dataset with zero critical extraction errors and zero false VERIFIED. That
benchmark does not contain the live raster route and is not real-world clinical
validation.

The new three-raster Google repeat is pending one authenticated admin session on
the stable Preview branch alias. Do not claim that the live rotated failure is
fixed until the receipt proves rotated 6/6, clean 6/6, degraded 6/6, 0 VERIFIED
and valid original anchors.

## G. Security and PHI implications

No PHI was used or enabled. The diagnostic remains Preview-only, admin-only,
short-lived WIF-only, with `ANHAM_PHI_PROCESSING_AUTHORIZED=false`. Original
provider evidence is immutable. Geometry uncertainty denies the transform rather
than broadening trust.

## H. Known limitations

- The method estimates one dominant orientation per page; mixed orientations,
  perspective distortion and curved photographs are not solved.
- A normalized Y-shear is a layout-association correction, not pixel resampling.
- Unit strings such as `mg / L` remain normalization-unresolved.
- Partial native-table regions still suppress fallback for the whole page.
- Multiword/merged headers, multiple tables, continuations, footnotes and unseen
  laboratory layouts remain outside the demonstrated coverage.
- Transform sidecars are not yet persisted into the canonical evidence store.

## I. Intentionally not implemented

No automatic verification, production activation, PHI routing, diagnosis,
clinical interpretation, persistence migration, queue, retry policy, human Gold,
OpenAI/Anthropic adjudication or Karen approval workflow.

## J–L. Phase status and next action

Robust-layout phase: **NOT CLOSED** pending the live receipt and unfamiliar-layout
tests. Production: **NO-GO**. GO only for isolated synthetic hardening.

Exact next action: sign into the stable Preview branch once, run the three fixed
rasters, preserve the receipt, and compare all three structured-row counts plus
original-anchor and VERIFIED gates. If that passes, add conservative unit-space
normalization tests and freeze two unfamiliar laboratory layouts before any
persistent Case integration.
