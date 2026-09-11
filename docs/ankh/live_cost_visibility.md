# Anna-only voice cost display — 2026-09-11

Before: every GPT-Live pilot user saw pilot/billing copy and estimated USD.
After: only server-verified PRIMARY_FOUNDER_EMAIL (Anna) receives monetary
SSE fields and the showLiveCosts flag. Other founders, Karen and clients see
localized conversation duration. The existing privacy disclosure remains.
Accounting still runs server-side. No new endpoint, schema, migration, medical
processing, memory or voice lifecycle change.

Changed: require-founder, voices route, live-session, live-browser, VoicePicker,
RealtimeVoice, extracted LiveUsage; API, SSE and RU/EN rendering tests;
CURRENT_STATE, DECISIONS, ROADMAP and pilot documentation.

Validation: 97 targeted tests passed. Full regression: 1751 passed, 1 failed,
1 opt-in provider test skipped. The sole failure was an existing migration
string assertion expecting LF while Windows checkout produced CRLF. Restoring
that file to repository LF (no Git content change) made all 15 tests in that
file pass. Production build and its security/type/lint gates passed;
security self-test 6 passed; dependency audit 0 vulnerabilities; diff check pass.
No provider call or PHI sent for this display change. No benchmark logic changed.
Manual authenticated browser acceptance is not claimed. Pilot voice acceptance
remains separate; this release only narrows visibility of costs.

Scope: ready for publication after validation. General voice rollout is not
closed by this change. Publication evidence will be reported with the release.
