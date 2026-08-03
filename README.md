# Python Method Center Platform

A clean web-first platform for the Python Method Center. This repository is not
a continuation of the legacy Telegram-based system (`python-method-center`),
which is preserved separately.

## Current Implementation

- Next.js App Router + TypeScript; bilingual public site (RU default, EN via
  the `pm-locale` cookie switcher); the client cabinet and staff workspace are
  Russian-first
- Public landing page with the client journey, first-clients promo
  (`NEXT_PUBLIC_FREE_REVIEW`), and a footer legal/emergency line
- Supabase Auth email/password: sign-up, sign-in, logout, callback route,
  session-refresh middleware, and full password recovery
  (`/recovery` → email link → `/reset-password`, expired links handled)
- Onboarding form that creates the client case and records offer acceptance
  and data-processing consent with audit logs and lifecycle events
- Client cabinet: case status, document upload/open (private storage bucket,
  signed URLs), payments list, case history, support requests, and a
  messenger-style case chat (text + voice messages, unread counters,
  day separators, 3s polling)
- AI runtime (Claude + OpenAI with a strongest-answer arbiter):
  - three levels of the client assistant on one endpoint, resolved on the
    server from the visitor's session (`lib/assistant/tiers.ts`):
    1. guest — public consultant of the center, strictly on topic (the
       center, the method, registration, tariffs, the first step), one
       model, short answers;
    2. registered — personal assistant inside the cabinet, aware of the
       person's own case status, documents and next step, one model;
    3. client (paid) — personal AI of the case: documents by filename,
       support period, lifecycle history; both models plus the arbiter
  - the chat window title, greeting and suggestions follow the same three
    levels; system prompts are cached (`cache_control`) so repeat reads of
    the rules and knowledge base cost a fraction of fresh input tokens
  - abuse protection for the public level (`lib/assistant/guard.ts`):
    shared daily caps per visitor and platform-wide, a Telegram alert when
    the free level is spent, a founder-cabinet counter, and the
    `PUBLIC_ASSISTANT_MODE` switch (`open` / `registered_only` / `off`) —
    see `docs/safety/ЗАЩИТА_ПОМОЩНИКА_ОТ_НАПЛЫВА.md`
  - staff assistant in `/admin` with optional per-case context, and file
    attachments — up to 30 photos/PDFs per message, downscaled in the
    browser and read in batches when they exceed one request, then
    analysed together; sent straight to Claude and never stored anywhere
  - the same paperclip is available to paying clients in their personal AI
    chat, enforced server-side by tier — guests and registered users get a
    warm pointer to the paid level instead
  - knowledge base editable by staff, injected into both system prompts
  - saved conversations for people with an account only (registered and
    paying): the exchange is written to `assistant_messages`, restored into
    the chat window on the next visit, readable in the cabinet and on the
    case page so the team does not repeat what the person already asked.
    A visitor without an account leaves no record anywhere; only the last
    twelve messages are replayed to the model, so a long history costs
    nothing extra per question
- Automated red-flag workflow: the client assistant tags emergencies with a
  hidden marker; the server strips it, records an `escalation_events` row
  (physical → Karen, psychological → support) and pushes an external
  Telegram notification
- External team notifications (Telegram, `notification_events` delivery log
  with retry/dedupe/status): red flags, new client messages (text and voice),
  new support requests, payments, processing errors
- Payments: Stripe Payment Links on `/payment` behind a mandatory offer
  checkbox, plus a server-side Stripe webhook
  (`/api/stripe/webhook`) with signature verification and insert-first
  idempotency that records payments automatically, activates the service
  period, and alerts the team (unmatched payments go to manual review)
- Public support page `/support`: guest contact form (no account needed,
  honeypot + rate limiting + consent), prominent emergency notice, links to
  password recovery and login
- Staff workspace (`/admin`, roles `support`/`admin`): red-flag escalation
  panel, case list/detail with chat and management controls, manual payment
  recording (still available as fallback), document intake, support request
  queue (guest requests show their reply-to email)
- Audit log and case lifecycle event writing via the server-only service role

Known limitations (tracked in `docs/audits/`): the AI reads case metadata
and files attached directly in the chat (paying clients and staff), but
not the contents of files in cabinet storage — the prompts tell it to say
so and offer the paperclip instead of pretending; the staff assistant's
own chat in `/admin` is not persisted; admin UI is Russian-only;
notification delivery requires the Telegram env vars to be set.

## Routes

- `/` — landing
- `/login`, `/recovery`, `/reset-password` — auth
- `/onboarding` — client intake (creates the case)
- `/cabinet` — client cabinet
- `/payment`, `/payment/success` — tariffs, Stripe Payment Links
- `/legal/offer` — public offer
- `/support` — public support (guest form + emergency notice)
- `/admin`, `/admin/cases`, `/admin/documents`, `/admin/requests` — staff
- `/api/assistant/client`, `/api/assistant/staff` — AI endpoints
- `/api/assistant/history` — the signed-in person's saved AI conversation
- `/api/stripe/webhook` — Stripe webhook (server-to-server only)
- `/api/messages/*` — case chat polling and voice upload

## Running Locally

Use Node.js 20 or newer.

```bash
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run build
npm test          # vitest unit tests
```

## Environment

Copy `.env.example` to `.env.local`. Key groups:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Stripe: `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W/_15W` (buttons),
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (webhook)
- AI: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- AI abuse protection (all optional, safe defaults): `PUBLIC_ASSISTANT_MODE`
  (`open` | `registered_only` | `off`), `ASSISTANT_DAILY_LIMIT_GUEST` /
  `_REGISTERED` / `_CLIENT`, `ASSISTANT_DAILY_TOTAL_GUEST`,
  `ASSISTANT_USAGE_SALT`
- Notifications: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `NEXT_PUBLIC_SITE_URL` — absolute origin for links in notifications and
  auth redirects

Do not commit `.env.local` or expose any server-only key via `NEXT_PUBLIC_*`.

## Supabase Migration Setup

Apply all migrations in `supabase/migrations/` in filename order (Supabase
CLI `supabase db push`, or run each file once in the SQL editor). Storage
buckets (`client-documents`, `case-audio`) follow
`supabase/storage_manual_setup.md`.

RLS is intentionally scoped to the authenticated user (`auth.uid()`); staff
reads/writes go through the server-only service role. Do not weaken RLS.

## Stripe Webhook Setup

1. Stripe Dashboard → Developers → Webhooks → Add endpoint:
   `https://pythonmethodcenter.com/api/stripe/webhook`
2. Events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `payment_intent.payment_failed`,
   `charge.refunded`
3. Put the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

## Deployment

See `docs/deployment.md` for the Vercel deployment plan and Supabase Auth
redirect URLs (must include `/auth/callback` on the production domain for
sign-up confirmation and password recovery).

Audits live in `docs/audits/` — most recent:
`CLAUDE_FINAL_LAUNCH_READINESS_AUDIT_V2.md` and
`LAUNCH_CLOSURE_SPRINT_REPORT_V1.md`.

## Documentation

Architecture and foundation documents live in `docs/` and remain the source of
truth for future implementation phases.
