# Voice and text permissions / Полномочия голоса и текста

A. Before: voice had broad read tools, while explicit internal-memory commands
and the full text reasoning/archive workflow were available only through text.

B. Change: ask_text_assistant invokes the existing staff POST handler, which
rechecks staff/persona authorization and preserves founder direct-memory commands
and Karen destination confirmation. Voice supplies the actual recognized turn;
the model has no command/content arguments. The server binds actor, locale and
Case from the authenticated session and reads that user's private chat context.
One reservation per signed session/turn prevents duplicate command execution.
Failed/uncertain calls never count as confirmed saves and cannot auto-retry writes.
Karen's existing memory destination controls appear after voice exchanges.

C. Files: voice-text-bridge.ts and its tests; realtime tools route, browser,
turn tracking, tool catalog, server instructions, RU/EN disclosure, AssistantChat
memory controls; CURRENT_STATE, ROADMAP and DECISIONS.

D. No new schema, role, secret or production configuration. Uses existing
assistant_usage for turn reservation, assistant_messages for scoped history and
the text handler's assistant_knowledge writes. Receipt policy version is 4.

E. Validation results are recorded after the test run below. Synthetic tests
cover both personas, actual transcript forwarding, injected command rejection,
client denial, duplicate blocking and text authorization failures.

F. No extraction/trust change; existing synthetic benchmark runs with regression.

G. No PHI used in testing. Voice keeps the same external-provider processing as
the authorized text handler. No keys exported. This is not unrestricted database
access: text permissions, clinical boundaries and confirmation remain enforced.

H. Production voice remains off pending the two exact migration approvals from
builtin_voice_launch_2026_09_09.md. Live microphone/WebRTC acceptance is pending.
Attachments still enter via the existing paperclip/text file-reading workflow;
the voice bridge itself sends recognized text and saved context, not raw uploads.
Internet search retains its existing separate enable flag. A failed command may
need a new explicit user turn; duplicate execution is deliberately blocked.

I. No new ability to send messages, delete business records, pay or approve
clinical decisions; the existing text handler does not provide those operations.
No custom voices. No production-migration workaround.

J. Permission integration implemented; production launch NOT CLOSED.
K. GO for reviewed preview; NO-GO for claiming live production availability.
L. Obtain the pending dedicated production migration approval, configure and
deploy, then verify authenticated founder/Karen calls and transcript reload.

Validation: 1341/1341 tests across 151 files passed. TypeScript and ESLint passed. git diff --check passed. Existing synthetic benchmark: 3 documents/4 pages, 100% critical numeric match and verified precision, zero critical false VERIFIED. No live provider/PHI call in this increment.
