# Built-in Anham voice launch — 2026-09-09

Latest rollout: owner explicitly approved the two production migrations and
site enablement. Both applied successfully; all five columns, both indexes and
enabled RLS verified. Production/preview flags and a server-only signing secret
configured; built-ins/staff-only enabled, custom voices off, web search enabled.
Current main integration preserves source-tagged history/factual honesty.
Earlier blocked status below is historical; production build acceptance follows.

A. Before: five-voice/avatar implementation existed on the preview branch, but
production flags, signing secret and voice-history schema were not activated.

B. Changes: integrated current main chat history and shared safety policy;
preserved staff history timestamps and founder/Karen tiers; introduced enforced
built-ins-only selection and verified-staff-only rollout. The existing avatar
launcher is present in staff chats. Client access remains denied during rollout.

C. Principal files: `AssistantChat.tsx`, `history.ts`, realtime transcript route,
`realtime-server.ts`, `voice-options-server.ts`, `voice-chat.ts`, `prompts.ts`,
site data catalog, regression tests, synthetic browser fixture and
`scripts/check-builtin-voices.mjs`. See Git diff for full paths.

D. Exact requested production schema scope (not applied):
- `supabase/migrations/20260909211728_assistant_voice_transcripts.sql`: add
  conversation_scope, source, exchange_id, voice_state and two history indexes.
- `supabase/migrations/20260909231052_assistant_voice_web_results.sql`: add
  bounded web_results JSON array for saved public-source citations.
Both reuse assistant_messages; no data deletion, clinical schema or RLS changes.
Both applied successfully to staging atdmzkciqxdgblusbhtr. Synthetic transaction
inserted a voice exchange, retried it, asserted exactly two rows, then rolled back.

E. Validation: 150 test files / 1336 tests pass (`npm test -- --run --maxWorkers=1`).
TypeScript and ESLint pass. An earlier parallel run exhausted Node worker memory;
the single-worker full rerun passed. Three actual merge regression failures
(new catalog table, timestamp assertion, shared safety policy) were fixed first.
Live gpt-4o-mini-tts requests for Marin/Cedar/Coral/Sage/Verse each returned HTTP
200 and valid WAV using only a fixed synthetic phrase. This proves TTS preview
availability, not an authenticated end-to-end production WebRTC call.

Preview build for commit 789ed10b9b2d07914fe8495d4a0602a5cf41be77 reached READY
(`dpl_4GnH6vtTKSSkxkVvNex9CZJnZwuE`). Draft PR #159 is prepared. Synthetic
browser checks confirm the staff composer avatar opens the full-screen dialog,
exactly five options are shown, Cedar selection persists into the English call,
and the chat route remains unchanged when changing language.

F. Existing synthetic benchmark regression: 3 documents / 4 pages, 100% critical
numeric exact match and verified precision, zero critical false VERIFIED. This
is regression evidence only, not general clinical validation.

G. No personal voice clone or consent asset created. No client data used in live
provider checks. Provider audio is processed for conversation; the app persists
unverified text, not raw audio. Existing role/email checks and read-only data tools
remain. Production secret bulk export was rejected; no such file was created.

H. Production voice remains disabled. Production migrations were rejected by
automatic review, requiring a dedicated approval under AGENTS.md. Preview cannot
be treated as live persistence acceptance without its matching database schema.

I. Deferred: personal voice recordings/cloning, production clinical processing,
automatic diagnosis/decisions. No additional clinical migrations will be applied.

J. Phase NOT CLOSED (production launch).

K. GO for review; NO-GO for claiming production launch before schema/config and
authenticated live call/transcript-reload acceptance.

L. Next: obtain explicit approval for the two exact production migrations above;
apply only those, configure ANHAM_REALTIME_ENABLED=true,
ANHAM_REALTIME_STAFF_ONLY=true, ANHAM_VOICE_BUILTINS_ONLY=true,
ANHAM_CUSTOM_VOICES_ENABLED=false and a generated server-only signing secret;
deploy reviewed code and verify founder/Karen voice and history. Existing OpenAI
credentials are reused without broad secret export. Rollback: disable
ANHAM_REALTIME_ENABLED and redeploy; retain additive history columns/data.
