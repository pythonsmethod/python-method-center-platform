# Python Method Center Platform

A clean web-first platform for the Python Method Center. This repository is not
a continuation of the legacy Telegram-based system (`python-method-center`),
which is preserved separately.

## Current Implementation

The current P0 foundation includes:

- Next.js App Router
- TypeScript
- Basic platform layout
- Public, auth, client, admin, payment, and support routes
- Supabase browser and server client helpers
- Supabase Auth email/password foundation
- Auth callback route
- Protected client/admin route handling
- Core Supabase/Postgres schema migration
- First authenticated onboarding form
- Client case shell creation and basic cabinet status display

The app does not implement medical decisions, AI decisions, Stripe payments,
document upload, or production admin workflows.

## Routes

- `/`
- `/login`
- `/onboarding`
- `/cabinet`
- `/admin`
- `/payment`
- `/support`

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

## Supabase Environment

Copy `.env.example` to `.env.local` and set the public Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

These values are required for live authentication and onboarding writes. Empty
values are supported for local scaffold rendering; protected pages show a setup
notice instead of faking a connection.

Do not commit `.env.local`, access tokens, database passwords, or service-role
keys. Do not expose `SUPABASE_SERVICE_ROLE_KEY` or any service-role credential
through `NEXT_PUBLIC_*` variables.

## Supabase Migration Setup

The core schema migration lives at:

```text
supabase/migrations/20260621220000_create_core_schema.sql
```

The storage/audit safety migration lives at:

```text
supabase/migrations/20260623010000_storage_audit_safety_foundation.sql
```

Apply it to a real Supabase project with one of these safe paths:

1. Supabase CLI:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

2. Supabase SQL editor:

Copy the SQL from the migration file into the SQL editor for the intended
project and run it once.

After applying the migration, confirm the app can authenticate a real user and
submit onboarding data. The onboarding flow writes to:

- `profiles`
- `client_cases`
- `onboarding_submissions`
- `consent_records`

RLS is intentionally scoped to the authenticated user (`auth.uid()`). Do not
weaken RLS for client onboarding verification.

For private client document storage, apply the storage/audit safety migration
first, then follow `supabase/storage_manual_setup.md` to create the private
Storage bucket and `storage.objects` policies in the Supabase Dashboard if SQL
Editor cannot own `storage.objects`.

## Live Verification Checklist

For P0 live Supabase verification, confirm:

- `NEXT_PUBLIC_SUPABASE_URL` is set.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set.
- The migration has been applied to the target Supabase project.
- A user can sign up or sign in through `/login`.
- An authenticated user can submit `/onboarding`.
- `/cabinet` shows the created case shell.
- No service-role key is exposed to the browser or committed to the repo.

## Planned Modules

- web: public website
- client-cabinet: client personal cabinet
- backend: application backend
- ai: AI support layer
- payments: payment integrations
- admin: administration
- support: support tooling
- database: data layer
- app: application shell

## Documentation

Architecture and foundation documents live in `docs/` and remain the source of
truth for future implementation phases.
