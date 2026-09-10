# Voice conversation continuity — 2026-09-09

## A–B. Defect and correction

The owner reports loss of memory in spoken conversation. On main 77258dc,
RealtimeTurns only retained a turn when both generation and playback completed.
Interrupting Anham therefore removed the recognized user contribution from the
explicit input of subsequent responses. Cancelled, failed and incomplete
responses had the same effect. Five new behavioral regressions reproduced this.

Retain every recognized active user item independently of output completion.
Only completed/heard assistant output and its tool chain enter subsequent live
context. Generated but unheard replies are not represented as completed speech.
Client voice instructions no longer deny supplied saved history; staff instructions
distinguish supplied conversation from current business records requiring tools.
Restored interrupted AI drafts retain an explicit interruption/hearing limitation.
The source origin now names the actual assistant_messages table.

## C. Files

- lib/assistant/realtime-turns.ts
- lib/assistant/realtime-server.ts
- app/api/assistant/realtime/session/route.ts
- tests/realtime-turns.test.ts
- tests/realtime-api.test.ts
- tests/assistant-voice-sources.test.ts
- this report, CURRENT_STATE.md, ROADMAP.md, DECISIONS.md

## D, F–I. Boundaries and limitations

No schema changes, migration, provider change, production write or PHI test data.
Existing actor/Case history ownership and safety rules remain unchanged.
No extraction/trust changes; an extraction benchmark cannot validate voice memory.
No UI copy or route changes; RU/EN prompt and source tests cover both locales.

Session restoration remains the most recent 24 stored messages, not unlimited
long-term memory. Missing transcripts cannot be reconstructed. Interrupted
assistant audio is deliberately excluded from live context because its heard
portion is not established. The existing text bridge/storage timing and
unbounded live-session context are not redesigned in this targeted fix.

No real microphone, paid provider, cross-device or production acceptance has
been performed. These tests establish request context, not universal model recall.

## E, J–L. Validation and release

Before fix: 5 new regressions FAIL, existing 15 turn tests PASS.
Final validation is recorded below after the full run.
Production acceptance NOT CLOSED. Next: isolated release and real RU/EN
microphone acceptance (state a detail, interrupt, ask a follow-up, reconnect).
Clinical phase sequence and production gates remain unchanged.

Final validation: 1540/1540 tests PASS across 167 files with --maxWorkers=2; TypeScript PASS; full ESLint PASS; git diff --check PASS. First unrestricted run: 1539/1540 with an Anna page import/render timeout at 5000ms; unchanged test passed in the complete bounded-worker rerun. New targeted regressions are included in these totals. Existing synthetic benchmark: 3 documents/4 pages, 100% reported exact-match/precision/recall/provenance, zero critical errors/false VERIFIED/security issues (not a voice benchmark).

Local correction CLOSED / GO for isolated release. Production acceptance NOT CLOSED; NO-GO for claiming the published microphone flow is verified. Exact next action: publish only this isolated correction, then verify RU and EN spoken continuity after interruption and saved-history restoration after reconnect. No UI/navigation edits; browser locale-route acceptance was not rerun.
