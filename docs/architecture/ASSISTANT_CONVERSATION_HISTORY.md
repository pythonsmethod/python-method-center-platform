# Assistant conversation history — 2026-09-09

## A. Before and root cause

Private founder/Karen POST responses were not written to assistant_messages, and private AssistantChat instances did not request history. This is a persistence omission, not evidence that a prompt edit deleted conversations. Client replies already used assistant_messages, but insert errors were discarded; the history API turned load errors into empty success, omitted timestamps, and filtered by current interface locale. The chat loaded only 60 recent messages, without older-page access, and could send before initial restoration finished.

Read-only production audit of python-method-center-platform (zdrfttgwnyorifmpqgwe): 66 stored messages, 16 tier=client and 50 tier=registered. No founder/karen-tier rows at audit time. Only aggregate counts, table metadata and policy definitions were inspected; no conversation content or identifying screenshots were exported. An absence of new private tiers is not proof that no founder ever used the separate client widget.

## B. Implemented behavior

- Completed founder and Karen exchanges now use the existing history table, including founder memory-command responses and Karen's destination-confirmation conversation. History does not itself create approved knowledge, medical facts or client decisions.
- Default private history wiring covers every shared staff AssistantChat surface. Account owner plus private/client tier family isolate conversations. Private personal history excludes case discussions; private case history requires both owner and exact case ID.
- All original languages are returned together, including historical null-locale rows. Language changes format dates and labels without hiding messages or translating original content.
- History returns IDs, persisted timestamps and stable database message_sequence values. The question timestamp is recorded at request arrival; the answer timestamp is recorded on the server when the reply is ready. Both are explicitly included in the bulk insert (see ASSISTANT_HISTORY_TIMESTAMP_FIX.md). The browser displays local date/time on each stored message.
- Cursor pagination exposes older history without resending the entire archive to the model. Existing bounded model context remains separate. Prepending older pages preserves reading position.
- Restoration completes before sending. Failed loading has a visible retry state and is never reported as a successful empty thread. API responses are private/no-store. Case changes remount the conversation to prevent stale case content from appearing in another case.
- Exchange insertion is acknowledged only on confirmed two-row persistence. Up to three bounded attempts reuse the same row IDs; an uncertain acknowledgement is checked by owner and IDs before retry. Original answers are not truncated for storage.
- Displayed client guard responses are stored too. Transient technical attachment batches remain excluded; the visible final exchange is stored.
- Editing sends a revision while preserving prior dialogue. A storage failure keeps the answer visible, shows a persistent bilingual warning and offers a local text download including the unsaved exchange.
- Guests receive an explicit sign-in reminder. No anonymous server archive or browser PHI cache was introduced.

## C. Files changed by this task

- lib/assistant/history.ts
- app/api/assistant/history/route.ts
- app/api/assistant/staff/route.ts
- app/api/assistant/client/route.ts
- components/assistant/AssistantChat.tsx
- tests/assistant-history-persistence.test.ts (new)
- tests/assistant-history-routes.test.ts (new)
- tests/assistant-client-history-route.test.ts (new)
- this record, CURRENT_STATE.md, DECISIONS.md, ROADMAP.md

The workspace contained extensive pre-existing changes and another concurrent task modifying Anna's knowledge flow. Those changes were preserved. Shared-file integration is verified locally; this report does not claim all shared-file changes were authored here.

## D. Data/schema

No migration, new table, grant or RLS change. Existing tier is unconstrained text and supports founder/karen. The existing SELECT policy is profile_id = auth.uid(); writes continue through the authenticated server's service client. No production records were changed during this task. Existing client history remains intact.

## E. Validation

- New persistence and HTTP integration tests: 37/37 PASS across 3 files.
- Combined history/confirmation/founder-memory run: 50/50 PASS across 4 files before the additional 6 client tests.
- Full regression: 873/874 PASS across 123 files (122 pass, 1 fails). The known unrelated tests/stripe-product-mapping.test.ts still expects the old 3,675 USD support total; current price mapping rejects it. The earlier transient private-persona test mismatch from concurrent knowledge edits was resolved by that task and does not fail in the final run.
- TypeScript: PASS. Full ESLint: PASS. git diff --check: PASS (line-ending conversion warnings only).
- Browser: real AssistantChat mounted in a synthetic Vite harness, Playwright with Edge, 14 scenarios PASS and zero page errors: restore, timestamps, older messages, send/reload, RU→EN, EN→RU, unchanged route, case isolation, load failure, blocked sending on missing history, retry, visible save failure, download includes unsaved exchange, English warning. API responses in this harness are mocked; it is not an authenticated production acceptance test. agent-browser was not installed, so bundled Playwright was used.
- Production schema/count/RLS read queries confirmed the existing storage and ownership policy. No production writes or paid model requests were made.

## F. Benchmark

Not applicable: no extraction, trust gate, provenance or Ankh analytical change.

## G. Security/PHI

Private transcripts may contain confidential methodology or case text and are now stored only under the authenticated author's profile. Service role remains server-side; public/client history explicitly excludes private tiers. Staff context for a client continues reading client/registered tiers only. No transcript bodies are logged or committed, and no new external AI/document provider is called. User-triggered downloads stay local. Existing account deletion/case deletion behavior remains as defined by current foreign keys.

## H. Known limitations

- Old private conversations never written to the database cannot be recovered from that database. No fabricated history was created.
- This stores completed visible exchanges. Provider errors, abandoned drafts and a request interrupted before its result is persisted are not a durable message outbox. A prolonged database outage remains a visible unsaved state; there is no guarantee of persistence while storage is unavailable.
- Anonymous visitors need an account for durable cross-visit history. Raw attachments themselves are not archived by this chat change.
- Browser acceptance was synthetic. Deployment and authenticated production reload/cross-device acceptance have not been performed.
- Original chat text retains its original language. The model still receives only its recent bounded context, even though the user can browse older archived messages.
- Dedicated chess/voice flows were inspected as separate existing persistence paths and were not redesigned here. This task addresses the website's shared client/private assistant chat, not a new native app release.

## I. Intentionally excluded

Prompt/persona redesign, new methodology approval policy, anonymous archives, new storage providers, medical interpretation, automatic verification, production migrations, whole-workspace publication and recovery of nonexistent records.

## J–L. Closure and exact next action

Local implementation CLOSED. Production acceptance NOT CLOSED. GO for an isolated release review containing the history changes and the concurrent founder-memory integration; NO-GO for publishing the entire divergent working tree. Next action: prepare that release against current production main, deploy through the established release path, then verify a synthetic signed-in founder/Karen/client exchange survives reload and preserves timestamps on the deployed site. The Ankh phase sequence and existing production gates remain unchanged.

## Publication scope — 2026-09-09

Owner explicitly requested publication. Release branch codex/publish-assistant-history-20260909 starts at production main d9e001ff9d22d6b6b182d0b79247ef362a8b94b0. The production client API translations/IP handling, safety behavior, accessibility attributes and all unrelated production features are preserved. Separate local founder-knowledge automation, structured case reply rendering and message-edit UI are deliberately excluded; they are not prerequisites for durable history. Existing memory-confirmation interactions use an explicit request flag and now persist their displayed exchange without changing knowledge approval.

Release regression: 1019/1019 tests pass across 129 files, including 37 new history tests. The old Stripe failure belongs to the divergent root workspace and does not fail in this release. Initial client test mocks required adaptation to production's request-locale resolver; all six adapted tests pass. Synthetic benchmark executed as part of full tests: zero critical extraction errors, false VERIFIED critical errors or security issues. No extraction implementation changed. Lint and diff check pass. Production build/live acceptance is recorded in the final publication note.

## Integrated release verification — 2026-09-09

PR #154 was published while this release was being prepared. The release now merges production main addefd6a32c9234c909b59c40a4139626c01e080 and preserves Anna's single-window memory/archive commands. All successful early memory replies use the same durable exchange persistence. This supersedes the earlier scope note excluding the then-unpublished memory changes.

Combined validation: 1041/1041 tests across 132 files passed; production build passed including TypeScript and lint. No schema migrations or new permissions. Authenticated production acceptance follows the final deployment.
