# NEXORA — personal hub v1

## Status
Implemented for isolated preview. NOT a completed NEXORA platform release.
No production merge, clinical mutation, external messages, payment actions or automatic model-weight training.

## What exists
- `/nexora` redirects to `/nexora-hub/index.html`.
- Approved owner illustration, 5 interactive branches, pointer-reactive 3D point-cloud sphere, animated rays, RU/EN, mobile layout and reduced-motion control.
- A public visual shell; all API data/AI actions require server-verified, email-confirmed primary founder identity.
- `GET /api/nexora/status` and `/history`; `POST /chat`, `/feedback`, `/settings`, `/transcribe`.
- Personal HCS runs persist before model calls. Successful model responses persist as structured plans. Failed calls remain failures, never synthetic answers.
- The next request retrieves relevant personal runs, reviewed self-reported outcomes and user-confirmed next-time lessons.
- Native browser recording -> OpenAI transcription -> editable text -> user sends. Optional response reading uses the device's speech synthesis voice. This is NOT full-duplex Realtime voice.
- Branch navigation defaults to `/admin` for Python Method Center and `/admin/assistant` for ANHAM assistant management. Other destinations are unconfigured until entered by the owner. URLs do not sync application data or replace destination sign-in.

## What was actually found
The staging project contained 13 conductor descriptions, 15 skill names with empty definitions, 5 capability entries and zero HCS runs. It did not contain a founder profile for the primary founder email. The two previously deployed Edge functions were not proof of a successful end-to-end conversation.

15 owner-approved skill definitions from the conversation were distilled into clearly marked `hub-summary-1` executable summaries in staging, retaining each existing source URL. These are not verbatim/full Drive imports and are not clinically validated.

## Database changes
Additive staging migration `nexora_hub_personal_v1`: `hcs_hub_settings`, `hcs_hub_quotas`, unique per-owner request IDs, service-role-only atomic quotas and once-per-run feedback. Limits: 40 chat / 30 transcription requests per owner per hour. No automatic numerical confidence updates or promotion to shared medical rules.

The SQL snapshot is under `docs/nexora/staging/`, deliberately outside automatic production migration discovery because it depends on the already-created staging HCS baseline. Production schema remains unchanged.

## Authentication and environment
Uses existing Supabase server cookie authentication. Compares the verified Auth user email (not a browser-supplied or editable profile email) against `PRIMARY_FOUNDER_EMAIL`. Rejects unconfirmed, suspended and closed accounts. A profile must exist before a run can be stored.

By default, runtime accepts only the known HCS staging Supabase hostname. Other environments require a deliberate `NEXORA_RUNTIME_ENABLED=true` release decision, review and migration. No new privileged accounts were created and no existing role was changed.

Required server configuration: existing Supabase URL, auth key and service-role key; `OPENAI_API_KEY`. Optional `NEXORA_MODEL`; default `gpt-5.6-sol` was checked against official model documentation on 2026-09-19. Transcription uses `gpt-4o-mini-transcribe`. Credentials never go into public JS or chat. Model access/billing still needs a real authenticated acceptance test.

## Safety
JSON/multipart size limits; explicit consent before processing and recording; same-origin POSTs; private no-store responses; allowlisted branches; validated HTTPS/local navigation. No API accepts a client-supplied profile as authority. Source facts are not overwritten; outcomes remain self-reports, lessons personal. The model reads bounded supplied context, with no autonomous write tools or full Drive synchronization. AI output is rendered with textContent, never inserted as HTML. No Case documents or client rows are read. The approved illustration is hosted on the owner's media CDN; no private records are embedded in code.

## Verification
Local core contract tests: 11/11 PASS; strict TypeScript compilation of the dependency-free core PASS; browser JS syntax PASS.
Offline Chromium DOM tests: 10/10 PASS. Desktop/mobile, 5 branches, central sphere, RU/EN, reduced motion, no horizontal overflow, anonymous guard, consent and feedback tested. Network/history and AI replies were MOCKED; this is not a live model or login test.
Full repository build and hosted owner acceptance must pass before release. Never claim successful voice/model interaction before it occurs.

## Remaining gates
1. Preview build and HTTP reachability.
2. Owner signs into staging with confirmed primary founder email; account setup/MFA stays owner-controlled.
3. Verify server key, model access and billing using a consented non-sensitive request.
4. Save outcome and lesson, demonstrate correct retrieval on a later turn.
5. Actual phone microphone/transcription test.
6. Configure verified WAY, Woman Club, API and future ANHAM administration URLs.
7. Separate security review and production release decision.

## Not silently enabled
Full-duplex voice, branch data adapters, Drive sync, owner-approved tool actions, versioned rule promotion, cross-domain consent, independent domain, billing and third-party API access.
