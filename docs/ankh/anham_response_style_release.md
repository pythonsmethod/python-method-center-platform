# Anham prose release, 2026-09-09

## A–B. Problem and change
Published test-account replies still contained Markdown and em dashes. The owner
requested resolution after the live smoke test. Publish the already reviewed
RU/EN prompt and conservative server presentation normalizer, including historical
AI presentation without rewriting stored messages. Language switching retains routes.

## C. Integration
Candidate starts with the reviewed local change and merges production/main 27edbd5.
Preserves latest durable history acknowledgements, timestamps, cross-locale history,
Anna archive/memory, provider refusal handling, tariffs and outreach settings.
Conflicts were resolved by normalizing inside the existing response/persistence
helpers, retaining all source and human data. D-057 records the style decision;
D-056 remains the existing outreach decision. File inventory is in the linked
[implementation report](anham_response_style.md) and Git diff against main.

## D. Data/schema
No new migrations, configuration changes or backfill in this release. Existing
production/main migrations are retained in the repository but are not applied by this task.

## E–F. Validation
Pending final merged suite/build. First merged run: 1233 passed, 11 failed, plus
one suite unable to load the newly added PGlite dependency. Failures identified
missing request/database mocks and one request-locale precedence regression;
these were corrected. Typecheck initially failed only on the missing dependency.
Lint passed. npm ci initially failed with network EACCES and was retried with
network access. Synthetic benchmark: 3 documents / 4 pages, all four metrics 100%,
critical errors / false VERIFIED / security issues 0. No clinical validation claimed.

## G–I. Boundaries and limits
Only synthetic conversation on the owner-supplied test account is authorized for
acceptance. No client documents, PHI, credential changes, payments or messages to
humans. No auto-verification, clinical interpretation rollout or role changes.
Realtime audio and all paid/private-account flows are outside this bounded smoke test.
No independent clinical or universal prose-parser accuracy claim.

## J–L. Release gate
NOT CLOSED until ready deployment and live RU/EN/reload checks. GO for preview
validation; clinical production gates remain NO-GO. Rollback reference: production
27edbd56673ee89f0f62ea872276e55d4d1e16a0, deployment dpl_5ZYUpkyFRvSuruGo84fwRSjZ3Wj2.

## Final merged checks
1265/1265 tests in 149/149 files passed, TypeScript and ESLint exit 0.
Diff against origin/main passes whitespace check. A merge-index check flagged
pre-existing CRLF lines in two provider-policy tests; those are unchanged from main.
Preview f7c75b4: READY, dpl_EdGrHs1LyaQt6JDebGRzg745eZbU, Next.js build 77.8 seconds.
Guest RU response displays ordinary prose. Linked mobile project check failed
with No Next.js version detected / Root Directory configuration; mobile config
and code are unchanged by this PR. The website deployment check passed.

## Published production acceptance — 2026-09-10

The J–L gate above is now satisfied for this scoped release. PR #158 published
the prose normalizer. The follow-up Unicode-whitespace correction was published
as PR #160; its merge commit `ae210e9` is an ancestor of `origin/main`, and
Vercel production deployment `dpl_44jRTzEbgABPovMjcgK5TrXSvuwP` built that exact
commit, reached READY, and serves `pythonmethodcenter.com` and
`www.pythonmethodcenter.com`.

Authorized acceptance ran on the published cabinet in the existing signed-in
synthetic test account: RU reply, EN reply, RU → EN → RU with the route kept,
history retained after a full reload, and signs, decimals and units preserved,
including after no-break, narrow no-break and thin spaces. Only synthetic
messages were sent; no client data, payment or account setting was touched.
Runtime errors for `/api/assistant/client` and `/api/assistant/history` were
queried on the production project and none were found.

Validation carried into publication: 1277/1277 tests in 149/149 files,
TypeScript, ESLint and `git diff --check` passing, and the synthetic benchmark
at 3 documents / 4 pages with critical numeric exact match, verified precision,
needs-review recall and provenance availability at 100% and zero critical
extraction errors, zero false VERIFIED criticals and zero security issues. No
extraction or trust logic was changed, so this is regression evidence only.

### Limits that remain

The historical raw provider response was never retained and was not recovered or
reconstructed; the Unicode defect is reproduced only from a controlled synthetic
fixture, and the link to the original live omission remains unproven. The
separate mobile-project build failure recorded above predates and is independent
of this work and is not attributed to it. No migration, schema, role, payment or
authorization change was part of this release, and no clinical, PHI or
auto-verification gate was closed. Phase 2.9 remains open; production
auto-verification and Phase 3 production remain NO-GO.

Scoped prose and numeric-sign release: CLOSED / GO. Clinical production gates:
unchanged and NO-GO. Detailed mechanism and fixtures:
[Unicode numeric signs](anham_unicode_numeric_signs.md).
