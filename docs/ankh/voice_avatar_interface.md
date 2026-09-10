# Anham avatar voice interface — 2026-09-09

## A. Before

Live voice used a separate, large microphone section above the composer.
Staff/client voice chats hid browser dictation. There was no full-screen call view.

## B. Change

The official existing Anham artwork is now a 48px accessible button beside the
attachment and dictation controls. One click opens a full-screen native modal
dialog and starts the existing voice session. The large Anham portrait has a
listening halo and speaking animation driven by the actual voice state. This is
a state animation, not lip-sync or an audio-amplitude meter.

The dialog shows connection/listening/speaking/search/error states, current
recognized words, the latest answer and returned sources. The existing chat and
history retain all transcripts. End and the close button stop the session;
Escape also stops it, restores body scrolling and returns focus to the launcher.
The native modal makes the page behind it inert and contains keyboard focus.
Navigation/locale changes retain the existing resource cleanup.

Browser dictation is again available beside the avatar when supported. Dictation
and realtime cannot run together. File and send controls remain disabled during
voice; pending attachments or dictation prevent starting voice. The existing
external-service/storage disclosure is in a details block immediately below the
composer. Failed saves remain recoverable by reopening the avatar and retrying;
an indicator on the launcher identifies unsaved text.

All copy and accessible labels are RU/EN. Layout uses the dynamic viewport and
safe-area spacing. Reduced-motion settings disable decorative animations.

## C. Files

- `components/assistant/AssistantChat.tsx`, `RealtimeVoice.tsx`.
- `lib/assistant/realtime-contract.ts`, `app/globals.css`.
- Browser test fixture: `tests/fixtures/realtime-ui/main.tsx`, `vite.config.ts`,
  new `image.tsx` (local-art adapter for Vite, which has no Next image optimizer).
- This report, CURRENT_STATE, ROADMAP, DECISIONS.

The existing `public/images/anham-master.png` and `AnhamAvatar` are reused unchanged.

## D. Data/schema

No schema, provider, API, access-policy or key changes in this UI increment.
Existing voice/search migrations remain unapplied and production flags unchanged.

## E. Verification

- Full suite: **1133 passed / 132 files**, **19.98 seconds**, no failures.
- TypeScript, ESLint and `git diff --check`: pass.
- Synthetic browser integration: launcher sits next to attachment/dictation;
  one-click modal opens; actual local artwork loads; public-search reply and source
  remain in the original chat; Escape stops one media stream and saves one turn,
  restores scroll and focus; RU → EN → RU preserves route/history.
- 390 × 844: dialog width 390, no horizontal overflow, both close/end buttons
  visible (end button bottom 774px). Permission denial shows localized error;
  Retry restores listening. Browser console errors: none after fixture repair.
- Intermediate issues fixed: an edit interrupted the composer JSX and was repaired
  before successful checks; standalone Vite could not run Next's image module
  (`process is not defined`), so the test-only image adapter now serves the same art.
- Screenshots: `output/voice-avatar-button.png`, `voice-avatar-call-ru.png`,
  `voice-avatar-mobile-ru.png`, `voice-avatar-mobile-en.png`.

## F. Benchmark

No extraction/trust changes. Existing synthetic benchmark ran in the full suite:
100% numeric match/provenance/needs-review recall, zero critical or false VERIFIED
errors. This does not validate real voice or clinical quality.

## G–I. Security, limitations, excluded work

Only synthetic media/API events were used. No live microphone, paid provider call,
production read, deployment or PHI transmission. The existing server authorization,
transcript persistence, internet-search and clinical boundaries remain authoritative.
The test fixture substitutes Next image delivery only; real device/audio acceptance
remains pending. Unsupported browser dictation is hidden. The portrait does not
have lip-sync. Production enablement and a new avatar image were not requested here.

## J–L. Closure and next action

Local UI increment CLOSED; production voice release NOT CLOSED. GO for the existing
isolated staging acceptance, NO-GO for production voice/PHI rollout. Exact next
action remains the separately authorized staging migration/auth/audio/search check
described in `voice_web_search.md`, now including the avatar launcher and call view.
