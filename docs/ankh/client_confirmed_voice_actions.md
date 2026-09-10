# Confirmed client cabinet actions in live voice — 2026-09-10

## A. What existed before

The client voice pilot could read the authenticated client's existing cabinet
records and search public web information. Every client tool was read-only.
Anham could therefore describe the supplement checklist or Professor thread but
had to refuse a request to change them.

## B. What changed

Live client voice now exposes two server tools: prepare and execute. Preparation
validates one explicitly requested self-service action, stores no action content,
and returns a localized exact summary. Anham must ask for a separate spoken
confirmation. Execution requires a later Realtime user-turn identifier, a short
unambiguous confirmation phrase, the same authenticated profile, the same voice
session receipt, an unexpired signed token and an atomically claimed pending row.

The supported actions are: send the client's exact text to Professor Python;
add or edit the client's supplement schedule; mark an intake taken or not taken;
update the client's name or phone; add or correct a client-entered health metric;
and add or correct a client-entered sleep entry. The supplement schedule powers
the cabinet checklist/reminder; this does not add operating-system push alerts.

## C. Files created or changed

- `lib/assistant/client-action-tools.ts`
- `lib/assistant/voice-site-tools.ts`
- `lib/assistant/client-tool-contract.ts`
- `lib/assistant/client-voice-context.ts`
- `lib/assistant/realtime-browser.ts`
- `lib/assistant/realtime-server.ts`
- `lib/assistant/realtime-contract.ts`
- `app/api/assistant/realtime/tools/route.ts`
- `supabase/migrations/20260910222409_assistant_client_actions.sql`
- relevant tests and project records

## D. Data and schema changes

Adds `assistant_client_actions`, a server-only confirmation ledger. RLS is enabled;
`anon` and `authenticated` have no table grants; only `service_role` can select,
insert or update. The row contains identity/session binding, action type, a SHA-256
hash, status and timestamps. It does not store the requested message, health data,
supplement details or confirmation summary. The signed token carrying those values
expires within ten minutes or with the voice session, whichever is earlier.

## E. Tests and exact results

Focused voice, browser, ownership, prompt and confirmed-action regression passed:
160/160 tests in 6 files. The full suite passed 1649/1649 tests in 172 files;
the production build, TypeScript, scoped ESLint and `git diff --check` passed.

## F. Benchmark results

Not applicable. Extraction, verification and trust logic did not change.

## G. Security and PHI implications

Every target is bound server-side to the signed-in client profile. Existing-record
edits repeat ownership filters. The database claim makes execution one-time. The
server rejects same-turn execution, ambiguous confirmation, changed/expired tokens,
different sessions and unsupported actions. Professor messages trigger the existing
team notification without copying message contents into the external notification.
The post-migration Supabase security advisor reports the new table only as
`RLS enabled, no policy`; this is intentional because browser roles have no grants
and all access is through the authenticated server boundary. The performance
advisor adds only the expected unused-new-index informational notice; its other
findings predate this change.

## H. Known limitations

This release applies to approved full client-assistant preview accounts in live
voice. It does not yet provide text-chat action confirmation across separate HTTP
requests. Speech recognition can still mishear details, which is why the exact
summary and separate confirmation are mandatory. Live authenticated microphone
acceptance remains required.

## I. Intentionally not implemented

No AI-created medication or supplement choice, dose recommendation, payment or
service-access change, document/source modification, file upload, clinical fact,
Case state, Karen/Professor decision, deletion, other-client action, admin tool or
push-notification system was added.

## J. Phase status

Implementation and production schema migration CLOSED. Website deployment and live
microphone acceptance are release steps; this does not advance an Ankh clinical phase.

## K. GO / NO-GO

GO for the website release. NO-GO for broader autonomous
mutations outside the explicit client self-service allowlist.

## L. Exact next action

Publish the website, then use a preview client account to prepare and confirm one
supplement schedule and one synthetic Professor message.
