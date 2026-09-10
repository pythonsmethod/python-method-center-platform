# Голоса Анхама / Anham voice choices — 2026-09-09

## A. Before

The server selected one environment-configured voice for everyone. The avatar
dialog had no voice selector or preview and no personal-voice integration.

## B. Change

Five reviewed Realtime voices are offered: **Marin, Cedar, Coral, Sage, Verse**.
The button at the top of the call opens the voice picker. Opening it ends the
current voice session through the existing stop/save path. A new conversation
starts with the chosen voice; it does not silently change a live provider session.
The previous transcript remains in the chat, but the new provider session starts
fresh. Realtime voices cannot change after audio output has begun.

Preference storage is local to the browser and keyed by a server-derived account
and persona fingerprint, independent of Case and locale. Unsupported, unavailable
or removed preferences fall back to the reviewed server default. Storage-denied
browsers can still select a voice. Catalog failure falls back to five built-ins
without claiming personal-voice readiness or writing a cross-account preference.

The fixed RU/EN preview phrase goes through a separate authenticated TTS route.
It does not request microphone access or send user text, messages, Case contents
or documents. Preview has stop, cancellation, playback-error handling and object
URL cleanup. Starting voice is disabled during preview. The short TTS sample is
illustrative; actual Realtime delivery may differ in cadence.

Two additional staff-only aliases, `founder` and `karen`, resolve to server-held
custom voice IDs only when explicitly enabled with corresponding consent IDs.
They are visibly unavailable until configured. Client catalogs contain only the
five built-ins; raw browser-supplied provider IDs/objects are rejected. Selecting
Karen's voice never changes the founder's persona or permissions. The UI states
that even a familiar voice is still an AI assistant.

Personal voice creation is prepared as an operator workflow, not exposed as an
unrestricted client upload endpoint. It validates separate PCM WAV recordings,
defaults to local dry-run, creates consent before voice and checkpoints only
fingerprints and provider references. Explicit execution, owner confirmation,
provider eligibility flag and an existing server key are required. A per-owner
exclusive lock and atomic checkpoints prevent overlapping CLI runs; uncertain
POST outcomes require reconciliation instead of automatic retries. Raw audio and
keys are not logged or copied into checkpoints. Runtime activation is separate.

## C. Files

- New `lib/assistant/voice-options.ts`, `voice-options-server.ts`.
- New `app/api/assistant/realtime/voices/route.ts` and `voices/preview/route.ts`.
- New `components/assistant/VoicePicker.tsx`; updated `RealtimeVoice.tsx`,
  `realtime-browser.ts`, session route, CSS and synthetic browser fixture.
- New `scripts/ankh/provision-personal-voice.mjs` and its TypeScript declaration.
- New `tests/voice-options.test.ts`; extended API/browser tests.
- `.env.example`, `.gitignore`, CURRENT_STATE, ROADMAP, DECISIONS and this report.

## D. Data/schema and configuration

No database/schema changes. No new role or evidence model. Existing voice/search
migrations remain unapplied. Provider references stay in server environment:
`ANHAM_CUSTOM_VOICES_ENABLED=false`, `ANHAM_FOUNDER_VOICE_ID`,
`ANHAM_FOUNDER_VOICE_CONSENT_ID`, `ANHAM_KAREN_VOICE_ID`,
`ANHAM_KAREN_VOICE_CONSENT_ID`. Both ID and consent reference are required.
`OPENAI_REALTIME_VOICE` remains the default when it names one of the five choices;
otherwise the selector defaults to Marin. The Realtime model is unchanged.

Private operator state belongs in ignored `.private/anham-voices/<owner>/`.
These files are not encrypted storage; keep actual recordings private and outside
Git. An uncertain manifest/lock must be reconciled against the provider before
retrying. Consent and voice references must be taken from the same confirmed
creation, not manually paired from unrelated recordings.

## E. Verification

- **1163 tests passed in 133 files, 42.36 seconds**, zero final failures.
- TypeScript, ESLint and `git diff --check`: pass.
- New checks cover all five voices through the real session route, browser request
  forwarding, custom voice permission/consent/flag restrictions, persona invariance,
  catalog account isolation, fixed preview text, CSRF/pilot/budget denial, WAV
  bounds, dry-run, owner-confirmation gates, consent-first provisioning and refusal
  to retry uncertain creation. An initial unsupported test matcher and missing
  MJS declaration were corrected before the passing run.
- Synthetic real-UI browser verification: 5 available radios and 2 unavailable
  personal slots; Cedar selection; one preview; next session body `voice=cedar`;
  saved account preference; RU → EN → RU at the same URL retains Cedar.
- 390px mobile layout: no horizontal overflow, no alert/browser errors, controls
  remain usable. `output/voice-options-ru.png`, `voice-options-mobile-en.png`.
- The browser preview fixture uses generated silent WAV bytes. No actual provider
  speech or cloned voice was generated; tests do not attest perceived voice quality.

## F. Benchmark

No extraction/trust changes. The full suite retained the synthetic benchmark:
100% provenance and needs-review recall, zero critical/false VERIFIED errors.
Generated baseline report changes were restored after tests.

## G–I. Security, limitations, excluded work

The existing authenticated identity, pilot allowlist, kill switch and server key
are reused. Preview is bounded to a fixed phrase, 5 requests per minute bucket
and 20 per UTC day/person, with timeout and cancellation. No arbitrary TTS input.
Personal voices remain unavailable to clients. Voice choice never grants access,
changes clinical review state, authorizes diagnosis or represents Karen speaking.

No real voice samples or consent recordings were found in the repository. Custom
voice account eligibility has not been established. No real custom voice was
created, no paid API call or actual microphone use occurred, no key was created,
and nothing was deployed or enabled in production. No native recording/upload UI
or general cloning service was added. The operator can process the two recordings
after they are provided, without asking the owner to run API commands.

## J–L. Closure and next action

Local five-voice selector/preview increment CLOSED. Personal-voice activation and
production voice release NOT CLOSED. GO for authorized synthetic staging; NO-GO
for production/PHI rollout. Required next inputs are each person's own consent
recording and separate speech sample, plus verified provider account eligibility.
After those owner-only inputs and authorization for live calls, Codex can perform
the prepared creation workflow, configure confirmed references, verify both voices
and then pursue the separately authorized staging/release steps.

## Recordings for the owner and Karen

Each person supplies two separate files, in their own voice:

1. A consent recording containing only this exact phrase:
   «Я являюсь владельцем этого голоса и даю согласие OpenAI на использование этого голоса для создания модели синтетического голоса.»
2. A natural speech sample, at most 30 seconds, in the tone they want Anham to use.

The helper currently accepts 16-bit mono/stereo PCM WAV at 16–48 kHz, 1–30 seconds,
under 5 MB per recording. Conversion of an owner's supplied original can be done
by Codex as needed; the sample and consent must stay separate and remain the
owner's genuine voice. A dry-run command for the operator is:

```powershell
node scripts/ankh/provision-personal-voice.mjs --owner founder --language ru --consent <private-consent.wav> --sample <private-sample.wav>
```

No provider call happens without `--execute --owner-confirmed` and enabled server
configuration. Run from the repository root. Repeat with `--owner karen` only
using Karen's own recordings. Provider eligibility and actual consent acceptance
cannot be established by setting a flag or by passing the local tests.

Official contracts checked:
[Realtime voice options](https://developers.openai.com/api/docs/guides/realtime-conversations),
[personal voices and consent requirements](https://developers.openai.com/api/docs/guides/text-to-speech),
[create voice](https://developers.openai.com/api/reference/resources/audio/subresources/voices/methods/create).
