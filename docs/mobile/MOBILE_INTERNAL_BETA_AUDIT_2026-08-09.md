# MOBILE INTERNAL BETA AUDIT — 2026-08-09

**Scope:** evidence-based readiness audit of the current repository for an
internal mobile beta on iOS and Android.
**Audit branch:** `audit/mobile-beta` (created from `origin/agent/mobile-app-foundation`)
**Mobile HEAD:** `2cd90e2` — "Show unread team messages in mobile cabinet"
**Main HEAD:** `1b1e0d0` — "Invite people to the assistant where they actually are"
**Method:** every claim below is derived from reading the current files or from
a command actually executed in this environment. No prior audit was reused.

---

## 1. Executive summary

There is a real Expo / React Native application at `mobile/` — 21 files, 43
commits, using Expo SDK 57, React Native 0.86, expo-router. It is not a
sketch: authentication, the cabinet, documents, case history, team chat with
text and voice, and unread counters are implemented against the same Supabase
project as the web platform. The security model is the strongest part of the
work: no secret of any kind reaches the device, and the two `/api/mobile`
endpoints resolve the caller's case from the bearer token alone, which makes
cross-user access impossible by construction rather than by convention.

It is nevertheless **not buildable or testable today**, for five reasons that
are all concrete and all fixable in the repository:

1. **The API the app calls does not exist in production.** `app/api/mobile/*`
   lives only on the mobile branch. `main` — which is what is deployed to
   `pythonmethodcenter.com` — has no `api/mobile` directory at all. The app
   points at that production host by default, so chat and voice would return
   404 on a real device.
2. **`npm run typecheck` fails in `mobile/`** with 4 errors, and they are not
   cosmetic: the same defect makes document opening silently do nothing at
   runtime.
3. **Four required peer dependencies are missing**, which expo-doctor reports
   as "your app may crash outside of Expo Go" — that is precisely the
   dev-client / EAS build an internal beta uses.
4. **`extra.eas.projectId` is absent**, so `eas build` cannot run
   non-interactively.
5. **Password recovery is broken three ways at once** — wrong URL scheme, no
   destination screen, and session detection disabled.

Against that, the toolchain itself is healthy. The web app passes typecheck,
128 unit tests and a production build on this branch. `npx expo config`
resolves. `npx expo prebuild` succeeds and produces correct native identifiers
and a correct microphone permission string on both platforms. And merging
current `main` into the mobile branch is **conflict-free** — verified by an
actual dry-run merge — so the 79-commit divergence is a real gap in features
but not a merge problem.

**Recommendation: GO WITH BLOCKERS.** The foundation is sound and the P0 list
is short and mechanical. Nothing found requires re-architecting, weakening RLS,
duplicating business logic, or creating a second backend.

---

## 2. Current architecture

### 2.1 Branch topology — the single most important finding

| Branch | HEAD | `mobile/` files | `app/api/mobile` |
|---|---|---|---|
| `origin/main` | `1b1e0d0` | **0** | **absent** |
| `origin/agent/mobile-app-foundation` | `2cd90e2` | 21 | present (2 routes) |

Divergence from merge base `cbdcf09`: **79 commits on main, 43 on mobile.**

```
$ git rev-list --left-right --count origin/main...origin/agent/mobile-app-foundation
79      43

$ git merge --no-commit --no-ff origin/main
Automatic merge went well; stopped before committing as requested
$ git diff --name-only --diff-filter=U
(no conflicts)
```

The mobile app and its server endpoints are unmerged. Production runs `main`.
This is the root cause of P0-1.

Other remote branches present: `agent/ui-masterplan-v2`,
`chore/t2-master-consolidation`, `claude/audit-fdq5jt`,
`claude/pmc-audit-remediation-p0p1p2`, `claude/pmc-production-audit-1r4m7z`,
`claude/project-help-rz5dnc`, `claude/project-history-xvrd7p`,
`claude/pythons-method-launch-audit-n9t4dh`, `claude/yc-application-46bg7u`,
`design/ui-masterplan-v2-homepage`, `claude/mobile-architecture-discovery-4l8d6v`.
None of them contain `mobile/`.

### 2.2 One platform, two clients

The unified-system requirement is genuinely honoured. Both clients speak to the
same Supabase project through the same public anon key, and the mobile app
reads the same tables the web cabinet reads.

```
Web (Next.js 15, React 19)          Native (Expo SDK 57, RN 0.86)
  ├─ cookie session (sb-*)            ├─ AsyncStorage session
  ├─ Server Actions (writes)          ├─ /api/mobile/* (chat writes)
  └─ Supabase SDK (storage)           └─ Supabase SDK (reads + storage)
                    \                 /
                     \               /
                  ONE Supabase project
       Postgres (RLS) · Auth (JWT) · Storage (2 private buckets)
```

Divergence in *write path* is the notable asymmetry: the web writes through
Server Actions that also emit audit logs and lifecycle events; mobile writes
either through `/api/mobile/*` or directly through the SDK. Section 4.3
documents where that changes behaviour.

### 2.3 Build separation

`tsconfig.json` (root) line 30: `"exclude": ["node_modules", "mobile"]`.
Verified working — the web `npm run typecheck` and `npm run build` both pass on
this branch with `mobile/` present. Commit `6d1b44b` ("Keep Expo sources out of
the Next.js build") is doing its job.

No `vercel.json` and no `.vercelignore` exist. The Next.js build does not walk
`mobile/`, so this is currently harmless, but it means `mobile/` is uploaded to
Vercel on every deploy.

### 2.4 Environment variable architecture

| File | Variables | Assessment |
|---|---|---|
| `.env.example` (web) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe links + `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ASSISTANT_USAGE_SALT`, `PAYMENT_ALT_*`, `NEXT_PUBLIC_SITE_URL` | unchanged, correct |
| `mobile/.env.example` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL` | **correct — three public values only** |

Verified by grep across `mobile/app`, `mobile/lib`, `mobile/components`: the
only `process.env` reads are the three `EXPO_PUBLIC_*` above. A search for
`service_role`, `STRIPE_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`TELEGRAM_BOT_TOKEN`, `WEBHOOK_SECRET`, `ASSISTANT_USAGE_SALT` across all
mobile sources and JSON returns **nothing**.

### 2.5 Package versions actually declared

| Package | Version | Note |
|---|---|---|
| `expo` | `^57.0.0` | resolved `sdkVersion: 57.0.0` |
| `react-native` | `0.86.0` | |
| `react` | `19.2.3` | matches web's React 19 line |
| `expo-router` | `~57.0.7` | |
| `expo-audio` | `~57.0.2` | recording + playback |
| `expo-document-picker` | `~57.0.1` | |
| `expo-crypto` | `~57.0.1` | `randomUUID` for document ids |
| `expo-dev-client` | `~57.0.7` | |
| `@supabase/supabase-js` | `^2.50.0` | **same major/minor line as web** |
| `@react-native-async-storage/async-storage` | `^2.2.0` | session storage |
| `react-native-url-polyfill` | `^2.0.0` | |

No `expo-secure-store`. No `expo-notifications`. No lockfile committed.

---

## 3. Current mobile implementation — verified, not assumed

Every row below was checked by reading the file named.

### 3.1 Auth

| Capability | Status | Evidence |
|---|---|---|
| Login | ✅ works | `mobile/app/login.tsx:14` — `signInWithPassword` |
| Sign-up | ✅ works | `mobile/app/sign-up.tsx:15` — handles both confirm-email and instant-session |
| Persistent session | ✅ works | `mobile/lib/supabase.ts:16-18` — `persistSession: true`, `autoRefreshToken: true` |
| Logout | ✅ works | `mobile/app/cabinet.tsx:103` |
| Authenticated routing | ✅ works | `mobile/app/index.tsx:17` redirect; `Redirect` guard on every protected screen |
| Password recovery request | ⚠️ sends mail, link dead | `mobile/app/recovery.tsx:13` |
| Reset-password deep link | ❌ **broken** | scheme mismatch + no route + `detectSessionInUrl: false` |

**The recovery defect in detail.** `recovery.tsx:13` passes
`redirectTo: 'pythonmethod://reset-password'`. The scheme actually registered
is `pythonmethodcenter` — confirmed both in `mobile/app.json:5` and in the
generated native config:

```
iOS   CFBundleURLSchemes: ['pythonmethodcenter']
Android android:scheme="pythonmethodcenter"
```

So the emailed link cannot open the app. Even if the scheme were right, there
is no `reset-password` screen (`mobile/app/` has none, and
`mobile/app/_layout.tsx:17-24` registers only index, login, sign-up, recovery,
cabinet, documents, history, team-chat), and `detectSessionInUrl: false`
(`mobile/lib/supabase.ts:19`) means the recovery token in the URL would not be
turned into a session automatically.

Password minimum is 8 characters on mobile (`sign-up.tsx:13`) but 6 on web
(`lib/auth/actions.ts:105`). Harmless divergence, noted for consistency.

### 3.2 Cabinet

| Capability | Status | Evidence |
|---|---|---|
| Profile (name, email, phone) | ✅ | `mobile/lib/cabinet-data.ts:39-43`, rendered `cabinet.tsx:60-65` |
| Case + status + number + direction | ✅ | `cabinet-data.ts:44-48`, `cabinet.tsx:83-91` |
| Service period | ✅ | `cabinet-data.ts:57-67`, `cabinet.tsx:98-101` |
| Next step | ✅ | `cabinet-data.ts:95-117` |
| Client-safe status labels | ✅ | `cabinet-data.ts:77-93` |
| Unread badge | ✅ | `cabinet.tsx:41` — 15 s poll via `?peek=1` |

The next-step logic is a **second implementation** of the web's
`app/(client)/cabinet/page.tsx:35-73`. The two are not identical: web branches
on document count, mobile branches on case status. Not a defect, but they will
drift.

### 3.3 Documents

| Capability | Status | Evidence |
|---|---|---|
| Document list | ✅ | `mobile/lib/case-content.ts:22-32` |
| Status labels | ✅ | `case-content.ts:47-53` |
| Pick from phone | ✅ | `mobile/lib/document-storage.ts:45-49` |
| PDF + PNG/JPEG/WEBP | ✅ | `document-storage.ts:9` — matches web `lib/documents/config.ts:5-10` |
| Size validation (25 MB) | ✅ | `document-storage.ts:8,57` — matches web |
| MIME validation | ✅ | `document-storage.ts:24-32` |
| Filename sanitisation | ✅ | `document-storage.ts:11-22` — **byte-identical logic to web** `lib/documents/config.ts:43-56` |
| Owner-scoped storage path | ✅ | `document-storage.ts:64` — `{profileId}/{caseId}/{documentId}/{safeFilename}` |
| Upload to private bucket | ✅ | `document-storage.ts:70-74` |
| Cleanup if metadata insert fails | ✅ | `document-storage.ts:95-98` — mirrors web |
| **Opening a document** | ❌ **broken** | see below |
| Server-side audit log on upload | ❌ **missing** | see 4.3 |

**The document-open defect.** `mobile/lib/case-content.ts:25` selects
`'id, original_filename, document_type, status, document_status, created_at'`
— `storage_path` is **not selected**, and `MobileDocument`
(`case-content.ts:3-10`) does not declare it. But `mobile/app/documents.tsx`
reads `document.storage_path` at lines 71, 75, 129 and 139. At runtime the
value is always `undefined`, so `open()` returns immediately at line 71 and the
card renders "Файл недоступен". **No document can be opened from the app.**
This is the same defect that fails typecheck.

### 3.4 Case history

| Capability | Status | Evidence |
|---|---|---|
| Lifecycle timeline | ✅ | `mobile/app/history.tsx`, `case-content.ts:34-45` |
| Client-safe event labels | ✅ | `case-content.ts:55-66` — all 10 `lifecycle_event_type` values covered |
| Status transition display | ✅ | `history.tsx:57` |

Note: `admin_note_added` is surfaced to the client as "Добавлена служебная
запись". The event row is client-readable by RLS and carries no note body, so
no internal content leaks — but the client learns that internal notes exist.
Product call, not a defect.

### 3.5 Team chat

| Capability | Status | Evidence |
|---|---|---|
| Load shared conversation | ✅ | `mobile/lib/team-chat.ts:38-41` → `GET /api/mobile/messages` |
| Send text | ✅ | `team-chat.ts:48-54` → `POST` |
| Web ↔ mobile sync | ✅ | same `case_messages` table, same case |
| Polling | ✅ 3 s | `mobile/app/team-chat.tsx:67` |
| Mark read | ✅ | `app/api/mobile/messages/route.ts:52-57` |
| Unread count | ✅ | `route.ts:41-50` via `?peek=1` |
| Role rendering | ✅ | `team-chat.tsx:32-36` — client / Карен / команда |
| Realtime | ❌ not used | polling only, same as web |

**Efficiency defect (P1).** The 3-second poll calls `loadTeamChat()`, which
hits `GET /api/mobile/messages` *without* `peek`. That endpoint marks messages
read and generates a **fresh signed URL for every audio message in the thread
on every poll** (`route.ts:68-79`) — up to 200 messages, 20 times a minute. The
web equivalent has the same signed-URL cost but the mobile client additionally
holds the screen open on a phone radio.

### 3.6 Voice

| Capability | Status | Evidence |
|---|---|---|
| Microphone permission request | ✅ | `team-chat.tsx:108` |
| Permission string (iOS) | ✅ | `app.json:20`, verified in generated `Info.plist` |
| Android RECORD_AUDIO | ✅ | verified in generated `AndroidManifest.xml` |
| Recording + duration | ✅ | `team-chat.tsx:50-51,97-112` via `expo-audio` |
| Upload | ✅ | `team-chat.ts:56-74` → `POST /api/mobile/messages/audio` |
| Private `case-audio` bucket | ✅ | `app/api/mobile/messages/audio/route.ts:65-67` |
| Signed playback URLs | ✅ | `route.ts:72-75` (1 h TTL) |
| Playback | ✅ | `mobile/components/voice-message.tsx` |
| Rollback on insert failure | ✅ | `audio/route.ts:90-93` |
| iOS format | ✅ | uploads `audio/mp4`; accepted at `audio/route.ts:10-11` |
| Android format | ⚠️ unverified | client hard-codes `audio/mp4` (`team-chat.ts:63`) regardless of platform |

The Android concern is real but narrow: `expo-audio`'s `HIGH_QUALITY` preset
produces `.m4a` on both platforms, so the hard-coded type is probably correct —
but it has not been verified on a device, and the code does not derive the type
from the actual recording. Flagged as P1 to verify, not asserted as broken.

**Cancel is not implemented.** `toggleRecording` either starts or stops-and-
sends. There is no way to discard a recording once started.

### 3.7 AI — absent

| Capability | Mobile status |
|---|---|
| Client AI interface | ❌ none |
| Assistant tiers | ❌ none |
| Conversation history | ❌ none |
| Red-flag handling | ❌ **none** |
| Escalation | ❌ **none** |
| File attachments | ❌ none |

No mobile file references the assistant. The web endpoints
`app/api/assistant/client`, `app/api/assistant/history` and
`app/api/assistant/staff` all authenticate through
`createSupabaseServerClient()`, i.e. **cookies**, so a bearer token cannot
reach them even if the app tried.

**This is a safety observation, not only a feature gap.** On the web, the
assistant is the mechanism that detects a crisis and writes an
`escalation_events` row plus a Telegram alert
(`lib/assistant/red-flags.ts:32-116`). A person who uses only the mobile app
has no automatic escalation path. They can still reach a human through team
chat, and chat does notify the team — but the red-flag pipeline does not exist
on mobile.

### 3.8 Metrics — absent

`supabase/migrations/20260805090000_metrics_and_supplements.sql` creates
`health_metrics` with full client-owned RLS (select/insert/delete on
`profile_id = auth.uid()`). Web exposes it at `app/(client)/cabinet/metrics/page.tsx`
plus `app/api/metrics/extract/route.ts`. **No mobile file references
`health_metrics`.** Nothing blocks it: the table is directly reachable by the
mobile SDK today.

### 3.9 Supplements — absent

Same migration creates `supplements` (select/insert/update/delete own) and
`supplement_intakes` (select/insert/delete own), with a unique constraint on
`(supplement_id, taken_on, time_slot)` for the daily check-off. Web exposes
`app/(client)/cabinet/supplements/page.tsx`. **No mobile file references
either table.** Schedules, times, completion marks and daily state are all
absent from the app. Again, nothing blocks it — full CRUD is already permitted
by RLS.

### 3.10 Support — absent

`support_requests` has `support_requests_insert_own` RLS, and the web writes
through `lib/support/actions.ts:32` which *also* emits a Telegram notification,
an audit log and a lifecycle event. **No mobile file references
`support_requests`.** The workflow is not exposed.

### 3.11 Payments — read-only, correctly

Mobile displays the service period (`cabinet.tsx:98-101`) and nothing else. It
does **not** contain any purchase flow, any Stripe key, any Payment Link, or
any store-billing code.

Current Stripe architecture on the platform: checkout happens on externally
hosted Stripe Payment Links opened from the web `/payment` page; the only
server-side trust boundary is `app/api/stripe/webhook/route.ts`, which verifies
the signature, is idempotent on `stripe_events.id`, records `payments`,
activates `service_periods` and awards referral tokens. None of that is
reachable from or affected by the app.

For an internal beta this is the right posture and requires no change. What the
platform sells — a period of human accompaniment by a named specialist — is
a real-world service rather than digital content, which is the relevant
distinction for store billing rules; but that determination is a legal one and
is deliberately **not** made in this document. Nothing about payments blocks
internal testing.

### 3.12 Notifications — absent

| Check | Result |
|---|---|
| `expo-notifications` dependency | ❌ not present |
| Expo push token registration | ❌ none |
| Device-token table | ❌ no migration |
| New-message notification | ❌ none |
| Support notification | ❌ none |
| Supplement reminder architecture | ❌ none |
| Deep-link destination for a notification | ❌ none |

The existing `notification_events` table
(`20260723120000_launch_closure_sprint.sql:6-24`) has `kind`, `dedupe_key`,
`status`, `attempts`, `last_error` — a good foundation for a second transport,
but today its only transport is Telegram, addressed to the team.

### 3.13 Localization

Every string in `mobile/` is a hard-coded Russian literal. There is no
dictionary, no locale detection, and no use of `profiles.locale` (which the app
does select, at `cabinet-data.ts:41`, but never reads). The web is bilingual on
public pages via the `pm-locale` cookie; the web cabinet is Russian-first.
So mobile matches the web *cabinet*, but has no path to English.

### 3.14 Account

| Capability | Status |
|---|---|
| Logout | ✅ `cabinet.tsx:103` |
| Profile editing | ❌ read-only display |
| Privacy / legal pages | ❌ absent — no offer, no privacy policy |
| Account deletion | ❌ absent |
| Emergency / crisis notice | ❌ absent |

The last two matter beyond feature parity. Both stores expect an in-app route
to account deletion for apps with accounts, and the web platform shows an
emergency notice (`components/EmergencyNotice.tsx`) on its support and chat
pages that the app does not reproduce.

---

## 4. Security assessment

### 4.1 Secrets — clean

No secret of any kind is present in `mobile/`. Verified by grep for
`service_role`, `SERVICE_ROLE`, `STRIPE_SECRET`, `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WEBHOOK_SECRET`,
`ASSISTANT_USAGE_SALT` across `mobile/app`, `mobile/lib`, `mobile/components`
and all mobile JSON: **no matches**. The only `process.env` reads are three
`EXPO_PUBLIC_*` values. The anon key is public by design and safe precisely
because RLS is scoped to `auth.uid()`.

### 4.2 API authorization boundary — sound by construction

Both mobile endpoints follow the same pattern:

```ts
const supabase = createSupabaseServiceClient();      // service role, server only
const token = bearerToken(request);                   // Authorization: Bearer <jwt>
const { data } = await supabase.auth.getUser(token);  // validated by Supabase Auth
const { data: caseRow } = await supabase
  .from("client_cases").select("id, profile_id")
  .eq("profile_id", data.user.id).maybeSingle();      // case derived from identity
```

`app/api/mobile/messages/route.ts:13-29`, `audio/route.ts:34-42`.

**The caller can never name a case.** Verified: neither route reads a case id
from query string, body or form data. A bearer token therefore cannot be used
to read another client's case, documents or messages, and there is no staff or
admin surface in `/api/mobile` at all. This is the correct design — the service
role is used, but only after an explicit ownership derivation.

Residual gaps: **no rate limiting** on either endpoint (the web assistant has
per-minute and per-day limiters; these have none), and error bodies pass raw
Postgres messages to the client (`route.ts:66,115`; `audio/route.ts:70,92`),
which the web does too but which leaks schema detail.

### 4.3 Write-path divergence — audit trail gap

The web registers an uploaded document through
`lib/documents/actions.ts:37-158`, which verifies the object exists in storage
and then writes an audit row (`writeAuditLog`, line 139, action
`document_uploaded`).

Mobile inserts `uploaded_documents` **directly through the SDK**
(`mobile/lib/document-storage.ts:77-93`) with
`metadata.uploaded_via: 'mobile_app'`. The insert is still protected — RLS
policy `uploaded_documents_insert_own` plus the trigger
`prevent_uploaded_document_client_tampering`
(`20260709120000_launch_hardening.sql:15-60`) forces `document_status` and
enforces the owner-folder path — so **there is no security hole**. But **no
`audit_logs` row is written for a mobile upload.** On a platform that keeps an
audit trail for consent and document handling, that is a compliance divergence,
not a cosmetic one.

### 4.4 Token storage — weakest point

`mobile/lib/supabase.ts:16` stores the session in `AsyncStorage`, which is
**unencrypted** on both platforms. `expo-secure-store` is not a dependency.
For an app whose session unlocks medical documents, tokens belong in Keychain
(iOS) / Keystore (Android). Acceptable risk for a controlled internal beta on
team-owned devices; must not reach public release.

### 4.5 RLS is not weakened

No migration on the mobile branch alters any policy. The mobile branch's
migration set is a strict subset of main's (it lacks only `shop_waitlist` and
`case_ai_reviews`). Nothing in `mobile/` requires a policy change.

---

## 5. Supabase / RLS compatibility matrix

Derived from the migrations present on this branch. "Mobile access method" is
what the app actually does today.

| Resource | Read | Insert | Update | Delete | Mobile access method | Protection | Status |
|---|---|---|---|---|---|---|---|
| `profiles` | own | own | own | — | direct SDK | RLS `profiles_select_own` + trigger pins `role`/`status` | ✅ used |
| `client_cases` | own | own | — | — | direct SDK (read) | RLS `client_cases_select_own` | ✅ used |
| `onboarding_submissions` | own | own | own (draft) | — | **not used** | RLS | ⚪ unused |
| `uploaded_documents` | own | own | own | — | direct SDK (read + insert) | RLS + tamper trigger | ⚠️ used, no audit log |
| `case_lifecycle_events` | own | — | — | — | direct SDK | RLS `case_lifecycle_events_select_own` | ✅ used |
| `case_messages` | own | **server only** | server only | — | `/api/mobile/messages` | bearer → service role after ownership check | ✅ used |
| `service_periods` | own | — | — | — | direct SDK | RLS `service_periods_select_own` | ✅ used |
| `payments` | own | — | — | — | **not used** | RLS `payments_select_own` | ⚪ unused |
| `support_requests` | own | own | own (open) | — | **not used** | RLS | ⚪ unused |
| `health_metrics` | own | own | — | own | **not used** | RLS, full client-owned | ⚪ unused |
| `supplements` | own | own | own | own | **not used** | RLS, full client-owned | ⚪ unused |
| `supplement_intakes` | own | own | — | own | **not used** | RLS, full client-owned | ⚪ unused |
| `assistant_messages` | own | server only | — | — | **not used** | RLS select-own; writes service role | ⚪ unused |
| `escalation_events` | own | server only | — | — | **not used** | RLS select-own (insert policy dropped in hardening) | ⚪ unused |
| `consent_records` | own | own | — | — | **not used** | RLS | ⚪ unused |
| `audit_logs` | own | server only | — | — | **not used** | RLS select-own | ⚪ unused |
| `referrals` | own (referrer) | server only | — | — | **not used** | RLS `referrals_select_own` | ⚪ unused |
| `token_transactions` | own | server only | — | — | **not used** | RLS `token_transactions_select_own` | ⚪ unused |
| `admin_notes` | **denied** | — | — | — | not used | policy `using (false)` | ✅ closed |
| `assistant_knowledge` | denied | — | — | — | not used | RLS on, no client policy | ✅ closed |
| `notification_events` | denied | — | — | — | not used | RLS on, no client policy | ✅ closed |
| `stripe_events` | denied | — | — | — | not used | RLS on, no client policy | ✅ closed |
| `assistant_usage` | denied | — | — | — | not used | RLS on, grants revoked from `authenticated` | ✅ closed |
| `storage.objects` — `client-documents` | own path | own path | — | — | direct SDK upload + `createSignedUrl(60s)` | path RLS: `foldername[1] = auth.uid()` | ⚠️ upload ✅, open ❌ broken |
| `storage.objects` — `case-audio` | server only | server only | — | — | via `/api/mobile/messages/audio`; playback by server-signed URL | service role only | ✅ used |

Cross-user isolation: **not empirically tested** — that requires two live
accounts against a running Supabase project, which this environment does not
have. It is however guaranteed structurally on both paths: the API never
accepts a case identifier, and every direct SDK query is filtered by
`auth.uid()` policies. The real-device test plan in §10 includes the empirical
check.

`case-audio` policy note: the bucket is created private
(`20260722150000_case_messages_voice.sql:42-44`) but, unlike `client-documents`,
the repository contains **no documented policy set** for it. Since all access
is server-mediated this is currently safe, but the production state of that
bucket cannot be confirmed from the repository.

---

## 6. Build validation — what was actually run

All commands executed in this environment on branch `audit/mobile-beta`.

### Web

| Command | Result |
|---|---|
| `npm ci` | ✅ exit 0 |
| `npm run typecheck` | ✅ exit 0 |
| `npm test` | ✅ **21 files, 128 tests passed**, 2.52 s |
| `npm run build` | ✅ exit 0 — all routes compiled, including `/api/mobile/messages` and `/api/mobile/messages/audio` |

### Mobile

| Command | Result |
|---|---|
| `npm install` | ✅ exit 0 |
| `npm run typecheck` | ❌ **exit 2 — 4 errors** |
| `npx expo-doctor` | ❌ 17/20 passed, 3 failed |
| `npx expo config --type public` | ✅ exit 0 — resolves, `sdkVersion 57.0.0` |
| `npx expo prebuild --no-install --clean` | ✅ exit 0 |

Typecheck output:

```
app/documents.tsx(71,19):  error TS2339: Property 'storage_path' does not exist on type 'MobileDocument'.
app/documents.tsx(75,42):  error TS2339: Property 'storage_path' does not exist on type 'MobileDocument'.
app/documents.tsx(129,33): error TS2339: Property 'storage_path' does not exist on type 'MobileDocument'.
app/documents.tsx(139,68): error TS2339: Property 'storage_path' does not exist on type 'MobileDocument'.
```

expo-doctor failures:

1. **Missing peer dependencies** — real:
   `expo-asset` (required by `expo-audio`), `expo-constants`, `expo-linking`,
   `react-native-safe-area-context` (all required by `expo-router`).
   Doctor's own wording: *"Your app may crash outside of Expo Go without these
   dependencies."*
2. *Check Expo config schema* — failed with
   `SyntaxError: Unexpected token 'H', "Host not i"...`. This is the sandbox
   proxy blocking a network call, **not** a config defect. Confirmed by
   `npx expo config --type public` succeeding locally.
3. *Validate packages against React Native Directory* — *"Directory check
   failed with unexpected server response"*. Also network, not a project defect.

Prebuild produced correct native configuration, verified by reading the
generated files before deleting them:

| Item | Generated value |
|---|---|
| iOS `PRODUCT_BUNDLE_IDENTIFIER` | `com.pythonsmethod.center` ✅ |
| iOS `CFBundleURLSchemes` | `['pythonmethodcenter']` |
| iOS `NSMicrophoneUsageDescription` | present ✅ |
| iOS entitlements | `<dict/>` — **empty, no Associated Domains** |
| Android `namespace` / `applicationId` | `com.pythonsmethod.center` ✅ |
| Android permissions | `INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `VIBRATE`, `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` |
| Android schemes | `pythonmethodcenter`, `https`, `exp+python-method-center` |

The generated `ios/` and `android/` directories were **deleted** after
inspection — they are not committed, per the instruction not to create native
directories without an architectural reason. `mobile/package.json` was modified
by prebuild (it rewrites the `ios`/`android` scripts to `expo run:*`) and was
reverted with `git checkout --`.

`READ/WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` come from
`expo-dev-client` and will not appear in a production profile build. Worth
re-checking at release time, since `SYSTEM_ALERT_WINDOW` attracts Play review
attention.

**Not validated:** an actual `eas build` for either platform. That requires an
authenticated EAS account and network access to Expo's servers, neither of
which exists here. No claim is made that an EAS build succeeds.

---

## 7. iOS readiness

Target bundle identifier `com.pythonsmethod.center` — **confirmed correct** in
`mobile/app.json:31` and in the generated Xcode project.

| Item | State |
|---|---|
| `app.json` present and valid | ✅ resolves via `expo config` |
| iOS `bundleIdentifier` | ✅ `com.pythonsmethod.center` |
| `supportsTablet` | ✅ true |
| Microphone permission text | ✅ Russian, specific, in `Info.plist` |
| Document access | ✅ `expo-document-picker`, no extra plist entry needed |
| Deep-link scheme registered | ✅ `pythonmethodcenter` |
| Password-reset link | ❌ points at `pythonmethod://` — **wrong scheme** |
| Universal Links (`associatedDomains`) | ❌ entitlements empty |
| Production API URL | ⚠️ defaults to `https://pythonmethodcenter.com`, where `/api/mobile/*` is **not deployed** |
| Supabase redirect allow-list | ❓ external — cannot be verified from the repository |
| App icon | ❌ none — no `assets/`, `icon: None` |
| Splash screen | ❌ none — `splash: None` |
| Version | `0.1.0` |
| Build number strategy | `appVersionSource: "remote"`; `autoIncrement` only on the `production` profile |
| `extra.eas.projectId` | ❌ **absent — `eas build` cannot run** |
| `owner` | ❌ absent |
| EAS `development` / `preview` profiles | ✅ both `distribution: "internal"` |

### Required outside the repository (iOS)

1. **Apple Developer Program membership** — an audit of the account screenshots
   provided earlier showed a free developer account with `Enroll Now` disabled.
   Without paid membership there is no TestFlight, no push capability and no
   distribution certificate.
2. Register App ID `com.pythonsmethod.center` in the Apple Developer portal.
3. Create the app record in App Store Connect and an internal TestFlight group.
4. Distribution certificate + provisioning profile (EAS can manage these once
   the account exists).
5. An Expo/EAS account, and `eas init` to mint the `projectId`.
6. Add the app's redirect URL to **Supabase Auth → URL Configuration**, once
   the scheme defect is fixed.
7. If Universal Links are wanted later: `apple-app-site-association` served
   from `pythonmethodcenter.com/.well-known/` plus `ios.associatedDomains`.

No Apple credentials were fabricated or assumed.

---

## 8. Android readiness

Target package `com.pythonsmethod.center` — **confirmed correct** in
`mobile/app.json:34`, and as both `namespace` and `applicationId` in the
generated Gradle config.

| Item | State |
|---|---|
| Package name | ✅ `com.pythonsmethod.center` |
| `RECORD_AUDIO` | ✅ injected by the `expo-audio` plugin |
| `MODIFY_AUDIO_SETTINGS` | ✅ |
| `INTERNET` | ✅ |
| Document picker | ✅ no extra permission needed on modern Android |
| Deep-link scheme | ✅ `pythonmethodcenter` |
| App Links (`intentFilters`) | ❌ none declared |
| `versionCode` strategy | `appVersionSource: "remote"` — EAS-managed; `autoIncrement` only on `production` |
| `targetSdk` | inherited from Expo SDK 57 defaults — not pinned in `app.json` |
| App signing | ❌ no keystore configured; EAS would generate one on first build |
| EAS Android profiles | ✅ `development` and `preview` both internal |
| Dev-client extra permissions | ⚠️ `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` appear in dev builds |

### Required outside the repository (Android)

1. **Google Play Console account** (one-off registration fee) — not confirmed
   to exist.
2. Create the app entry with package `com.pythonsmethod.center` and an internal
   testing track with tester emails.
3. Decide on Play App Signing (recommended) and let EAS generate the upload
   keystore, **or** supply an existing keystore.
4. Same Expo/EAS account and `projectId` as iOS.
5. Same Supabase redirect allow-list entry.
6. If App Links are wanted later: `assetlinks.json` on the domain plus
   `android.intentFilters`.

Android is in better shape than iOS purely because Play registration is
lighter — the code-side gaps are identical.

---

## 9. Feature parity matrix

`Mobile Web` = the existing responsive Next.js site opened in a phone browser;
it is by definition at parity with desktop web.

| Feature | Desktop Web | Mobile Web | iOS/Android Native | Action needed |
|---|---|---|---|---|
| Login | ✅ | ✅ | **READY** | — |
| Sign-up | ✅ | ✅ | **READY** | align min password with web (6 vs 8) |
| Persistent session | ✅ | ✅ | **READY** | move tokens to SecureStore (P1) |
| Logout | ✅ | ✅ | **READY** | — |
| Password recovery | ✅ | ✅ | **MISSING** (request sends, link dead) | fix scheme, add screen, handle token — P0-5 |
| Onboarding / create case | ✅ | ✅ | **MISSING** | needs endpoint — consents + audit must stay server-side |
| Cabinet: profile | ✅ | ✅ | **READY** | — |
| Cabinet: case + status | ✅ | ✅ | **READY** | — |
| Cabinet: next step | ✅ | ✅ | **READY** | logic duplicated — unify later |
| Service period | ✅ | ✅ | **READY** | — |
| Case history | ✅ | ✅ | **READY** | — |
| Documents: list | ✅ | ✅ | **READY** | — |
| Documents: upload | ✅ | ✅ | **PARTIAL** | works, but writes no audit log — P1 |
| Documents: open | ✅ | ✅ | **MISSING** (broken) | P0-2 |
| Team chat: text | ✅ | ✅ | **PARTIAL** | endpoint not deployed — P0-1 |
| Team chat: voice | ✅ | ✅ | **PARTIAL** | same; Android format unverified; no cancel |
| Unread counters | ✅ | ✅ | **PARTIAL** | same dependency on P0-1 |
| AI assistant | ✅ | ✅ | **MISSING** | needs bearer-auth endpoint |
| AI history | ✅ | ✅ | **MISSING** | `assistant_messages` readable by RLS today |
| Red-flag escalation | ✅ | ✅ | **MISSING** | safety gap — follows the AI |
| Health metrics | ✅ | ✅ | **MISSING** | unblocked — RLS already allows full CRUD |
| Supplements + intakes | ✅ | ✅ | **MISSING** | unblocked — RLS already allows full CRUD |
| Support requests | ✅ | ✅ | **MISSING** | needs endpoint (notification + audit) |
| Payments / tariffs | ✅ | ✅ | **MISSING** | product + legal decision first |
| Referrals / tokens | ✅ | ✅ | **MISSING** | read unblocked; redeem needs endpoint |
| Legal / offer | ✅ | ✅ | **MISSING** | required for store review |
| Emergency notice | ✅ | ✅ | **MISSING** | safety-relevant |
| Account deletion | ❌ | ❌ | **MISSING** | store requirement — absent on web too |
| Push notifications | n/a | n/a | **MISSING** | no infrastructure anywhere |
| Localization RU/EN | ✅ public | ✅ public | **MISSING** (RU only) | cabinet is RU-first on web too |
| App icon / splash | n/a | n/a | **BLOCKED BY EXTERNAL CONFIG** | needs brand assets |
| TestFlight distribution | n/a | n/a | **BLOCKED BY EXTERNAL CONFIG** | Apple Developer Program |
| Play internal testing | n/a | n/a | **BLOCKED BY EXTERNAL CONFIG** | Play Console account |

Counts: **11 READY**, 5 PARTIAL, 15 MISSING, 3 BLOCKED BY EXTERNAL CONFIG.

---

## 10. Issues by priority

### P0 — blocks an internal beta

| # | Issue | Evidence | Fix location |
|---|---|---|---|
| **P0-1** | `/api/mobile/*` exists only on the mobile branch; `main` (production) has no `api/mobile`. The app defaults to `https://pythonmethodcenter.com`, so chat, voice and unread counts 404 on a real device. | `git ls-tree -r origin/main` → no match for `api/mobile` | merge/deploy decision — outside the code |
| **P0-2** | `mobile` typecheck fails (4×TS2339) and document opening is dead at runtime: `storage_path` is neither selected nor typed. | `npm run typecheck` in `mobile/`; `case-content.ts:3-10,25` vs `documents.tsx:71,75,129,139` | `mobile/lib/case-content.ts` |
| **P0-3** | 4 required peer dependencies missing — expo-doctor: *"your app may crash outside of Expo Go"*, i.e. in exactly the dev-client/EAS build a beta uses. | `npx expo-doctor` | `mobile/package.json` |
| **P0-4** | No `extra.eas.projectId` — `eas build` cannot run non-interactively. | `expo config --type public` → `extra: {"router":{}}` | `mobile/app.json` + `eas init` |
| **P0-5** | Password recovery broken three ways: scheme `pythonmethod://` vs registered `pythonmethodcenter`; no `reset-password` route; `detectSessionInUrl: false`. | `recovery.tsx:13`, `app.json:5`, `_layout.tsx:17-24`, `supabase.ts:19` | `mobile/app/recovery.tsx`, new screen |

### P1 — needed for a trustworthy beta

| # | Issue | Evidence |
|---|---|---|
| **P1-1** | Session tokens in unencrypted `AsyncStorage`; no `expo-secure-store`. | `mobile/lib/supabase.ts:16` |
| **P1-2** | Mobile document upload writes no `audit_logs` row; web does. | `document-storage.ts:77-93` vs `lib/documents/actions.ts:139` |
| **P1-3** | No `mobile/package-lock.json` committed — builds are not reproducible. | `git ls-files mobile/` |
| **P1-4** | No `mobile/.gitignore` — `.expo/`, generated `ios/`, `android/` can be committed by accident. | repository listing |
| **P1-5** | 3 s poll re-signs every audio URL in a 200-message thread and re-marks read each time. | `team-chat.tsx:67` → `route.ts:52-79` |
| **P1-6** | Voice upload hard-codes `audio/mp4` on both platforms; Android not verified on device. | `team-chat.ts:60-64` |
| **P1-7** | No way to cancel a voice recording once started. | `team-chat.tsx:92-118` |
| **P1-8** | No app icon, no splash — builds ship Expo defaults. | `expo config` → `icon: None` |
| **P1-9** | Raw Postgres error text returned to the client. | `route.ts:66,115`; `audio/route.ts:70,92` |

### P2 — polish

| # | Issue |
|---|---|
| **P2-1** | No rate limiting on `/api/mobile/*` (web assistant has both per-minute and daily limiters). |
| **P2-2** | Password minimum 8 on mobile vs 6 on web. |
| **P2-3** | Russian-only; `profiles.locale` is fetched but never used. |
| **P2-4** | `nextStepForCase` duplicates web logic with different branching. |
| **P2-5** | No empty/offline distinction — network failure and "no data" render alike. |
| **P2-6** | `mobile/` is uploaded to Vercel on every deploy (no `.vercelignore`). |

---

## 11. External configuration requirements

Nothing in this section can be satisfied from the repository.

| # | Requirement | Blocks |
|---|---|---|
| E-1 | **Apple Developer Program** membership (currently free-tier only) | all iOS distribution |
| E-2 | Expo/EAS account + `eas init` → `projectId` | both platforms (P0-4) |
| E-3 | App Store Connect app record + TestFlight internal group | iOS testing |
| E-4 | Google Play Console account + internal testing track | Android testing |
| E-5 | Deploy `/api/mobile/*` to production (merge decision) | P0-1 |
| E-6 | Supabase Auth → add `pythonmethodcenter://reset-password` to redirect allow-list | P0-5 |
| E-7 | Confirm `case-audio` bucket policies in the live project | voice playback |
| E-8 | Confirm all 14+ migrations applied in production, and that `client-documents` storage policies exist (they are created by hand, not by migration) | documents |
| E-9 | Brand assets: 1024×1024 icon, splash, adaptive icon | P1-8 |
| E-10 | Legal: privacy policy URL + store data-safety declarations | store submission |

---

## 12. Recommendation

# GO WITH BLOCKERS

Proceed with internal beta preparation. The architecture is right, the security
boundary is right, and the platform stays unified — one Supabase project, one
identity, one set of business rules. The blocking defects are five, all
concrete, and four of them are repository fixes rather than decisions.

**Do not distribute a build to any tester until P0-1 through P0-5 are closed.**
P0-1 in particular is not a code fix: the mobile endpoints must actually be
deployed, which means merging the mobile branch to `main` (clean, verified) or
deploying it as a preview environment and pointing `EXPO_PUBLIC_API_BASE_URL`
there.

The single largest *external* obstacle is the Apple Developer Program: without
paid membership there is no TestFlight at all, and the iOS half of the beta
cannot start regardless of code quality.

---

# PART II — CHANGES MADE

Branch: `audit/mobile-beta`, based on `origin/agent/mobile-app-foundation`
(`2cd90e2`). Six commits. No web page, no Server Action, no migration and no
RLS policy was modified.

## 13. Commits

| Commit | Title | Fixes |
|---|---|---|
| `4b3db86` | Audit the mobile app for an internal beta | — (this report) |
| `67f9196` | Let a document actually open on the phone | P0-2 |
| `1febf80` | Make the mobile install reproducible and complete | P0-3, P1-3, + a latent install failure |
| `95e24f1` | Make password recovery finish on the phone | P0-5 |
| `fea1568` | Record a phone upload the way the website records one | P1-2 |
| `d6c1181` | Stop leaking database errors, and let a recording be cancelled | P1-9, P1-7, P1-4 |

## 14. Files changed

**Added**

| File | Purpose |
|---|---|
| `docs/mobile/MOBILE_INTERNAL_BETA_AUDIT_2026-08-09.md` | this report |
| `mobile/app/reset-password.tsx` | the missing recovery destination |
| `mobile/lib/deep-links.ts` | redirect URL derived from the app's real scheme |
| `mobile/lib/api-client.ts` | one place that attaches the bearer token |
| `mobile/.gitignore` | keeps generated native dirs, `.expo` and `.env` out |
| `mobile/package-lock.json` | reproducible installs |
| `app/api/mobile/documents/route.ts` | document registration with audit trail |

**Modified**

| File | Change |
|---|---|
| `mobile/lib/case-content.ts` | select and type `storage_path` |
| `mobile/package.json` | 4 peer deps declared; `react-dom` pinned; `react-native-worklets` override |
| `mobile/app/recovery.tsx` | use the derived redirect URL |
| `mobile/app/_layout.tsx` | register `reset-password` |
| `mobile/lib/document-storage.ts` | register through the platform, not a direct insert |
| `mobile/lib/team-chat.ts` | use the shared api-client |
| `mobile/app/team-chat.tsx` | cancel a recording |
| `app/api/mobile/messages/route.ts` | generic client errors, real reason logged |
| `app/api/mobile/messages/audio/route.ts` | same |

## 15. Additional defect found during the fixes

Not visible in the first pass, found when re-installing:

**`npm install` in `mobile/` did not resolve on a clean tree, and `npm ci`
failed outright.** Two separate causes, both pre-existing — confirmed by
stashing every change and reproducing on the original `package.json`:

1. `react` pinned to `19.2.3` while `react-dom` floated to `19.2.8`, which
   requires `react@^19.2.8`. `react-dom` arrives through expo-router's web
   support.
2. `expo-modules-core` accepts `react-native-worklets` up to `^0.10.0`, but
   npm hoisted `0.11.3` because `react-native-reanimated` allows
   `0.10.x - 0.11.x`. The tree `npm install` produced was one `npm ci` then
   rejected.

This matters more than it looks: **EAS runs `npm ci` when a lockfile is
present**, so the first EAS build would have failed regardless of everything
else. Fixed by pinning `react-dom` to `react`'s version and adding an
`overrides` entry for `react-native-worklets`.

## 16. Tests run and results

Every command below was executed on the final state of this branch.

| Project | Command | Before | After |
|---|---|---|---|
| web | `npm run typecheck` | ✅ pass | ✅ pass |
| web | `npm test` | ✅ 128/128 | ✅ 128/128 |
| web | `npm run build` | ✅ pass | ✅ pass (3 mobile routes compiled) |
| mobile | `npm install` (clean tree) | ❌ ERESOLVE | ✅ exit 0 |
| mobile | `npm ci` | ❌ EUSAGE | ✅ exit 0 |
| mobile | `npm run typecheck` | ❌ 4 × TS2339 | ✅ exit 0 |
| mobile | `npx expo-doctor` | ❌ 17/20 | ✅ 18/20 |
| mobile | `npx expo config --type public` | ✅ pass | ✅ pass |
| mobile | `npx expo prebuild --clean` | ✅ pass | ✅ pass |

The two remaining expo-doctor failures are both outbound network fetches
blocked by this sandbox's proxy — the config-schema check and the React Native
Directory metadata check. The config itself resolves locally
(`expo config --type public` exits 0), so neither is a project defect. They
should be re-run on an unrestricted network to confirm.

Prebuild re-verified after the changes: iOS `CFBundleURLSchemes` and Android
`android:scheme` both read `pythonmethodcenter`, matching the recovery
redirect the app now derives. Generated `ios/` and `android/` were deleted
again and are now git-ignored.

## 17. Remaining blockers

### Still P0 — cannot be fixed inside the repository

| # | Blocker | Why it is not a code change |
|---|---|---|
| **P0-1** | `/api/mobile/*` is not deployed. `main` has no `api/mobile`; the app defaults to `https://pythonmethodcenter.com`. Chat, voice, unread and now document registration all 404 on a device. | Requires merging this branch to `main` (verified conflict-free) or deploying it as a preview and pointing `EXPO_PUBLIC_API_BASE_URL` at that URL. A deployment decision, not a patch. |
| **P0-4** | No `extra.eas.projectId`. | Minted by `eas init` against a real Expo account. Inventing an id would be fabrication. |

### Still P1

| # | Item | Note |
|---|---|---|
| **P1-1** | Session tokens remain in unencrypted `AsyncStorage` | **Deliberately not changed.** `expo-secure-store` caps a value at ~2 KB on iOS and a Supabase session commonly exceeds that, so a naive adapter silently breaks sign-in — and it cannot be verified without a device. Shipping an untested auth change into a beta is worse than the risk it removes on team-owned test phones. Implement with chunking, verify on a device, before any public release. |
| **P1-5** | 3 s poll re-signs every audio URL and re-marks read | Works; wasteful. Needs a cheaper delta endpoint. |
| **P1-6** | Voice MIME hard-coded `audio/mp4` | Correct for the `HIGH_QUALITY` preset on both platforms in principle; **unverified on an Android device.** In the test plan. |
| **P1-8** | No icon, no splash | Needs brand assets. |

### Unchanged and out of scope for a beta

All P2 items, and every MISSING feature in the parity matrix: onboarding, AI
and its red-flag escalation, metrics, supplements, support requests, payments,
push, legal pages, account deletion, English.

## 18. Verdict after fixes

Repository-side readiness moved from **blocked** to **buildable**. All five P0s
that were code defects are fixed and verified; the two that remain are a
deployment decision and an EAS account.

The recommendation is unchanged — **GO WITH BLOCKERS** — but the blocker list
is now two items long instead of five, and neither is a bug.

---

# PART III — REAL-DEVICE TEST CHECKLIST

Run on one iPhone and one Android device. **Prerequisite: P0-1 is closed** —
`EXPO_PUBLIC_API_BASE_URL` must point at a deployment that actually serves
`/api/mobile/*`, otherwise every row touching chat, voice or document upload
fails for that reason alone.

Two accounts are needed: **A** (a real test client with a case) and **B** (a
second client, used only for the isolation check).

### Auth

| # | Step | Expected |
|---|---|---|
| A1 | Sign in with account A's existing **website** credentials | Cabinet opens; same case as the web |
| A2 | Force-quit, reopen | Still signed in — no re-entry of the password |
| A3 | Leave the app backgrounded overnight, reopen | Session refreshed silently, no logout |
| A4 | Log out, reopen | Login screen; cabinet unreachable |
| A5 | Request recovery, open the email **on the phone** | App opens on "Новый пароль" — *this is the P0-5 fix; the primary thing to verify* |
| A6 | Set a new password | Lands in the cabinet |
| A7 | Sign in **on the website** with the new password | Works — one account, both channels |
| A8 | Open a recovery link twice | Second attempt shows "Ссылка не подошла", not a blank screen |
| A9 | Sign up a brand-new account | Confirm-email path behaves as configured in Supabase |

### Data sync

| # | Step | Expected |
|---|---|---|
| S1 | Staff changes case status on web → pull-to-refresh on phone | New status and label |
| S2 | Staff adds a lifecycle event → open История | Event appears with a client-safe label |
| S3 | Upload a document on the phone → open the web cabinet | Same document, same filename |
| S4 | Upload on web → refresh phone | Appears on the phone |
| S5 | Check `audit_logs` after a phone upload | A `document_uploaded` row with `uploaded_via: "mobile_app"` — *verifies the P1-2 fix* |

### Documents

| # | Step | Expected |
|---|---|---|
| D1 | Upload a PDF | Succeeds, appears in the list |
| D2 | Upload a JPG | Succeeds |
| D3 | **Tap an existing document** | Opens — *this is the P0-2 fix; it did nothing at all before* |
| D4 | Pick an unsupported type (e.g. .docx) | Refused with a readable message, nothing uploaded |
| D5 | Pick a file over 25 MB | Refused before upload starts |
| D6 | Kill the network mid-upload | Clear error; no orphan row; no half-file in storage |
| D7 | Upload a file whose name has Cyrillic and spaces | Succeeds — the sanitised path must match what the server rebuilds, or registration is rejected |

### Chat

| # | Step | Expected |
|---|---|---|
| C1 | Send text from phone → web staff view | Arrives within ~3 s |
| C2 | Staff replies on web → phone | Arrives within ~3 s |
| C3 | Unread badge on the cabinet screen | Counts staff messages; clears on opening the chat |
| C4 | Staff opens the case on web after the phone read it | Read state consistent |
| C5 | Send a very long message (8000 chars) | Accepted; 8001 rejected |

### Voice

| # | Step | Expected |
|---|---|---|
| V1 | First tap on "Голос" | Permission prompt shows **the Russian sentence from app.json** |
| V2 | Deny permission, tap again | Readable message, no crash |
| V3 | Record ~5 s and send | Appears in the thread with a duration |
| V4 | **Tap "Отменить" while recording** | Recording discarded, nothing sent — *P1-7 fix* |
| V5 | Play back your own voice message | Plays |
| V6 | Staff plays it on the web | Plays — same file, same bucket |
| V7 | Staff records on web → play on phone | Plays |
| V8 | **Record and send on Android specifically** | Accepted — *P1-6 is unverified; if the upload is rejected as an unsupported format, this is why* |
| V9 | Record with Bluetooth headphones connected | Records from the expected microphone |
| V10 | Record ~3 minutes | Under the 10 MB limit, uploads |

### Case

| # | Step | Expected |
|---|---|---|
| K1 | Profile name, email, phone | Match the web cabinet |
| K2 | Case number, status, direction | Match |
| K3 | Service period product and dates | Match |
| K4 | Sign in as an account with **no** case | "Кейс ещё не создан"; no crash; documents and chat degrade gracefully |

### Network and failure

| # | Step | Expected |
|---|---|---|
| N1 | Airplane mode, open the cabinet | Readable error, not a blank screen or a spinner forever |
| N2 | Throttle to 3G, open chat | Loads, no duplicate sends |
| N3 | Revoke the session in Supabase, then act in the app | Sent back to login, not a silent failure |
| N4 | Background the app for 10 minutes during recording | No crash |

### Security — the row that matters most

| # | Step | Expected |
|---|---|---|
| X1 | Sign in as **B**. Confirm B sees only B's case, documents and messages | No trace of A |
| X2 | With B's bearer token, call `GET /api/mobile/messages` | Returns **B's** thread only. The endpoint accepts no case id, so there is nothing to tamper with — confirm that empirically |
| X3 | With B's token, `POST /api/mobile/documents` using **A's** storage path | Rejected — the server rebuilds the path from B's identity |
| X4 | With B's session, try `createSignedUrl` on A's document path via the Supabase SDK | Denied by Storage RLS |
| X5 | Inspect the built app bundle for `service_role`, Stripe, Anthropic, OpenAI or Telegram strings | Nothing found |
