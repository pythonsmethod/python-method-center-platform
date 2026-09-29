# Bounded PMC fact-projection pilot — 2026-09-28/29 UTC

## Internal draft citation follow-up — 2026-09-29 UTC

PR #250 merged as `81f95d31c8d488c0c519841c8bc26901108fead5`;
Production deployment `dpl_6e8m6JDojtpBoVvCqwtoUwWBdUsB` is READY.
The bounded Case's internal generation passed the former size gate, then
failed the exact evidence-ID validation. No new review was saved and the old
one is still stale. The source lists sent to the model contained literal rows
without IDs, although the Case picture and validator use stable IDs.

The local candidate prints the saved extraction ID and original row index
beside every agreed and disputed literal row, strengthens the prompt's exact
citation instruction and raises the output budget to cover the unresolved
queue. It does not manufacture citations or weaken the validator. Synthetic
tests cover the literal ID format; release and one internal draft readback
remain open. No source-file processing, Karen decision, client message or
learning is involved.

## Unit-disagreement release and internal draft follow-up — 2026-09-29 UTC

PR #249 merged as `979b460daea285b45cb22ab8de00bcb4dfa47864`, and
Production deployment `dpl_6eTo7igpCg6vsSZnKtL7fxtxiroY` is READY. The
same three PDFs completed new readings through Karen's signed-in Case UI:
three jobs ready at attempt 1, three complete pages, unchanged source hashes,
processor v3 and engine v1.5.0. There are now 12 immutable run snapshots.
Latest literal counts are 66 agreed and 36 disputed. The five matching
numeric-token/unit-suffix cases became five bare, page-linked SOURCE_ONLY
numeric observations with separate unit exceptions; 32 numeric rows in all
have unresolved units and no usable dates. The interface shows 0/36 manual
decisions and blocked approval. Three context differences concern administrative
or header descriptions; two other literal disagreements remain source review
items. Original PDFs were not independently viewed. No client response or
learning event was created.

The old internal draft is stale. Rebuilding it returned an explicit size-limit
error before saving: the full UI picture serializes evidence repeatedly and
includes review action snapshots/tokens and repeated source excerpts. A local
follow-up sends each fact and extracted row once with stable ID, value, review
decision and page/hash, together with documents, comparisons, notes, limits
and summary. Full original agreed/disputed readings remain in the separate
input; no evidence is truncated. It retains the limit and is still a local
candidate pending release and readback. The clinical pilot stays **NOT CLOSED
/ NO-GO** for a Karen decision, approval, client publication or case learning.

## Matching number, unconfirmed unit — 2026-09-29 UTC

The context repair was merged in PR #248 as
`efe0a345f480501876124e9e923a8cb85d926be6`. Its Production deployment
`dpl_51YvTEeC9g9er7fTwRwBXgdQJ8RT` was READY on the primary domains before
the exact Case's three original PDFs were reprocessed. Their three new
immutable snapshots (nine total) have complete page coverage and unchanged
source hashes. The independent readings now yielded 64 agreed and 33
disputed rows. No context disagreement recurred, but five biochemistry/IFA
laboratory numbers were disputed in their entirety because only one reader
associated an explicit unit with an otherwise identical numeric token.
The current numeric projection has 27 page-anchored blood-count observations,
all with unresolved units and missing usable dates. No administrative number
appears. A new reading cannot establish that an earlier context dispute was
clinically settled.

The generic candidate distinguishes a single bare number from that same
number with one explicit slash-form unit after the row fragments are assembled.
It saves the shared number without adopting the unit, the two original
readings as a separate `NEEDS_REVIEW` exception, and an existing JSONB
comparison flag for unit review. No migration or source-file mutation is
needed. Different numeric tokens, two incompatible units, ambiguous decimals,
censored values, unsure reading and incomplete pages do not enter this path.
Unconfirmed units cannot produce a canonical unit, interpretation or trend.
Versions advance to `pmc-analysis-1.5.0` / `pmc-document-chain-v3`.
Synthetic tests cover the page anchor and refusal paths. Release and a bounded
rerun remain open. The original PDFs have not been independently inspected;
there are no Karen evidence decisions, approved clinical conclusion, client
publication or case-learning event. The pilot remains **NOT CLOSED / NO-GO**
for those downstream phases.

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
