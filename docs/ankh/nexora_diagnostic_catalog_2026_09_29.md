# NX-03.CATALOG-20260929 — diagnostic reference integration

## Scope and ownership

The owner requested connection of the prepared global diagnostic catalog to the
new PMC document module and asked whether it belongs in NEXORA or ANHAM.
The reusable lookup belongs to NEXORA. PMC owns the authorized Case projection,
source links and Karen workflow. ANHAM consumes that projection through the
existing authenticated text/voice evidence tool. This increment stays in the
existing repository/runtime and creates no second Case, evidence store or API.

Baseline: `dfbc3934ad1d57dfed9801d9b22cb48f28b4bba2`, including PR #246's
administrative-row/date projection repair. Work branch:
`feat/pmc-diagnostic-catalog-20260929`.

## Implemented behavior

- `lib/nexora/diagnostic-catalog` loads the frozen public snapshot locally,
  validating versions, checksums, counts and duplicate identifiers. Only public
  reference data is cached between requests. Patient queries are not logged,
  persisted, cached across requests or sent to a terminology service.
- `lib/analytical-picture/catalog-enrichment.ts` adds reference metadata to the
  existing Case projection after its scoped reads. The final evidence fingerprint
  still guards changes during the entire read and enrichment. Existing caller
  authorization, pilot gating and audit remain the entry boundary.
- Exact declared `LOINC: code` and versioned `GTR...` references can be located.
  Name lookup intersects literal name tokens and returns up to three candidates
  with total/truncation metadata. Ordering is deterministic, not a medical score.
  Unknown codes, multiple codes, unmatched names, oversized names and loader
  failures remain distinct. No matching result assigns a code to a patient fact.
- Existing PMC RU/EN analyte aliases may supply a visible search hint. A generic
  Result row uses its linked Test name only when page and source hash agree.
  A disputed Test value cannot become an agreed search name. No source label,
  value, unit, date, method, reference interval, decision or comparison key changes.
- The Karen picture shows expandable reference details in RU/EN. Standard source
  names and mandatory rights notices retain their original language. GTR record
  type and the limited UCUM list are described without claiming clinical validity.
  Existing ANHAM text/voice output includes the same metadata and explicit
  candidate-only interpretation guidance. No new public tool is exposed.
- Server output tracing includes the data snapshot. Browser code imports only
  the result types and presentation, not the Node lookup or full terminology data.

## Data and licensing

The 21 compressed shards total 3,626,124 bytes and contain 176,698 reference
entries: 112,405 LOINC 2.83, 64,009 current-public GTR listings from the prepared
2026-09-27 snapshot and 284 PMC families. The separate NLM UCUM list has 759 codes.
The offline importer uses the previously prepared source package and original
fields; hashes and source URLs are retained in the manifest. Read
`data/diagnostic-catalog/README.md` and its licenses for exact source boundaries.

This is partial terminology coverage. Missing LOINC axes, local test catalogs,
official multilingual variants and full UCUM grammar prevent automatic clinical
mapping. DICOM modality entries and intake profiles from the source package are
not connected here. Catalog inclusion does not add an input parser or image
interpretation ability. No schema migration, provider change, normalization rule,
clinical threshold, trust promotion or persisted standard-code decision is added.

## Verification and release

Validation results are recorded in the final checkpoint below. All new fixtures
are synthetic; public terminology is not patient data. The owner-excluded old
Case 2.9 and suites replaying it remain excluded under the repository's
document-analysis/lab-analysis skills. The unrestricted `npm test`/PR workflow
therefore cannot be claimed as a passing gate. Publication of an isolated branch
does not authorize a merge or production release.

Real Case reprocessing, live Karen acceptance and client publication are outside
this increment. No role, allowlist, clinical decision or production record is
changed. The previously paused pilot remains governed by its own release record.

For deployment acceptance, first confirm the exact candidate in the existing
isolated environment, including bundled catalog availability, a legitimate
Karen session, source opening and RU/EN readback. A reference candidate must
remain separate from a saved clinical review decision. Rollback is the code
revert; there is no data migration to undo.

Technical reference: Next.js 15 file tracing options:
https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output.

## Local validation checkpoint

- `npm run test:pmc-document-chain`: 316/316 tests in 24 suites pass, including
  the complete snapshot loader, invalid shards, ambiguous/unlisted names, code
  conflicts, case-sensitive unit membership, RU alias hints, source hash/page
  separation, disputed readings, fallback, actual scoped query projection,
  concurrent source changes, RU/EN server-rendered panels and text/voice output.
- 55/55 document/laboratory synthetic package-contract tests pass.
- TypeScript, repository ESLint, security-check self-test/check and production
  build pass. The build retains the pre-existing CSS/autoprefixer warning about
  `end` versus `flex-end`; no dependency or CSS change is made here.
- The existing synthetic development benchmark (3 documents, 4 pages) passes
  with zero critical extraction errors, false VERIFIED or security issues.
  This checks a synthetic regression boundary, not medical or OCR accuracy.
- The built Case route trace contains all 27 catalog files, including shards,
  manifest, licenses and README. The Node catalog implementation is absent from
  browser chunks. Build success is local evidence, not a deployed readback.

Remote CI, isolated runtime/role acceptance, interactive language-switching and
production deployment are not claimed. The existing PR workflow runs an
unrestricted test suite, so this increment is prepared on its own branch without
opening a PR that would replay the owner-excluded fixtures. Workflow restrictions
are not modified or bypassed. A release still needs an allowed remote gate and
the isolated acceptance described above.
