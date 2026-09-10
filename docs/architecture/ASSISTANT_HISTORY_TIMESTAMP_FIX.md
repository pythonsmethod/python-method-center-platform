# Assistant history timestamp fix — 2026-09-09

## Before and confirmed cause

The published private assistant showed its reply but reported that storage could not be confirmed. The previous local proposal guessed that an empty insert response was the cause; that proposal was not published and has been removed.

The actual bulk payload included created_at only on the user row. The installed PostgREST client sends the union of object keys as columns and defaults missing values to null. A read-only query using jsonb_populate_recordset against the production assistant_messages row type confirmed that the answer's created_at becomes null. That column is NOT NULL. Thus both rows in the atomic insert fail. A direct SQL insert omitting the column is not equivalent to this JSON bulk insertion.

Reference: https://docs.postgrest.org/en/stable/references/api/tables_views.html#bulk-insert

## Change and files

- lib/assistant/history.ts now assigns both timestamps explicitly before retrying: the existing request-arrival timestamp for the question, server reply-completion time for the answer. Calls without a question timestamp use reply time for both.
- The confirmation rule still requires the two stored rows from insert or an owner/ID-scoped readback. Empty acknowledgements do not invent saved messages or sequence numbers. Retry IDs and timestamps remain stable.
- tests/assistant-history-postgrest.test.ts exercises the actual installed SDK's serialized requests with a synthetic transport enforcing the timestamp constraint.
- tests/assistant-history-persistence.test.ts adds empty-response/readback success and failure regressions.
- ASSISTANT_CONVERSATION_HISTORY.md, CURRENT_STATE.md, DECISIONS.md and ROADMAP.md record the fix.

## Data, security and scope

No migration, grants, RLS changes, new storage, source-record rewriting or clinical workflow change. Existing authenticated ownership and private/client separation remain. No real medical text is used in acceptance checks. No credentials or transcript bodies are logged or committed. This fixes completed website assistant exchanges; it does not recover conversations that were never persisted or add a durable draft outbox.

## Validation

- Targeted history unit/HTTP/SDK checks: 41/41 PASS in 4 files.
- Full regression on production main d810dd8 plus this fix: 1092/1092 PASS in 139 files. The Stripe product-mapping test passes in this release.
- TypeScript and ESLint: PASS. Final diff check and deployment build are required before release completion.
- Existing synthetic benchmark ran within regression: zero critical extraction errors, false VERIFIED critical errors and security issues. No extraction/trust implementation was changed; these results do not expand clinical validation.

## Closure and next action

Local correction complete; GO for the owner-authorized scoped publication. Production acceptance remains pending: deploy the tested commit, send a non-PHI founder message, confirm both stored rows and date/time, reload, and switch RU→EN→RU on the same route. Record the resulting deployment and acceptance below. Ankh production gates remain unchanged.
