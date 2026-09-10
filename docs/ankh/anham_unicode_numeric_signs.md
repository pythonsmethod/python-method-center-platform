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
