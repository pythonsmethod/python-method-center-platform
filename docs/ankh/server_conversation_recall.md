# Server conversation recall — 2026-09-09

## A–B. Before and implementation

The browser sends about 11–12 recent messages, while the text routes previously
did not retrieve stored dialogue for model context. Browsing archived messages
was therefore not equivalent to the assistant remembering them.

Both client and private staff generation now retrieve the canonical
assistant_messages archive on the server. The latest 60 rows provide continuity;
up to 12 older rows matching up to 8 lexical terms in the current question
supplement them. Each query filters authenticated owner, private/client tier
family and exact Case or personal scope. Interface locale is not a filter.
Guest requests do not query this archive. Staff voice requests routed through
ask_text_assistant inherit this text-generation context.

Recent text receives 32,000 characters and older matches 16,000 when both exist;
otherwise recent text can use 48,000. Each individual excerpt is capped at 6,000
characters and visibly marked if truncated. Source metadata is additional.
Source order is chronological, identity/date/role are retained, interrupted AI
drafts are marked, and JSON escaping protects source delimiters. History is data,
not authorization, approved knowledge, verified facts or confirmed actions.
Current user corrections supersede old user statements without medical promotion.

Database unavailability is distinct from a successful empty query. The model
receives an unavailable source and an instruction to disclose the failure in
the current language, without pretending to remember. Each query has a 6s timeout.

## C. Files

- lib/assistant/conversation-context.ts (new)
- app/api/assistant/client/route.ts
- app/api/assistant/staff/route.ts
- tests/conversation-context.test.ts (new)
- tests/assistant-client-history-route.test.ts
- tests/assistant-history-routes.test.ts
- this report and canonical CURRENT_STATE/DECISIONS/ROADMAP records

## D, F–I. Data, security and limits

No schema, migration, new memory store, anonymous cache, production write or
external provider added. Previously saved text is supplied to the existing
authorized assistant provider; the context volume can increase cost/latency.
No PHI was used in validation. The change neither enables new document processing
nor changes clinical trust gates. Raw source records are not rewritten.

This is bounded lexical recall, not unlimited or semantic memory. Paraphrases
may not match. Oversized messages are excerpts; unsaved conversations cannot be
recovered. Case-bound requests intentionally do not read other Cases or personal
history. Voice startup still loads its existing 24-message window; live voice
interruption repair is the separate retained commit 59e9306. Direct save-command
interpretation remains unchanged. No new UI or locale navigation was introduced.

## E, J–L. Validation and acceptance

Focused tests: 33/33 PASS. Queries use the installed real Supabase/PostgREST
client with synthetic HTTP responses, checking serialized owner/Case/tier
filters, multilingual recall, older matches, budget reservation, error/empty
distinction, interrupted drafts and injection-shaped query text. HTTP route
tests verify context reaches the model and request-body profile IDs cannot
override authenticated identity. No live database or paid model test was run.

Final regression results follow. Production acceptance remains NOT CLOSED;
the next action is isolated publication followed by authenticated RU/EN recall
of a synthetic fact beyond twelve messages and after reload. No new Ankh phase.

Full regression: 1550/1550 PASS (168 files); TypeScript PASS; full ESLint PASS; git diff --check PASS. Existing synthetic extraction benchmark reports 100% metrics and zero critical errors/false VERIFIED/security issues, but is not a conversation benchmark. Implementation CLOSED / GO for isolated release; publication and live account acceptance NOT CLOSED.
