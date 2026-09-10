# Голосовой Анхам: интернет-поиск / Anham voice web search

Date: 2026-09-09. Decision: D-059. Local implementation; not deployed or enabled.

## A. Before

Founder and Karen could read the reviewed site-data catalog during a voice
conversation, with live text and scoped history. No live public web search existed.

## B. Change

Staff voice now has an optional `search_web` function. The authenticated server
delegates a short public-topic query to OpenAI Responses with `web_search`,
`tool_choice: required`, `external_web_access: true` and `store: false`.
The default search model is `gpt-4.1`; the voice model is unchanged. Both existing
founder/Karen identities qualify; client sessions receive no search tool.

Only completed provider searches with a completed, cited answer are accepted.
The returned excerpt is distinct from the spoken paraphrase: actual provider
annotation offsets become clickable inline citations beside the voice reply.
The excerpt, sources and retrieval timestamp survive history restoration. They
remain unverified conversation material, never verified clinical evidence.
Source text is rendered as escaped text. Links allow public HTTP(S) domains only,
without credentials, custom ports, IP literals or local/internal host suffixes.
The application does not fetch citation URLs or execute source instructions.

A domain-separated HMAC attests each result to its voice session. The browser
keeps the signature out of model context and submits it for persistence. The
server verifies it and derives stored results from the signed payload, ignoring
client-supplied excerpts. A signature proves receipt within that session, not
the truth of a source or the correctness of the spoken paraphrase. Returned
results remain attached to interrupted turns, including when no answer was spoken.

RU/EN cover the searching state, external-query disclosure, source heading and
timestamp. Signed data-policy version 3 prevents pre-search-disclosure sessions
from acquiring the new tools. Switching language preserves the route and restores
the relevant locale's history.

## C. Files

- New: `lib/assistant/voice-web-search.ts`, `lib/assistant/web-results.ts`,
  `components/assistant/VoiceWebResults.tsx`, `tests/voice-web-search.test.ts`.
- Updated: realtime server/browser/turn contracts, site tool registration,
  tool/transcript/history routes, history/catalog/voice-chat modules, RealtimeVoice,
  AssistantChat, SavedAssistantThread, shared CSS, API tests and browser fixture.
- Configuration/documentation: `.env.example`, this report, CURRENT_STATE,
  DECISIONS and ROADMAP.

## D. Data/schema

CLI-created, NOT APPLIED:
`supabase/migrations/20260909231052_assistant_voice_web_results.sql`.
Adds `assistant_messages.web_results jsonb`, default `[]`, array length at most 3.
Existing row ownership, RLS and persona/locale/Case scoping remain authoritative.
No new Case, clinical fact, role or evidence table. Session admission checks the
column before starting provider audio. The earlier voice transcript migration
is also a prerequisite; neither migration has been applied by this task.

## E. Tests and exact results

- New search tests: **35 passed**. Provider request minimization, role/flag/pilot
  denial, audit/counter failures, identifiers, no-search/uncited/incomplete/error
  responses, cancellation, URL validation, signature tampering/session binding,
  tool continuation and interrupted result retention.
- Search plus realtime API tests: **75 passed in 2 files**, including authenticated
  search → signed result → transcript storage, forged result rejection and old
  policy refusal.
- Full `npm test`: **1133 passed in 132 files**, **13.72 s**, zero failures.
- `npm run typecheck`, `npm run lint`, `git diff --check`: pass.
- Initial test discovery revealed this repository only loads `.test.ts`; an
  attempted component import also encountered the existing JSX-preserve test
  configuration. Test layout was corrected and UI rendering was checked in the
  browser without changing the repository's test configuration.
- Isolated real AssistantChat UI, synthetic media/API only: RU → EN → RU,
  live cited replies, saved-history restoration, same URL, safe NASA href/rel,
  no browser errors; 390 × 844 mobile viewport has no horizontal overflow.
  Artifacts: `output/voice-web-ru.png`, `output/voice-web-mobile-ru.png`.

## F. Benchmark

Existing synthetic benchmark ran within the full suite: 3 documents / 4 pages,
100% provenance availability and needs-review recall, 0 critical extraction
errors, 0 false VERIFIED critical errors, 0 security issues. This is not a
benchmark of real web answer quality, speech recognition or clinical accuracy.
Generated baseline files were restored; no real client records were used.

## G. Security / PHI / cost

Server key reuse only; no new key created, no key printed or sent to the browser.
No paid provider call, production data read, deployment or remote schema change.
`ANHAM_WEB_SEARCH_ENABLED=false` by default; voice pilot restrictions still apply.
Existing shared 60-tool-call budget applies. Dedicated atomic buckets allow
3 search attempts per session per UTC date and 10 per person per UTC date.
The existing counter rolls over at UTC midnight. At most 3 returned results are
accepted in one turn. Failures consume reserved attempts. Server timeout 30 s,
browser timeout 35 s, output 900 tokens, query 400 characters, excerpt 3500
characters and at most 5 citations. Audit success is required before external
search; it stores actor/persona/session/operation, not query or source body.

The search request contains only a short query plus fixed instructions, never an
automatic conversation/document/site-data attachment. Tool instructions prohibit
private data; common emails, phone numbers, UUIDs and key patterns are rejected.
This is defense in depth, NOT a guarantee that arbitrary names or free-form PHI
will be detected. Mixed private-data/public-search sessions need explicit staging
privacy acceptance before real-data rollout. `store:false` is an API option, not
a claim about all provider retention. Retrieved content is untrusted data and
cannot authorize a tool action or promote source facts to VERIFIED.

## H. Known limitations

No live provider/database/audio validation; staging migration syntax and RLS
acceptance remain pending. Search quality, freshness, source accessibility and
spoken paraphrase accuracy cannot be guaranteed. Oversized, uncited or malformed
provider results fail honestly rather than being silently truncated. Citation
attestation binds to the session, not individual spoken claims. A result arriving
after stop/interruption is discarded; it is not presented as a completed answer.

## I. Intentionally not implemented

Production enablement, paid/live tests, search for registered clients, arbitrary
website crawling, private account login, new extraction, diagnosis, clinical
recommendations, record edits or sending messages. Typed assistant routing is
unchanged; this increment concerns the user's voice request.

## J–L. Phase and next action

Local implementation CLOSED. End-to-end release phase NOT CLOSED.
GO for isolated synthetic staging acceptance; NO-GO for production/PHI rollout.
Exact next action: in an authorized staging task, apply the two reviewed voice
migrations, verify saved-history reads/RLS and both staff identities, then test
a public-topic search and audio continuation with authorized existing credentials.
Keep production and paid calls disabled until that separate task authorizes them.

Provider contract checked against the official
[OpenAI web-search guide](https://developers.openai.com/api/docs/guides/tools-web-search).
