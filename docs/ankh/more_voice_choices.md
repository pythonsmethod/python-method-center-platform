# More ready-made voices — 2026-09-10

A. Before: Marin, Cedar, Coral, Sage, Verse.
B. Added Alloy, Ash, Ballad, Echo, Shimmer to the common browser/server allowlist.
Marin default and existing account/browser preference remain unchanged.
C. voice-options.ts, voice-options/realtime-api tests, three project memory files,
and this report. Existing responsive localized picker renders the expanded list.
D. No schema or data changes.
E. Regression checks pending below; new tests exercise every new voice in live
handshake plus RU/EN samples. Existing unknown/custom rejection tests retained.
F. Clinical benchmark not applicable.
G. Same authentication, client pilot, permissions, quotas and provider. No PHI changes.
H. No live acoustic quality verification; these voices may still have a Russian
accent. Samples use TTS, live conversations Realtime, so delivery may differ.
I. No custom voices, new provider, role, price, navigation or language route changes.
J. Implementation complete; release pending.
K. GO after passing checks and preview build.
L. Publish; compare samples and then start a fresh voice conversation.

Supported set checked at https://developers.openai.com/api/docs/guides/realtime-conversations
on 2026-09-10. No TTS-only Fable, Nova or Onyx added to the live voice picker.
Validation: 113/113 tests across 3 files; TypeScript, scoped ESLint and git diff --check pass.

Release: PR #171 merged as 852b37e07b920e0db0efd9922c0ed6a88808c403.
Website preview dpl_346DMitVoLG4YFjPyaXoA8R4uboE READY.
Separate mobile preview retains pre-compilation Root Directory / No Next.js
version detected failure; no mobile project code changed. Production pending.Production https://pythonmethodcenter.com READY: dpl_DksJhAbY2A87dK6MFVni2QWz4WG2,
matching merge 852b37e. Implementation/publication CLOSED; GO for user listening.
Next: refresh the page, compare new voice samples, start a fresh conversation.