# Staff Documents query and localization repair — 2026-09-30

## Confirmed problem

An authorized staff session reached `/admin/documents`, but the list
reported an ambiguous relationship between uploaded documents and profiles.
The core schema has the owner `profile_id`; the identity-review migration
also references a profile through `identity_reviewed_by`. The unspecified
`profiles(...)` embed cannot choose between them. Page headings, access
panels and failures also remained English with the active Russian locale.

## Repair

Select `profiles!uploaded_documents_profile_id_fkey(email, full_name)`.
Preserve the existing profile response property, Case relation, newest-first
order, 100-row bound, staff gate and private-file route.

Localize all list-page states in Russian and English, including missing
configuration, access-check failure, loading failure, empty states, staff
roles, sign-out button, accessibility label and document status fallbacks.
Use the active locale for desktop dates as well as mobile dates. Display a
helpful error with a refresh/support next step instead of raw server details.
This only displays existing document lifecycle states; it does not add
processing status or prioritization to Cases or support requests.

## Validation

- 61 focused tests passed, including owner/reviewer ambiguity, failure versus
  empty-list distinction, RU/EN render states, date localization and access denial.
- Full regression: 251 files passed, one skipped; 2333 tests passed, one skipped.
- TypeScript, ESLint and `git diff --check` passed.
- Production query through a server credential was not executed: automatic
  approval rejected this distinct privileged access. Browser acceptance uses
  the staff session already opened by the owner.
- Security checker self-test (6 checks) and boundary inventory passed.
- Local build was blocked by the environment: Google Fonts network access
  was denied and the system disk ran out of space. Generated dependencies
  and build artifacts were removed from the isolated copy after testing.
- Initial Vercel preview build reached READY for commit `870ccb4`.
- Initial GitHub checks repeated security, types, lint and all 2333 tests
  successfully, then stopped on the existing dependency audit findings.
  Update only three lockfile entries: brace-expansion 5.0.9 → 5.0.12 and
  1.1.18 → 1.1.21; DOMPurify 3.4.15 → 3.4.16. The package manifest is
  unchanged and `npm audit fix --package-lock-only` reports zero findings.
- Repeated GitHub/Vercel checks, production deployment and signed-in
  RU → EN → RU acceptance pending.

No schema or role changes, new endpoint, original-document read, OCR/model
request, client publication, evidence decision or automatic trust promotion.
The broader Case pilot is still open; its unresolved evidence requires Karen.
