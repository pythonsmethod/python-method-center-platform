# Python Method Center Platform

A clean web-first platform for the Python Method Center. This repository is not
a continuation of the legacy Telegram-based system (`python-method-center`),
which is preserved separately.

## Current Implementation

The launch-ready MVP includes:

- Next.js App Router + TypeScript, Russian client-facing UI
- Public landing page with the client journey and legal/emergency notices
- Supabase Auth email/password (sign-up, sign-in, logout, callback route,
  session-refresh middleware)
- Onboarding form that creates the client case and records offer acceptance
  (`offer_acceptance`) and data-processing consent with audit logs and
  lifecycle events
- Client cabinet: case status, document upload/open (private storage bucket,
  signed URLs), payments list, case history, and "write to the team" support
  requests
- Published public offer at `/legal/offer` (PDF served from `public/legal/`)
- Payment page with Stripe Payment Link buttons driven by env vars
- Staff workspace (`/admin`, roles `support`/`admin` enforced via profile
  role): case list and case detail with the onboarding payload, case
  status/urgency/direction management, manual payment recording, document
  intake with signed-URL viewing, and support request queue with status
  controls
- Audit log and case lifecycle event writing via the server-only service role

Not implemented (post-launch): AI runtime, automated red-flag workflow,
Stripe webhooks, threaded messaging.

## Routes

- `/` — landing
- `/login` — auth
- `/onboarding` — client intake (creates the case)
- `/cabinet` — client cabinet
- `/payment` — tariffs and Stripe Payment Links
- `/legal/offer` — public offer
- `/support` — support info
- `/admin`, `/admin/cases`, `/admin/documents`, `/admin/requests` — staff

## Running Locally

Use Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

TypeScript and production build checks:

```bash
npm run typecheck
npm run build
```

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never NEXT_PUBLIC_
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W=   # optional, shows the pay button
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W=  # optional, shows the pay button
```

Empty Supabase values are supported for local scaffold rendering; protected
pages show a setup notice instead of faking a connection.

Do not commit `.env.local`, access tokens, database passwords, or service-role
keys. Do not expose `SUPABASE_SERVICE_ROLE_KEY` or any service-role credential
through `NEXT_PUBLIC_*` variables.

## Supabase Migration Setup

Apply all migrations in `supabase/migrations/` in filename order:

```text
20260621220000_create_core_schema.sql
20260623010000_storage_audit_safety_foundation.sql
20260623030000_document_intake_queue_foundation.sql
20260623033000_document_status_insert_hardening.sql
20260623040000_staff_access_profile_role_hardening.sql
20260709120000_launch_hardening.sql
```

Safe paths:

1. Supabase CLI:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

2. Supabase SQL editor: run each migration file once, in order.

For private client document storage, follow
`supabase/storage_manual_setup.md` to create the private `client-documents`
bucket and `storage.objects` policies in the Supabase Dashboard.

RLS is intentionally scoped to the authenticated user (`auth.uid()`); staff
reads/writes go through the server-only service role. Do not weaken RLS.

## Deployment

See `docs/deployment.md` for the Vercel deployment plan, required Supabase
Auth redirect URLs, and the full post-deploy verification checklist
(including staff access, document signed URLs, offer consent records, support
requests, and payment link buttons).

The launch readiness audit lives at
`docs/launch/LAUNCH_MVP_AUDIT_2026-07-09.md`.

## Documentation

Architecture and foundation documents live in `docs/` and remain the source of
truth for future implementation phases.
