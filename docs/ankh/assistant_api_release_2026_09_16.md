# Anham API response contract — isolated release

## A. Baseline

The application already uses server-side OpenAI and Anthropic APIs. This is not a migration from consumer ChatGPT/Claude websites. The earlier local increment was developed in an old, heavily modified workspace. The release is isolated from canonical main `cf6174971ebec146716efa1e5626496884a5eb66` and retains its newer archive tools, mandatory safety/factual-honesty policy, authorization, bilingual UI, and response formatting.

## B–C. Changes and files

- New application-owned types and response parsers: `lib/assistant/response-contract.ts`.
- Validate complete text and at most one successful continuation in `lib/assistant/openai.ts`, `claude.ts`, and the authenticated Responses path `openai-archive.ts`. Reject incomplete, malformed, unsupported or nonterminal results instead of returning partial text as success.
- Preserve authorized archive calls and encrypted reasoning; incomplete/malformed function calls are not executed. No new tool or permission is introduced.
- Preserve an explicit arbiter policy refusal and require an exact B selection in `lib/assistant/router.ts`.
- Reuse the existing shared RU/EN boundary in `lib/i18n/api-errors.ts`, including safe localization when a provider error code is missing/unknown. No route or UI replacement is needed.
- Add `tests/assistant-api-contract.test.ts`; extend router and client/staff persistence tests; replace source-string continuation assertions with behavioral coverage. Existing factual-honesty test fixtures now explicitly mark their successful continuation as completed.
- Add the five response/archive/router/history suites to the existing inventory-based `security:check`. Record progress in CURRENT_STATE, ROADMAP, DECISIONS and AI_CORE_MIGRATION_LOG.

Completion handling was verified against [OpenAI reasoning documentation](https://developers.openai.com/api/docs/guides/reasoning). Provider output is untrusted data and never grants access. The transport and existing per-request archive authorization remain authoritative.

## D. Data/schema

No migration, new API route, dependency, role, table, RLS, provider/model selection, production configuration or clinical trust-state change.

## E. Verification

- Focused runtime/HTTP suites: 7 files, 156/156 tests passed.
- Security inventory self-test: 6/6; reviewed network/route inventory: pass; response security suites: 5 files, 143/143 passed.
- Full isolated regression: 200 files passed, 1 pre-existing skipped; 1,885 tests passed, 1 pre-existing skipped. Initial run exposed two incomplete historical mock payloads; those fixtures were corrected to documented completion shapes, without removing their policy assertions.
- TypeScript, ESLint and git diff --check passed.
- Dependency audit: 0 vulnerabilities. The first sandbox audit was network-blocked; approved network retry passed.
- Local dependencies are reused by a directory junction from an existing checkout with an identical package-lock hash. No installation or dependency change. Low local disk space means the release build will be verified remotely rather than creating another local build cache.
- The earlier workspace's obsolete Stripe-price test failure is absent on current main; no payment code was changed.

## F. Benchmark

The unchanged synthetic regression reports 3 documents / 4 pages, 100% critical numeric match, verified precision, review recall and provenance; zero critical errors, false VERIFIED critical errors or security issues. No real document was processed. Generated timestamps are not included in this release.

## G. Security/PHI

No client documents or PHI are used. No production clinical gates, automatic interpretation, auto-verification, credentials or allowlists are changed. Live acceptance is restricted to the separate anham-clinical-staging project and synthetic data. Existing provider error details are not exposed in localized responses.

## H–I. Limitations and exclusions

Structural completion does not prove clinical correctness, grounding or universal provider compatibility. This does not complete the broader provider-independence roadmap. No new model, provider, voice behavior, automatic diagnosis, extraction rule, evidence store or production deployment is included. Archive and client/staff access controls must remain unchanged during acceptance.

## J–L. Gate and next action

Local isolated implementation: CLOSED. Deployed/authenticated acceptance: NOT CLOSED pending preview build and synthetic RU/EN dialogue. GO for preview/review; NO-GO for production promotion until acceptance and explicit release approval. Next: publish the isolated candidate, verify exact-head CI/build, and test the signed-in synthetic conversation and locale switching on staging.
