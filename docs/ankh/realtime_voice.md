# Голосовой Анхам / Anham realtime voice

**Latest access update:** the owner subsequently requested all site/client data
for both founder and Karen. D-058 and [the broad-access implementation report](voice_site_data_access.md)
supersede this report's narrow inbox/three-tool descriptions and earlier test totals.
This document retains the initial transport/transcript implementation record;
OFF-by-default deployment and PHI gates remain unchanged.

Implementation date: 2026-09-09. Local implementation and synthetic validation;
not deployed, no provider credentials created, no paid provider calls made.

## A. До изменения / Before

`AssistantChat` offered browser speech dictation into a text field, without
spoken replies. The existing session route minted a provider client secret,
used client prompts for every signed-in person and transmitted saved history.
The original transcript route accepted arbitrary pairs and returned `saved: true` even
when the best-effort history writer failed. Private staff chats did not load
their own persistent voice history. The first local voice increment then added
completed-turn storage; this follow-up extends it with live text, interrupted
records, older-history paging and operational site reads.

## B. Реализация / Implementation

- A microphone action starts a continuous WebRTC conversation in the signed-in
  client widget and private staff chats, including Case chat. Guests retain the
  existing text/dictation experience.
- RU/EN states: microphone permission, connecting, listening, preparing a reply,
  speaking, reading site data, error, ended; a visible End action is available during connection.
- OpenAI's unified SDP handshake runs through the authenticated server. Neither
  the permanent key nor a provider client secret is returned to the browser.
- Cookie or bearer authentication uses `getUser`, then checks the current profile.
  Guests, anonymous sign-ins, suspended/closed profiles and cross-origin requests
  are rejected. Staff access requires both the existing staff role and the
  existing founder/Karen email allowlist. Request-body role/profile assertions
  are not authorization. A client can bind only their own Case.
- Separate voice prompts for registered/paid clients, founder and Karen. Client
  context includes the server-checked paid-support tier and Case presence.
  Founder context concerns product/operations; Karen context concerns private
  drafting and review. No clinical facts or personal identifiers are in prompts.
- Recognition is matched by committed input item ID. Each response explicitly
  references that item and completed earlier live turns, preserving the ongoing
  conversation without confusing delayed recognition with a later utterance.
- Recognized user words appear immediately; reply deltas update one bubble in
  place. A completed pair is stored after final generation AND playback completion.
  Interrupted/failed output keeps the available text with an explicit interruption
  label, including user-only records. It never claims all generated text was heard.
  Missing/failed recognition is not invented. Duplicate events cannot duplicate a turn.
- Saving is serialized, reports failures, supports explicit retry and uses an
  idempotent key. Text appears in the current chat and later history with a
  bilingual “unverified voice transcript” label.
- Staff can load earlier messages using a sequence cursor, keeping the same
  actor/locale/persona/Case filters. History errors have a visible retry action.
- Staff voice has three named read-only operations: `registration_counts`,
  `incoming_messages`, `read_incoming_message`. The server reauthenticates every
  call and checks its signed session, kill switch, allowlist and 60-read session cap.
  Founder can read support only; Karen defaults to Professor and can request support.
  Clients have no site-data tools. Browser tool execution resumes the same response
  with returned results, limits rounds and discards late results after interruption.
- Registration counts are exact current `role=client` profile rows and today's
  registrations, excluding staff/deleted accounts; not a cumulative historical
  count of deleted registrations. Inbox reads return today's client messages,
  names, exact per-sender counts, 20-message pages and previews up to 2,000 characters.
  A selected message can be read in full. Guest counts refer to a support request,
  not a verified person. Empty text is not replaced by an invented audio transcript.
- “Today” follows the device IANA timezone signed into the session, with DST-aware
  midnight boundaries and UTC fallback if omitted. Each result carries its date,
  source, channel and query time. Errors/missing counts fail closed; unknown is not zero.
- Stop, unmount, locale/Case change, page exit, network/audio failure and the
  session timer stop microphone tracks and close peer/channel/audio resources.
  A late microphone permission result after Stop is immediately released.

## C. Файлы / Files

New modules:
`lib/assistant/realtime-contract.ts`, `realtime-server.ts`,
`realtime-browser.ts`, `realtime-turns.ts`, `voice-chat.ts`, `voice-site-tools.ts`;
`components/assistant/RealtimeVoice.tsx`.
New staff tool route: `app/api/assistant/realtime/tools/route.ts`.

Updated integration:
`app/api/assistant/realtime/session/route.ts`,
`app/api/assistant/realtime/transcript/route.ts`,
`app/api/assistant/history/route.ts`, `lib/assistant/history.ts`,
`components/assistant/AssistantChat.tsx`,
`components/assistant/SavedAssistantThread.tsx`, `app/globals.css`,
`app/(admin)/admin/assistant/page.tsx`, `app/(admin)/admin/page.tsx`,
`app/(admin)/admin/cases/[caseId]/page.tsx`, `.env.example`.

Tests: `tests/realtime-api.test.ts`, `tests/realtime-browser.test.ts`,
`tests/realtime-turns.test.ts`, `tests/voice-site-tools.test.ts`,
`tests/voice-chat.test.ts`, `tests/fixtures/realtime-ui/`.
Project memory: this document, `CURRENT_STATE.md`, `DECISIONS.md`, `ROADMAP.md`.

## D. Данные / Schema

Repository-only migration:
`supabase/migrations/20260909211728_assistant_voice_transcripts.sql`.
It was generated with the Supabase CLI and has NOT been applied to any database.

Reuse `assistant_messages`, adding:

| Field | Purpose |
| --- | --- |
| `conversation_scope` | `client`, `founder`, `karen`; existing rows default to client |
| `source` | `text` or `voice_transcript`; existing rows default to text |
| `exchange_id` | signed session UUID + provider input item ID |
| `voice_state` | `completed` or `interrupted`; existing text rows may remain null |

Unique `(profile_id, exchange_id, role)` prevents retry duplicates; two rows are
inserted together by one database operation with duplicate updates disabled.
An interrupted user-only record inserts just the recognized user row. This field
describes speech playback only; it is not a client/Case processing classification.
Existing owner-read RLS and server-only writes remain. Server history queries
add actor/locale/scope and, for staff, selected Case (or no Case) filters.
Client Case-history helpers explicitly exclude private staff scopes.
No new Case, clinical fact, review state or processing classification is added.

Session admission verifies these columns exist before contacting the provider.
The existing `bump_assistant_usage` RPC provides shared per-account admission
limits: two starts per minute and a configurable daily allowance. Counter/schema
failures deny startup; they do not silently disable protection.

## E. Проверки / Verification

Final local results:

- Voice unit/API/lifecycle/site/history suites: **83 passed** in the full suite.
- Full suite: **130 test files passed, 1,061 tests passed**, zero failures
  (`npm test`, 2026-09-09; final run 16.89 seconds).
- `npm run typecheck`: passed, exit 0.
- `npm run lint`: passed, exit 0, no warnings/errors.
- `git diff --check`: passed; Git reports only LF/CRLF conversion notices.
- Previously documented unrelated failures were not reproduced in this run.

The schema-column regression initially rejected multi-column ALTER formatting;
the migration now uses explicit per-column ALTER statements and the check passes.
The voice suites cover role escalation, anonymous/suspended users, Case isolation,
origin/consent/body limits, missing migration, disabled configuration, provider
failure sanitization, signed receipt binding/expiry/tampering, storage failure,
idempotent keys, transcript ordering, interruptions, playback, cancellation,
timeouts, microphone release, RU/EN labels and prompt boundaries. New tests cover
live deltas, interrupted persistence, tool continuation/late results, founder
private-channel denial, exact counts, pagination, names/guest handling, truncated
and full message text, missing-data failure, argument restrictions, shared tool
cap, kill switch after admission, signed timezone and 23/25-hour DST days.
Older tests asserting that interrupted words must disappear were updated to
assert explicit interrupted records; no failing tests were hidden or skipped.

Synthetic browser fixture command:

```powershell
npm exec -- vite tests/fixtures/realtime-ui --config tests/fixtures/realtime-ui/vite.config.ts
```

Open `http://127.0.0.1:4173/` or `/?chat=1` for the actual `AssistantChat` integration.
This standalone fixture imports the actual voice
component but replaces microphone, WebRTC and fetch; every unrecognized fetch
throws. It is outside Next.js routes and never ships as a product screen.

Browser checks performed with agent-browser: RU start/listening/speaking/saved;
EN permission denial/retry; explicit save failure/retry; RU→EN→RU at the same
URL; track release on locale change; 390px viewport with no horizontal overflow
(`scrollWidth=390`, button width 312px), and no Vite error overlay.
The follow-up additionally verified recognized words BEFORE any reply, a function
call returning synthetic counts (12 total / 2 today), reply text BEFORE playback
completion, one saved exchange with no duplicates, and EN interrupted text with
a confirmed write. The actual chat variant verified old/new history ordering,
load-earlier in RU/EN, and live bubbles alongside saved messages. RU→EN→RU kept
the same URL; mobile width/scrollWidth were 390/390 with no error overlay.
These prove component behavior with synthetic inputs, not actual audio quality,
deployed authentication or database RLS behavior.

## F. Benchmark

No extraction/trust behavior changed; no new clinical benchmark was needed.
The full regression suite also executes the existing synthetic benchmark.
Synthetic benchmark: 3 documents / 4 pages; critical numeric exact match,
verified precision, review recall and provenance availability 100%; critical
extraction errors 0; false VERIFIED critical errors 0; security issues 0.
These synthetic metrics are not evidence of live voice or clinical accuracy.
No real Case, PHI, OCR or LLM request was used for validation.

## G. Безопасность / Security and PHI

The feature is OFF by default and additionally requires an explicit test-account
allowlist. The start disclosure explains AI voice, external speech transmission,
text persistence in RU/EN. Staff disclosure also explicitly covers on-demand
transmission of the caller's authorized registration/message data.

No audio file, MediaRecorder output, provider payload, key, or raw speech is saved
to application storage or logs. Audio travels directly from browser to provider
over WebRTC. This says nothing about the provider's own retention; that requires
separate account/compliance review before real personal/medical use.

Documents, clinical snapshots, methodology memory and saved assistant conversations
are NOT automatically sent. Requested message text and sender names may be sent
to the voice provider as untrusted tool data: support for founder, Professor or
support for Karen. No email/phone fields, raw audio URLs or document contents are
queried. Reading does not mark messages read. Message text may contain PHI, so
real sensitive-data use remains subject to the approved workflow and production gate.
Only this live session's completed turns/tool results are referenced for continuity.
Prompts prohibit promoting SOURCE_ONLY/NEEDS_REVIEW or making clinical decisions;
this is not a deterministic model-output guarantee. There are no write tools.

Session receipts are HMAC-signed, bound to actor, persona, Case, locale and timezone, and
expire ten minutes after the configured session duration. The transcript is
client-reported text; the receipt proves permission to append to that channel,
not that the provider independently attested to the exact words. It never enters
verified clinical evidence or automatically approved methodology.

## H. Ограничения / Limitations

- No live provider, real microphone/speaker, Safari/iOS or authenticated staging
  validation has been performed. No isolated database was available or used.
- This is a controlled non-sensitive pilot, not production PHI authorization.
  An arbitrary speaker can still say sensitive words; UI/prompt instructions
  cannot guarantee that speech contains no PHI.
- Direct WebRTC clients can manipulate their own data channel. Prompt rules and
  the browser's duration timer are not a server-enforced medical guardrail or
  hard spending ceiling. A production release needs server-side session control,
  budget monitoring, provider retention review and an approved clinical workflow.
- Session admissions and site-tool reads are limited on the server. Default five-minute duration
  is enforced by the supported UI; no server-side call termination service exists.
- Recognition may be wrong. Recognized interrupted/unfinished turns are retained
  with an explicit note; unrecognized speech at disconnect cannot be recovered.
  Failed pending writes remain only in component
  memory; closing the page before a successful retry can lose them.
- Existing staff text chats still have their previous persistence behavior;
  this increment adds durable staff VOICE history. The voice context does not
  automatically include the text chat visible beside it.
- Site reads cover registrations and the two permitted incoming-message channels,
  not arbitrary site/database questions. Audio-only messages are not transcribed.
  Inbox pages are fresh reads, not a transaction snapshot; arrivals during paging
  may change totals/order. Results disclose query time and partial coverage.
- The master-concept DOCX/Markdown and the classification document named by
  AGENTS.md are absent in this checkout. Repository `docs/ankh/` and the supplied
  no-classification rule were used; no missing document contents were invented.

## I. Намеренно не включено / Intentionally excluded

Production deployment, external key creation, billing activation, database
migration execution, general PHI processing, automatic diagnosis/treatment,
Karen decision approval, client message sending, raw-audio recording,
automatic knowledge capture, provider fallback and clinical trust changes.

## Конфигурация / Configuration

All voice settings are SERVER-ONLY, never `NEXT_PUBLIC_`. Add secret values only
to an ignored local env file or the intended isolated staging secret store.
The repository contains blank placeholders; no real secret was written.

| Variable | Manual value / Значение |
| --- | --- |
| `OPENAI_REALTIME_API_KEY` | Key of an existing, explicitly authorized OpenAI project with realtime access. Optional if `OPENAI_API_KEY` is already provided. No key is created by this code. |
| `OPENAI_API_KEY` | Existing server key fallback; unchanged text-provider setting. |
| `ANHAM_REALTIME_SESSION_SECRET` | Independent cryptographically random signing secret, at least 32 characters. Use a secret-manager generator; do not reuse the provider key. |
| `ANHAM_REALTIME_ENABLED` | `false` by default. Set `true` only in the authorized isolated pilot environment after schema validation. |
| `ANHAM_REALTIME_TEST_EMAILS` | Comma-separated signed-in non-sensitive test accounts; empty means no access. |
| `OPENAI_REALTIME_MODEL` | Default `gpt-realtime`; select an available realtime model explicitly if different. |
| `OPENAI_REALTIME_TRANSCRIPTION_MODEL` | Default `gpt-4o-mini-transcribe`. |
| `OPENAI_REALTIME_VOICE` | Default `marin`; use a voice supported by the selected model. |
| `ANHAM_REALTIME_MAX_SECONDS` | Default `300`; integer 1–900, supported-browser timer. |
| `ANHAM_REALTIME_DAILY_SESSIONS` | Default `10`; integer 1–100, shared per-account admission cap. |

Existing Supabase URL/anon key/service-role configuration is still required.
Existing `FOUNDER_EMAILS`, `KAREN_EMAILS`/`KAREN_PRIMARY_EMAIL` and staff profile
roles control private personas; pilot allowlisting alone never grants staff access.
`PUBLIC_ASSISTANT_MODE=off` also stops new client voice sessions.
Browser requirements: HTTPS (localhost is acceptable), microphone permission,
WebRTC and audio playback; deployment headers must allow a same-origin microphone.

## J–L. Closure and next action / Закрытие и следующий шаг

Implementation and synthetic validation: CLOSED after the final checks below.
Live/staging acceptance: NOT CLOSED. Production release: NO-GO.
GO only for a separately authorized isolated pilot using synthetic speech.

Exact next action: identify an isolated staging database, apply the repository
migration there, supply the existing authorized provider key and signing secret,
allowlist synthetic test accounts, and verify actual two-way audio plus persistent
history for client/founder/Karen in both locales. Include actual tool continuation,
founder/Karen inbox restrictions, date boundaries, interruption and older-history
paging with synthetic inbox rows. Do not enable production or PHI
on the strength of this local test report.

Official protocol references:
[OpenAI WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc),
[OpenAI conversation events](https://developers.openai.com/api/docs/guides/realtime-conversations),
[Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser),
[Supabase upsert](https://supabase.com/docs/reference/javascript/upsert).
