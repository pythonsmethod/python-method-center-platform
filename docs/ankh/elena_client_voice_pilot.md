# Correction: client voice preview

A/B. Owner clarified that Elena should test a future CLIENT experience. Revoke
the prior founder-equivalent assistant grant; keep the existing client role.
The old delegate variable was removed from Vercel and the delegate predicate
now always denies, including stale configuration and previously issued staff
voice receipts. No prior history is deleted; staff-tier history is inaccessible
to the client view.

C. Added client-voice-pilot/context modules, /cabinet/assistant and cabinet link;
/assistant redirects into the client cabinet. Updated session authorization,
RU/EN disclosure, env example and regression tests.

D. No schema, payment entitlement or profile role changes. A separate server
client-pilot allowlist enables only the owner-confirmed account. It may test
voice while general public rollout is off. Existing global voice kill switch,
rate limits and account suspension/closure checks still apply.

E. 1538 tests in 168 files, TypeScript and ESLint passed. Focused final regression
covers stale delegate denial, client-only scope, empty staff tool list, pilot
revocation, correct own profile/Case context and mismatched-context rejection.

F. Existing synthetic benchmark remains 3 documents/4 pages, 100% critical numeric
match and verified precision, zero critical false VERIFIED.

G. Existing client source resolver supplies only that authenticated account's
available Case context and actual registered/paid tier. Client voice has NO staff
tools, cross-client queries or internal-memory writes. Source history is still
unverified conversation text. No clinical decisions or production extraction.

H/I. No live microphone test or impersonated login as Elena; no new account,
password, email sending, case creation, bulk rollout or data deletion. Full
staff internet search and internal operations are intentionally unavailable.

J/K/L. Implementation and publication CLOSED; GO for Elena's client pilot.
PR #164 merged as 46f80a6c17a53e0ea347c51b89e786e9c4bdc6fe.
Production deployment dpl_6KS5i57MJCSdXcDYhvCfBiCDthKk is READY.
Final focused regression: 64 tests in 3 files passed. Read-only account checks
confirmed the client role and an existing own Case. Published /assistant routes
an unauthenticated browser to /login?next=%2Fcabinet through the client cabinet.
Actual authenticated client voice and microphone remain untested; next action
is Elena's own-account trial at /cabinet/assistant. General rollout stays off.
