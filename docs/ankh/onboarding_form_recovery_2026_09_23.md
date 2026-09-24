# Questionnaire recovery and validation-state retention — 2026-09-23

The onboarding page previously loaded only identity fields from `profiles`. Existing `onboarding_submissions.payload` answers were ignored, and uncontrolled questionnaire/delivery fields could reset after a server-action validation error.

The page now restores the latest owner-scoped saved questionnaire and delivery payload, falling back to current profile values. Questionnaire and delivery inputs are controlled, so a failed submission keeps the client's current text, selections and confirmations on screen. No schema, browser storage, external transmission or clinical-processing change was introduced. Data that never reached the database before this release cannot be reconstructed after a reload.

Verification: full regression 1,951 passed / 1 skipped; security checker and inventory passed; TypeScript and ESLint passed; production build generated 59 pages; dependency audit found zero vulnerabilities; diff check passed. The synthetic Anham benchmark retained 100% critical numeric exact match, verified precision, needs-review recall and provenance availability, with zero critical/security errors.

## Production acceptance

PR #227 merged to `main` as `b43df82e89c29d9da70322b34fdf2321663ef186`. Post-merge GitHub CI, the main Vercel deployment and the isolated clinical-staging deployment completed successfully. `https://pythonmethodcenter.com/` returned 200. Anonymous `/onboarding` requests with both `pm-locale=ru` and `pm-locale=en` returned the expected 307 to `/login?next=%2Fonboarding`, preserving the protected route. No authenticated test-user session or real client medical content was used, so visual prefill acceptance remains separate from the completed production release.

The stale required GitHub context `Vercel` was replaced with the actual app-bound `Vercel – python-method-center-platform` context. The mandatory `verify` check, strict up-to-date requirement, admin enforcement, review/conversation rules, force-push prohibition and other branch protections remained enabled.
