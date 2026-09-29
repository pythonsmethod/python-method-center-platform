# Karen Today workspace — 2026-09-29

Karen's `/admin` route is now a focused daily client workspace rather than a developer-style administrative overview. It contains the factual Today queue and the Case assistant. Configuration, session, knowledge, document-directory, and request-directory panels remain available through their dedicated routes but are not duplicated on Today.

The queue includes only Cases with records created during the current `America/Los_Angeles` calendar day: Case creation, client/team messages, document uploads, onboarding submissions, payments, or Case lifecycle events. Cases are ordered by latest activity. Today's unread count follows the same lower day boundary.

This is a read-only projection over existing records. It adds no processing classification, urgency, priority, automatic transition, schema, RLS, clinical interpretation, trust promotion, or PHI transmission.

## Production release

PR #257 merged as `9fa8d95a0473c699442fd87e108206e8ccf3f0d7`. Vercel production deployment `DNLo3a7vzk9xECMh74nfNpXs297D` completed successfully. `https://pythonmethodcenter.com/admin` returns the expected protected-route redirect to `/login?next=%2Fadmin`, and `www` redirects to the canonical domain. Authenticated bilingual acceptance remains open.
