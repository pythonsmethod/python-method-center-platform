# ANHAM: preparing a reply with a tablet

Date: 2026-09-23. Scope: presentation in the existing text and voice assistant.

## Request, previous behavior and implementation

The owner requested that Anham move and appear to look for an answer in a
tablet while preparing a reply. The official artwork already floated, blinked
and winked; text chat only displayed a pending line, and the voice portrait did
not have a separate preparation pose.

`AnhamAvatar` now accepts `activity="idle" | "thinking"`, independent of the
existing guest/registered/client access tier. The thinking pose reuses the
official artwork and measured eyelids, adds a gold tablet, gently leans the
figure, lowers the eyelids, scrolls abstract screen lines and taps the screen.

| Existing activity | Avatar behavior |
| --- | --- |
| Text request pending, including file-reading batches | Tablet in the pending message; voice launcher also reflects the wait |
| Existing delegated voice request continues in text | Tablet alongside the existing background-task explanation |
| Voice `thinking`, `reading`, `searching` | Tablet in the launcher and full-screen portrait |
| Voice listening, speaking, paused, ended, error or reconnecting | Normal portrait |
| Text resolves/fails; background task completes/times out | Its pending avatar disappears through the existing request lifecycle |

There is no artificial minimum wait, animation timer or additional API request.
The tablet is a visual metaphor, not a claim that sources have been searched or
facts verified. Existing specific progress text remains; the generic status is
“Анхам готовит ответ…” / “Anham is preparing a reply…”. The tablet is decorative
and hidden from assistive technology; pending text uses `role="status"`.
`prefers-reduced-motion: reduce` keeps the tablet visible but stops motion.
The original PNG, measured eyes and access tiers are unchanged.

## Files and data

- `components/assistant/AnhamAvatar.tsx`: activity and decorative tablet.
- `components/assistant/AssistantChat.tsx`: existing pending/background activity and RU/EN text.
- `components/assistant/RealtimeVoice.tsx`: existing voice-state mapping and launcher state.
- `app/globals.css`: motion, compact message layout and reduced-motion rules.
- This document and `CURRENT_STATE.md`: implementation and acceptance record.

No schema, authentication, roles, services, medical processing, memory, provider
routing or API behavior changed. There are no new application dependencies or
background automations. The activity is not a Case processing classification.

## Verification

- Focused existing regression: **8 files, 77 tests passed**.
- Full existing suite: **208 files passed, 1 skipped; 1,946 tests passed, 1 skipped**.
  The existing opt-in live-provider test was not enabled.
- TypeScript and ESLint: passed. Security inventory: passed; checker self-test:
  **6 passed**. `git diff --check`: passed.
- Production build: **passed, 59/59 pages generated**. Initial build compiled application code,
  then rejected a stale generated type for the removed local fixture. The stale
  generated file was removed; no application change was needed.
- Browser: actual Next.js components in a temporary local fixture, using synthetic
  intercepted responses and simulated WebRTC events. The fixture was removed.
  RU at 390px and 320px: pending tablet, localized status, success cleanup and no
  horizontal overflow. EN at 768px: localized pending, error cleanup and no overflow.
  Reduced motion: zero running animations in the pending avatar.
  Voice at 390px: listening → thinking → speaking and closing during thinking;
  the tablet appeared/disappeared with those events and the launcher reset.
  No page errors or framework error overlays in this executed workload.
- Captured 72 frames of the actual 5.6-second CSS animation for owner review.
- Existing suite also ran its synthetic document benchmark: 3 documents, 4 pages,
  zero critical extraction errors and zero false VERIFIED critical errors. This
  is regression evidence only, not expanded clinical validation.

The agent-browser launcher could not initialize in the local runtime and its
browser download failed certificate validation. Playwright with locally extracted
packaged Chromium completed the visual check; TLS validation was not disabled.
This is local Chromium evidence, not physical iPhone/Safari or signed-in production
acceptance. No microphone, provider session, patient data or paid AI request was
used in the visual fixture.

## Release boundary and rollback

This is a 2D composition with CSS movement, not a new rigged 3D model. Actual paid
voice and authenticated production scenarios remain outside the synthetic check.
Gate: local UI implementation and build CLOSED / GO for the existing release
checks. Deployment must be recorded separately against the exact commit and
existing Vercel project.

Rollback: revert the UI commit and redeploy the previous compatible application;
no data recovery or migration is required. Document-analysis Phase 2.9 remains
open; production auto-verification and Phase 3 remain NO-GO. No clinical phase
is closed by this UI task. Next action: finish the existing release checks and
verify the deployed UI on its actual URL.
