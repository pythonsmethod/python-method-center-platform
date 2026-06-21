# Pythons Center — Platform

A new, clean web-first project. This is not a continuation of the old Telegram-based system (`python-method-center`), which is preserved separately as legacy.

## Current implementation

P0-001 initializes the first runnable application scaffold:

- Next.js App Router
- TypeScript
- Basic platform layout
- Scaffold routes for public, auth, client, admin, payment, and support areas
- Supabase browser client placeholder

No medical logic, AI decisions, Stripe integration, Supabase schema, or production access control is implemented yet.

## Routes

- `/`
- `/login`
- `/onboarding`
- `/cabinet`
- `/admin`
- `/payment`
- `/support`

## Running locally

Use Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

TypeScript check:

```bash
npm run typecheck
```

## Environment

Copy `.env.example` to `.env.local` when Supabase is ready:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Empty values are supported for the scaffold. Supabase is not connected yet.

## Planned modules

- web — public website
- client-cabinet — client personal cabinet
- backend — application backend
- ai — AI support layer
- payments — payment integrations
- admin — administration
- support — support tooling
- database — data layer
- app — application shell

## Documentation

Architecture and foundation documents live in `docs/` and remain the source of truth for future implementation phases.
