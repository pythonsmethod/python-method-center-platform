# Owner-approved assistant access

A. Before: voice/text private assistant required staff role plus founder/Karen
email. The owner confirmed an existing client account for equivalent assistant
access, including site/client information and internal-memory commands.

B/C. Added a server-managed ANHAM_ASSISTANT_DELEGATE_EMAILS allowlist,
assistant-specific authentication helper and RU/EN /assistant page. Updated
private history/text/voice gates and regression tests. General staff/admin and
founder-cabinet authorization is unchanged. Delegates are addressed neutrally;
their notes are attributed to their own authenticated profile, not to Anna.

D. No schema or profile role change. Existing account remains client. Production
and preview received the explicitly approved email through Vercel configuration;
the actual email is not committed. Existing assistant_messages and knowledge are
reused with the authenticated author ID.

E. Full initial regression: 1532 tests / 167 files passed; TypeScript and ESLint
passed. A further voice-session grant/revocation test was added afterward and is
included in focused final verification. Publication results follow below.

F. Existing synthetic benchmark unchanged: 3 documents/4 pages, 100% numeric exact
match and verified precision, zero critical false VERIFIED.

G. Access is intentionally equivalent inside the assistant, including existing
client-data retrieval and source evidence. No general admin role, external
credentials, clinical approval or unrelated management permissions are granted.
Only verified auth email is accepted for client delegation; editable metadata
does not authorize it. Suspended/closed/anonymous accounts and revoked delegates
are denied. History endpoint does not accept a caller-selected profile ID.

H/I. No impersonated login or microphone capture on behalf of the delegate.
The owner grants the access; the delegate uses her existing sign-in at /assistant.
No account creation, password change, message/email sending or clinical migration.

J/K/L. Implementation complete, release acceptance pending. Next: deploy and
verify route/access behavior. Revoke by removing the delegate email and redeploy.
