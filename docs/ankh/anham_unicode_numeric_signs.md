# Unicode spacing and numeric signs: investigation

## A. Observed problem
A live synthetic EN multi-fragment answer displayed .5 mg/L instead of the
requested - .5 mg/L. Its raw provider response was not retained, so the exact
origin of that historical omission cannot be established. Plain ASCII spacing
already passed repeat-normalization tests. No raw client data was inspected.

## B. Confirmed mechanism and correction
A controlled raw fixture '- \u00a0.5 mg/L' reproduces sign loss before the fix.
The Markdown list matcher consumes ASCII spacing; the numeric guard then sees
leading NBSP, narrow NBSP or thin space and fails. It removes the minus as a
bullet. Plus signs and numeric lines preceding units have the same mechanism.

Use trimStart only on the temporary classification input for numeric/unit
guards. Preserve the original output text, spacing, sign, value and unit.
Do not restore guessed signs or infer them from user context. This is a general
Unicode-whitespace correction, not a rule for one target value.

## C. Files
lib/assistant/response-style.ts; tests/assistant-response-style-review.test.ts;
tests/assistant-response-style-routes.test.ts;
tests/assistant-response-style-persistence.test.ts; this report.

## D. Data/schema
No migrations, backfill, auth, history schema or source-data changes.

## E. Tests
Before fix: 9 failures / 24 passes in the expanded regression file. Failures
reproduce minus/plus loss and unit-bearing numeric-line loss for U+00A0,
U+202F and U+2009. After fix: 55/55 pass across three targeted files, covering
RU/EN HTTP output, persistence/readback and repeated normalization.
Full regression, TypeScript and ESLint results follow below.

## F–I. Safety and limits
Only synthetic fixtures and mocked provider/storage boundaries were used.
No PHI, clinical interpretation, source/OCR changes or external model calls.
Vercel CLI has no existing authenticated session; live raw-provider capture
was not performed, and no secrets were downloaded or authentication changed.
The reproduced formatter defect is confirmed. Attribution of the earlier
live omission to this defect remains unproven. No universal numeric fidelity
or broader Ankh production-readiness claim follows from this correction.

## J–L. Gate
Confirmed Unicode-space normalizer defect corrected; release validation pending.
GO for regression and scoped release preparation. Clinical and PHI gates unchanged.
Next action: finish full checks, then validate the scoped deployment.

Final local checks: 1277/1277 tests in 149/149 files, TypeScript and ESLint
all passed. Synthetic benchmark: 3 documents / 4 pages, four metrics 100%,
critical extraction errors / false VERIFIED / security issues 0. Benchmark
timestamp artifacts are excluded. No extraction/trust logic changed.

## Published acceptance — 2026-09-10

This section closes the release validation the J–L gate left pending; the
earlier gate wording above is historical.

Publication is confirmed from the repository and the hosting provider, not from
memory. PR #158 published the prose normalizer and PR #160 this Unicode
correction. Merge commit `ae210e9` is an ancestor of `origin/main`. Vercel
production deployment `dpl_44jRTzEbgABPovMjcgK5TrXSvuwP` built exactly that
commit, reached READY, and is aliased to `pythonmethodcenter.com` and
`www.pythonmethodcenter.com`. Both signs and the Unicode-space handling have
since been carried forward unchanged through later production releases.

Owner-authorized acceptance used the already signed-in synthetic test account on
the published cabinet surface. Verified there: the RU answer, the EN answer,
RU → EN → RU switching, retained history after a full reload, and `-`, `+`,
decimal values and units keeping their signs. No-break space, narrow no-break
space and thin space were each exercised before the number. Only synthetic
messages were sent. No real client record was opened, no payment was made and no
account setting was changed.

Runtime errors were queried for `/api/assistant/client` and
`/api/assistant/history` on the production project; none were found.

### What this acceptance does not establish

The historical raw provider response was not retained, was not recovered and was
not reconstructed. Nothing here restores it. The defect is reproduced only from
the controlled synthetic fixture described in section B, so attribution of the
earlier live omission to this mechanism remains unproven. The separate
mobile-project Vercel build failure predates this work, concerns a different
project configuration, and is not caused by or attributed to this correction.

No clinical, PHI or auto-verification gate was opened or closed by this release.
Phase 2.9 stays open; production auto-verification and Phase 3 production remain
NO-GO. This remains a general Unicode-whitespace correction, not a rule for one
target value, and it is not a universal numeric-fidelity claim.

Scoped numeric-sign release: CLOSED. No schema, migration, role, payment or
authorization change was made at any point in this work.
