# Voice connection recovery — 2026-09-10

A. Previous behavior: immediate teardown on transient disconnected; every provider
error reported as connection failure; no diagnostic details retained.
B. Existing peer gets an 8-second recovery window. Repeated disconnected events do
not reset it. Recovery cancels it; Stop and hard session limits still release all
resources. Permanent failed/closed states remain terminal. No new paid session,
automatic retry, request replay or silent voice switch. Service/protocol failures
receive distinct RU/EN copy. Recognized turns retain existing interrupted persistence.
C. realtime-browser.ts, realtime-contract.ts, new voice-diagnostics.ts and authenticated
diagnostics route; realtime-browser/api tests; project memory and this report.
D. No schema migrations. Existing usage counter supplies a 2-report/session quota.
E. 140/140 tests across browser/API/turn/options suites. TypeScript, scoped ESLint and
diff check pass. New tests: recovery, sustained/repeated disconnection, manual stop,
permanent failure, service classification, preserved input, safe logged metadata,
receipt/origin/quota rejection, and 503 tool response continuing a voice turn.
F. Clinical benchmark not applicable; no extraction changes.
G. Only allowlisted code, built-in voice name and locale logged. Unknown codes become
unknown. No provider messages, audio, user text, tool arguments, profile IDs or signed
receipts in logs. Session identity is checked server-side before logging; no new grants.
H. Past screenshot cause unknown. Logs at 20:08 UTC show tools 503 and transcripts 200,
but cannot establish causation or identify a specific user's data-channel error.
No live microphone/device outage reproduced. Future diagnostics may fail during a
complete network outage; they are best effort, never block cleanup. Recovery cannot
replay unheard audio. Provider errors still terminate safely pending diagnosis.
I. No speculative Echo replacement, no new billing/session limits, no broad retries,
no backend tool failure speculation, no source/history rewriting.
J. Implementation checked; release pending below.
K. GO for scoped publication; no claim that the exact screenshot cause is fixed.
L. Verify production; repeat conversation, inspect safe diagnostics if it fails.

References:
https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
https://github.com/openai/openai-node/blob/main/docs/realtime.md