# Bounded PMC fact-projection pilot — 2026-09-28/29 UTC

## Context-disagreement candidate — 2026-09-29 UTC

Read-only aggregation of the selected Case's latest saved extraction found
30 rows with a matching printed value and a specimen present in only one
reading; one of the 30 also has a date difference. This is an OCR/association
disagreement, not a proven specimen/date from the original PDF. The generic
candidate stores the matching value with its existing page/source hash as
`SOURCE_ONLY`, nulls only disputed context fields, and preserves a separate
`NEEDS_REVIEW` exception carrying both literal readings. The numeric row's
`comparison_context.review_required` is persisted in the existing JSONB
field, counted in human review and excluded from interpretation and trend
points, including when loaded as a prior value. Incomplete pages yield no
agreed rows. No migration, PHI fixture or clinical trust promotion is added.

This is local implementation evidence until deployment and exact-Case rerun.
Karen still needs to inspect the source, identity, dates, units and other
disputes. Neither the prior internal draft nor a machine comparison is her
decision.

## A–D. Baseline, change, files and data

The owner authorized the existing Karen account for Production clinical
review and selected one real Case. The signed-in Karen UI exposed the source
review and reprocessing controls after PR #242 and a READY deployment. Only
the selected Case was enabled. Its three existing active PDFs completed new
single-page readings with complete page coverage, source hashes and immutable
analysis snapshots. The two-pass reader saved 56 agreed and 43 disputed rows.
The gate was paused again after numeric administrative fields appeared in the
laboratory timeline. No original document, extraction row or historical run
was removed or edited. PR #246 merged as `dfbc393`, and Production deployment
`dpl_5QKJEqqQcrFnkwGfcj1zQPyhnmox` reached READY on the primary domains.
The gate was enabled only for that Case before its three original files were
rerun. Exactly one pilot Case is enabled.

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
- The local production build and GitHub security/regression workflow passed;
  Vercel Preview and the exact merged Production build reached READY.
- The bounded real rerun completed three ready jobs without errors. Three new
  latest run snapshots join the prior three immutable snapshots. Current
  extraction has 39 agreed and 52 disputed rows. Five numeric values all have
  page anchors and belong to the latest runs; none has an administrative/date
  label. Three units remain unresolved and none has a usable collection date.
- One internal AI draft was saved with the current evidence fingerprint and
  persisted after reload. The interface blocks approval while 52 disputed
  rows remain unreviewed. No client response or learning/approval event exists.
- The patient name, identifiers, original PDFs and raw transcriptions are not
  added to the repository. The generic code never grants evidence a higher
  trust state, and the pilot gate remains Case-scoped and paused.

## H–L. Limits, phase and next action

The first run produced 36 numeric projected rows, including administrative
fields. The repaired run has only five numeric rows because its independent
readings also disagreed on more source context. In the blood count, 29 disputed
rows have the same printed first value component but differ in
date/material/method context. This must not be silently resolved as clinical
agreement. The account profile exposed only a first-name identity match,
which is insufficient for a clinical identity conclusion. The source PDF was
not independently opened in this validation, so unit/date content must not
be inferred from OCR rows alone. These are pilot observations, not VERIFIED
facts or a clinical assessment.

This clinical pilot is **NOT CLOSED**. **NO-GO** for an approved clinical
conclusion, client publication or case learning. Next: improve the generic
representation of numeric agreement with context disagreement under a separate
synthetic safety test, and have Karen verify the original source, identity,
dates, units and unresolved rows before her decision. Client response and
ANHAM case learning require the approved downstream workflow.
