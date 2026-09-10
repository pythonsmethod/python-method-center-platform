# Anham voice delivery — 2026-09-10

A. Before: live output speed 1, no shared diction/sample instructions; the browser
blocked client read_my_case/search_web despite the authenticated pilot API support.
B. Change: shared Russian/English warm delivery, context-sensitive empathy, varied
short conversation openings/closings, natural pauses and full endings; speed 0.95
in live output and samples. Five selected voices preserved. Browser forwards only
own archive, own-case and web tool names to the authoritative server guards.
C. Files: lib/assistant/voice-delivery.ts, realtime-browser.ts; realtime session and
voices/preview routes; realtime-api/browser tests; project memory and this report.
D. Data/schema: none; no historical messages rewritten.
E. Tests: 107/107 in realtime-api, realtime-browser, realtime-turns,
assistant-client-history-route and client-voice-context. TypeScript and scoped
ESLint pass; git diff --check passes. The first three new browser fixtures failed
because function-call item IDs were missing; corrected fixtures pass. Existing
normal completion still waits for audio playback stop. No new playback changes.
F. Benchmark: not applicable; extraction/trust unchanged.
G. Security/PHI: no new roles, account grants or external data pathways; existing
server receipts, pilot/ownership checks, quotas and web policies retained.
H. Limitations: instructions and a 5% speed reduction cannot guarantee every stress
or ending; live acoustic listening not performed. Interruptions/network/session
limits can still cut playback. Specific mispronounced words not yet supplied.
I. Not implemented: custom voices, new clinical interpretation, automatic mood or
health promises, forced cheerfulness or repeated praise. No route/navigation UI edits.
J. Phase: implementation verified; release pending below. Acoustic acceptance open.
K. GO for publication and live testing; no claim of universal pronunciation accuracy.
L. Next: publish, verify production deployment, then listen in a new voice session.

Provider references: https://platform.openai.com/docs/api-reference/realtime
and https://platform.openai.com/docs/api-reference/audio . Speed controls pacing;
prompt instructions guide delivery but do not guarantee acoustic correctness.