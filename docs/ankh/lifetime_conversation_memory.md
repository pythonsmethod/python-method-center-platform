# Lifetime conversation archive — 2026-09-09

## A. Before

The canonical assistant_messages archive already had durable text/voice records
without an application age-based purge. Recent-context windows and single-pass
lexical selection nevertheless limited recall. Voice clients had no archive tool;
private voice could reach the text bridge but that remained bounded too.

## B. Implemented behavior and permanent policy

Saved assistant conversations have no age-based expiry. Do not add a rolling
retention/deletion job or replace original records with summaries. Explicit
account/data deletion remains governed by its existing workflow; this policy is
not a promise to reconstruct deleted or never-saved data.

All signed-in assistant users (clients, Anna, Karen, existing authorized delegate)
can search and page through their own assistant archive, regardless of age,
language or whether the original message was typed or spoken. Long individual
messages can be read in full by successive chunks. Lookup defaults to the current
personal/Case scope; explicit allOwnConversations searches the same user's other
Cases, retaining original Case labels. Never merge facts from different Cases.

Native OpenAI and Claude tools expose the same two read-only operations:
search_conversation_history and read_conversation_message. OpenAI uses Responses
with store:false and carries encrypted reasoning items across tool steps; the
selected model/high reasoning setting is preserved. Non-archive requests keep
their existing path. Claude uses native tool_use/tool_result blocks. An authenticated
request-local AsyncLocalStorage scope carries identity through routing/fallback/
synthesis; it is not a memory store, cache or new role system.

Voice exposes the same tools. Clients are allowed ONLY their own archive tools,
never staff business reads, web search, private text commands or other identities.
Every voice operation reauthenticates and verifies its signed actor/Case receipt,
feature gate and existing tool budget. Sources retain speaker, date, Case, language,
voice origin and interruption flags. All are unverified conversation data, not
instructions, approved knowledge, medical evidence or confirmed actions.

## C. Files

New: conversation-archive.ts, openai-archive.ts, conversation-archive.test.ts,
scripts/lifetime-memory-live.config.ts and lifetime-memory-live.test.ts, this report.
Changed: text client/staff routes; realtime tools route; claude.ts, openai.ts,
realtime-browser.ts, realtime-server.ts, voice-site-tools.ts; realtime-api,
voice-site-tools, voice-text-bridge and voice-web-search tests; canonical records.
The branch also retains voice interruption repair and initial server recall.

## D. Schema/data

No migration, new table, retention cutoff, record rewrite, production record edit
or raw-audio storage. Existing assistant_messages remains authoritative. Whole
archive means saved assistant dialogue; staff's existing catalogued business
tools remain the access path for human support/Professor correspondence.

## E–F. Verification

Synthetic tests exercise 2001 voice records, unlimited cursor depth, full-message
chunks, exact owner/tier filters, cross-Case labels, invalid arguments, concurrent
Anna/Karen/client isolation, native tool result forwarding and bounded tool loops.
Voice API tests admit own-history reads while rejecting staff tools for clients.

Live native integration: 2/2 PASS, OpenAI and Claude retrieve the synthetic 2001
record and reproduce its code. No client or medical data used. The initial OpenAI
Chat Completions attempt failed with HTTP 400 on reasoning_effort: this model
requires Responses for tools plus reasoning. Corrected the API path and retested;
did not silently disable reasoning or switch models.

Reference: https://developers.openai.com/api/docs/guides/function-calling and
https://developers.openai.com/api/docs/guides/reasoning . Live tests are opt-in;
provide existing credentials through the environment or ANHAM_TEST_ENV_FILE.
No raw response/error bodies or secrets are logged.

Full final regression/type/lint/diff and release evidence follows below.
The existing extraction benchmark is not a memory/voice accuracy benchmark.

## G–I. Security and limits

No new provider, credential, PHI test transmission or clinical production gate.
Retrieved private text may be sent to the existing provider on an authenticated
request, increasing usage within bounded loops (4 tool rounds, 3 calls per round;
existing voice 60-call session budget). These are request limits, not data expiry.
Queries have timeouts. Empty/error results are distinct and must be described
honestly. Page/chunk sizes do not cap how old an accessible conversation can be.

No promise of infallible model recall: wording, recognition failures, unavailable
storage or incomplete searches can still prevent an answer. Unsaved speech cannot
be recovered. Existing durable transcript acknowledgements/visible failure states
remain; raw audio is not retained. No semantic/vector index or duplicate evidence
store is introduced. No live microphone/browser/cross-device acceptance yet.

## J–L. Closure

Local implementation and synthetic native provider acceptance complete.
Production publication and authenticated browser/voice acceptance remain separate;
GO for isolated release after final checks, NO-GO for universal-memory claims.
Exact next action: release this branch without unrelated workspace changes, then
verify signed-in text/voice archive lookup against the deployed version.

### Final local verification

- `npm test`: PASS, 169 files, 1562/1562 tests (75.88 s).
- `npm run typecheck`: PASS, exit 0.
- `npm run lint`: PASS, exit 0, no warnings.
- `git diff --check`: PASS.
- Native live provider tests: 2/2 PASS using only synthetic archive records.
- Existing extraction regression: 3 documents / 4 pages, reported numeric
  precision/recall/provenance 100%, zero critical issues and security issues.
  This is regression evidence for extraction, not a general memory benchmark.
- Initial sandbox build could not fetch the existing Google Font (EACCES);
  production build retried with network access. No code workaround applied.
- `npm run build`: PASS, exit 0, 55/55 static pages generated.
