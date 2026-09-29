# Bounded PMC fact-projection pilot — 2026-09-28

## A–D. Baseline, change, files and data

The owner authorized the existing Karen account for Production clinical
review and selected one real Case. The signed-in Karen UI exposed the source
review and reprocessing controls after PR #242 and a READY deployment. Only
the selected Case was enabled. Its three existing active PDFs completed new
single-page readings with complete page coverage, source hashes and immutable
analysis snapshots. The two-pass reader saved 56 agreed and 43 disputed rows.
The gate was paused again after numeric administrative fields appeared in the
laboratory timeline. No original document, extraction row or historical run
was removed or edited.

`lib/analysis/pipeline.ts` now refuses printed dates and administrative
captions when projecting numeric laboratory facts. Literal source evidence
remains available for review. `lib/documents/page-reading.ts` distinguishes an
absent printed row date from an ambiguous printed row date; the processor uses
that mapping. `tests/pmc-document-source.test.ts` uses synthetic identifiers,
dates and analytes for the regression. No schema migration is introduced.

## E–G. Verification, benchmark and security

- 295/295 focused PMC document-chain tests in 22 files passed, including the
  new synthetic projection and date-inheritance cases.
- TypeScript, targeted ESLint, security checker and `git diff --check` passed.
- The synthetic development benchmark passed its existing 3-document/4-page
  dataset with zero critical extraction errors and zero false VERIFIED; it is
  not a real-case accuracy estimate.
- The local production build passed. Remote checks are required before
  release. The real source has not yet been rerun on this candidate.
- The patient name, identifiers, original PDFs and raw transcriptions are not
  added to the repository. The generic code never grants evidence a higher
  trust state, and the pilot gate remains Case-scoped and paused.

## H–L. Limits, phase and next action

The first run produced 36 numeric projected rows; only five analyte captions
were recognized, all 36 units were unresolved, and none had a usable
collection date. All 36 had page-level anchors. These are pilot observations,
not VERIFIED facts. The account profile exposed only a first-name identity
match, which is insufficient for a clinical identity conclusion. The source
PDF was not independently opened in this validation, so unit/date content
must not be inferred from OCR rows alone. The repaired run may change the
numeric counts and needs a fresh readback.

This pilot is **NOT CLOSED**. **NO-GO** for clinical interpretation, client
publication or case learning. Next: release the generic repair, reenable only
the selected Case, rerun its three existing PDFs, inspect saved provenance and
review states, then hand the unresolved evidence to Karen for her review and
decision. A client response and ANHAM case learning require the approved
downstream workflow.
