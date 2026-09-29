# NEXORA diagnostic catalog → ANHAM/PMC, 2026-09-29

## A. Starting point

NEXORA's `@nexora/diagnostic-catalog` 0.1.0 already owned a versioned,
checksummed public terminology projection: 112,405 LOINC entries, 64,009
GTR listings, 284 PMC examination families and a separate 759-code UCUM
list. PMC did not depend on it. Its existing document chain and Case
history were already live under separate role and per-Case controls.

## B. Change and boundary

PMC consumes an integrity-pinned generated tarball from NEXORA. Staff ANHAM
text and voice have the same `lookup_diagnostic_catalog` handler for a
single unclear name, declared code or printed unit. The current selected
Case's saved `read_case_document_evidence` tool can optionally use an exact
evidence ID to request the same lookup, returning its source page/hash and
candidate together. Both reads use server-derived scope, bounded arguments
and fail-closed audit. Client tool lists do not expose either staff lookup.

The response carries the catalog version, explicit found/unknown/conflict
state, at most three candidates, truncation and unit-list status. It never
assigns a standard code, verifies a clinical fact, converts a unit, supplies
a reference interval or changes source evidence. Existing document
processing, lab normalization, Case history and Karen decisions are unchanged.
The selected Case's new evidence tool remains subject to its existing pilot
gate. No current real Case was reprocessed for this integration.

## C–D. Files and data

The adapter and role routing live in `lib/assistant/diagnostic-catalog-tool.ts`,
`conversation-archive.ts`, `voice-site-tools.ts`, `document-evidence-tool.ts`
and provider voice/text instructions. `package.json`, lockfile,
`next.config.mjs` and `vendor/` pin and trace the NEXORA artifact. No schema
change, source copy to a new database, or patient data in NEXORA.

## E–G. Checks, benchmark and privacy

Synthetic checks cover text/voice parity, staff/client separation, unknown
and unit-only results, input bounds, audit failure, selected source ID and
page: 6 new tests pass; the existing document-chain suite passes 309/309.
TypeScript, focused ESLint, production build/security self-test (6/6),
`npm ci --dry-run`, diff check and file tracing pass locally. The staff,
live-voice and realtime-tool server traces include the catalog data and
manifest. This read-only reference lookup changes no extraction
or trust decision, so the document benchmark is not a catalog-quality
measure. The tool sends a name/unit only to the local package; audit stores
operation, Case scope, channel, state and version, not the searched label.

## H–L. Limits, phase and next action

The catalog is a terminology reference, not all examinations worldwide and
not a source of normal ranges or patient interpretation. The named code may
be found without being the correct mapping for a particular report. A live
NEXORA API and general document capability migration are still separate work.
Implementation and release: PR #255 merged as
`765cb564f74599103379d235457abaa4a6b2789d`; all GitHub CI steps passed.
The exact head Preview `dpl_27SPgQ3GbxoCb84ASWP6yiZjWDUT` and Production
`dpl_6naCgxoDL6RPtHSnDSYZUi2XKnLS` reached READY. Both primary domains
were assigned and the Production login page returned HTTP 200. An authorized
staff lookup in the deployed runtime remains unobserved; a READY deployment
does not prove that action. The next action is to read a synthetic term in a
staff session, confirm the version and (for a separately selected synthetic
Case) source link, and leave the current real Case untouched until its Before
boundary is complete. External NEXORA API publication is outside this release.
