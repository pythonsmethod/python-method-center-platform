# Mobile Application Foundation v1

**Status:** implementation started  
**Repository:** `pythonsmethod/python-method-center-platform`  
**Mobile path:** `/mobile`

## 1. Product decision

Python Method Center is one platform with three access channels:

1. desktop web;
2. mobile web;
3. native iOS/Android application.

The channels may adapt their interface to the device, but they must share the same identity, client profile, case, documents, conversations, AI history, payments, metrics, supplement schedule, support records and safety events.

## 2. Source of truth

The native application must not create a second business system.

- Supabase Auth remains the single identity provider.
- Existing Supabase tables and storage remain the authoritative data store.
- Existing server routes remain the authority for AI, Stripe, staff-owned writes, safety and notifications.
- The mobile application uses the public anon key only. Service-role, Stripe and AI secrets never ship to a device.
- Row Level Security continues to enforce client ownership.

## 3. Initial technical stack

- Expo SDK 57;
- React Native;
- Expo Router;
- TypeScript strict mode;
- Supabase JS with AsyncStorage-backed sessions;
- existing production API at `https://pythonmethodcenter.com`.

## 4. Delivery sequence

### Phase M0 — foundation

- create the Expo project inside the existing repository;
- connect persistent authentication to the existing Supabase project;
- document environment boundaries;
- prove that the same account session can be used on the native client.

### Phase M1 — identity and shell

- sign in;
- sign up;
- password recovery and deep-link callback;
- authenticated navigation shell;
- profile and logout;
- Russian/English locale selection.

### Phase M2 — unified client cabinet

- cabinet home;
- case status and lifecycle;
- documents;
- payments and support period;
- support requests;
- contact details.

### Phase M3 — communication

- case chat;
- voice messages;
- unread state;
- client AI with the same server-resolved tier;
- saved AI history;
- safe file attachments for paid clients.

### Phase M4 — daily tools

- metrics chart;
- supplement schedule;
- intake completion state;
- reminders and native push notifications.

### Phase M5 — release readiness

- offline-safe drafts without creating a second source of truth;
- error and crash telemetry;
- accessibility and device testing;
- TestFlight and Google Play internal testing;
- privacy labels, account deletion and store review materials.

## 5. Non-negotiable parity rules

1. A user has one account across all channels.
2. Every durable action is written to the shared backend.
3. A message read in one channel is read everywhere.
4. A file uploaded in one channel is visible in every authorized channel.
5. AI tier, permissions and safety rules are resolved on the server, never trusted from the app.
6. Mobile-only caching may improve usability but cannot become authoritative storage.
7. Feature releases must include a parity decision: web, mobile web and native availability must be documented before merge.

## 6. First implemented slice

The initial branch establishes:

- a standalone Expo application under `/mobile`;
- application identifiers for iOS and Android;
- strict TypeScript configuration;
- shared Supabase connection using persistent mobile sessions;
- a foundation screen that reports whether the shared account session is active.

The next implementation slice is M1: sign-in, sign-up and authenticated routing.
