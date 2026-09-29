# Karen Today workspace — 2026-09-29

Karen's `/admin` route is now a focused daily client workspace rather than a developer-style administrative overview. It contains the factual Today queue and the Case assistant. Configuration, session, knowledge, document-directory, and request-directory panels remain available through their dedicated routes but are not duplicated on Today.

The queue includes only Cases with records created during the current `America/Los_Angeles` calendar day: Case creation, client/team messages, document uploads, onboarding submissions, payments, or Case lifecycle events. Cases are ordered by latest activity. Today's unread count follows the same lower day boundary.

This is a read-only projection over existing records. It adds no processing classification, urgency, priority, automatic transition, schema, RLS, clinical interpretation, trust promotion, or PHI transmission.

