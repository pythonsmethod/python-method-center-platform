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
