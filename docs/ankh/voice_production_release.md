# Voice production release — 2026-09-09

A/B. Previously preview-only staff voice is now deployed with owner approval.
Five built-ins, existing text authority, source-tagged private history and public
web search are enabled for verified founder/Karen accounts. Custom voices are off.

C. Implementation files and prior changes are recorded in
builtin_voice_launch_2026_09_09.md and voice_text_permissions.md. The final merge
also integrated current main and preserved history source provenance/factual
honesty in the unified SDP endpoint. PR #159 merge: cf96d8cf3bb0791315e637c2acd725bcac28906f.

D. The two specifically approved voice migrations applied to production
zdrfttgwnyorifmpqgwe. Five columns and two indexes verified, RLS remains true.
No clinical migration, data deletion or automatic verification was enabled.
Vercel production/preview signing secret generated without export; staff-only,
built-ins-only, voice and web-search flags enabled; custom voices disabled.

E. 1527/1527 tests in 166 files passed, TypeScript/ESLint/diff checks passed.
Preview and production website builds READY. Production deployment:
dpl_BzdAZzdwGRLqyoyVNfze5BPYAhb9. Founder authenticated browser loaded history,
opened the full-screen avatar and showed exactly five choices. Fixed-phrase
preview returned to idle with no displayed error. No live microphone utterance
was captured; browser requested microphone permission. No production transcript
roundtrip or separate Karen-account live call is claimed.

Separate anham-mobile-app Vercel check failed because its configured build did
not detect a Next.js package. The target python-method-center-platform build
succeeded. Mobile project settings were not changed in this website release.

F. Existing synthetic benchmark regression: 3 documents/4 pages; 100% critical
numeric exact match and verified precision, zero critical false VERIFIED.

G/H. Existing private history displayed only within the owner's authenticated
browser; no raw client files or audio committed. Live call acceptance depends on
browser microphone access. Existing 5-minute/10-session daily defaults apply.

I. Personal voice cloning, clinical processing and unrelated mobile deployment
configuration are excluded.

J/K. Production deployment CLOSED; GO for owner/Karen testing. Live conversation
and transcript-reload acceptance remain unverified, not silently marked passed.

L. Open /admin/assistant, click Anham beside the microphone, permit browser
microphone access and speak a short test question, then end/reload the chat.
Rollback: disable ANHAM_REALTIME_ENABLED and redeploy; retain saved history.
