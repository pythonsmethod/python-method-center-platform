# Tech Stack Decision V1 — Pythons Center Platform

Status: DECIDED (architectural decision only — no provisioning yet)
Date: 2026-06-15
Scope: Greenfield web-first platform. No legacy code, agents, Telegram logic, orchestration layer, or environment values are carried over from python-method-center (legacy, archived).

---

## 1. Context and goals

The platform is WEB-FIRST. Telegram is no longer the foundation. The system is built around: the public website, the client cabinet, an AI support layer, Karen and the methodology, Stripe payments, onboarding, and case studies.

The chosen stack must serve the following requirements:

- Public marketing website with strong SEO and fast load.
- Authenticated client cabinet (personal area for clients).
- AI support layer (streaming chat, server-side LLM calls, guardrails).
- Admin panel (internal operations, content, client management).
- Stripe payments (checkout, webhooks, subscription/one-off tariffs).
- A relational database with auth and storage.
- Future scalability without an early rewrite.
- Smooth development through Claude (mainstream, well-documented, single-language where possible).
- Deployability to Railway / Vercel / Supabase.

---

## 2. Options considered

### Option A — Next.js (App Router) + Supabase + Stripe (RECOMMENDED)

Frontend and backend: Next.js (TypeScript, App Router) with server components, route handlers, and server actions. Hosting on Vercel.
Database, auth, storage: Supabase (managed Postgres + Auth + Storage + Row Level Security).
Payments: Stripe (Checkout + webhooks via Next.js route handlers).
AI layer: Vercel AI SDK with provider-agnostic LLM calls, streaming to the client; guardrails enforced server-side.

Pros:
- One language (TypeScript) across web, cabinet, admin, and API — fastest for Claude-assisted development.
- Next.js covers public site (SSR/SSG for SEO), cabinet (auth-gated), and admin in a single codebase.
- Supabase gives Postgres, auth, storage, and RLS out of the box — minimal backend boilerplate.
- Excellent fit for Vercel + Supabase deploy targets; also deployable to Railway.
- Huge ecosystem and documentation; low risk of dead ends.

Cons:
- Vendor-leaning (Vercel/Supabase); mitigated because both are standard Postgres + Node under the hood and portable.
- Long-running/background jobs need an external worker or queue (acceptable later).

### Option B — Remix (or Next.js) + Railway + dedicated Postgres + Prisma

Frontend and backend: Remix or Next.js (TypeScript), deployed as a container on Railway.
Database: Railway-managed Postgres accessed via Prisma ORM.
Auth: self-managed (Auth.js / Lucia) or a managed provider.
Payments and AI: Stripe + a provider-agnostic AI SDK, same as Option A.

Pros:
- Single platform (Railway) for app + DB; full control over the runtime and the database.
- Prisma gives strong typed data access and migrations.
- No reliance on Supabase-specific features.

Cons:
- Auth must be assembled and maintained manually (more surface area, more risk).
- More infrastructure to wire up than Option A; slower initial velocity.

### Option C — Python backend (FastAPI) + separate JS frontend

Backend: FastAPI (Python) for API, AI orchestration, Stripe webhooks; deployed on Railway.
Frontend: separate Next.js/React app on Vercel.
Database: Postgres via SQLAlchemy/Prisma.

Pros:
- Python is strong for AI orchestration and is familiar from the legacy project's domain.
- Clear separation of frontend and backend.

Cons:
- Two languages and two deploy targets — more context-switching, slower Claude-assisted iteration.
- Reintroduces a split architecture similar in spirit to the legacy system we are deliberately leaving behind.
- More glue code (API contracts, CORS, auth across boundaries).

---

## 3. Decision

Recommended and chosen: Option A — Next.js (App Router, TypeScript) + Supabase + Stripe, with a provider-agnostic AI SDK.

Rationale:
- Single TypeScript codebase maximizes development speed with Claude and keeps web, cabinet, and admin unified.
- Supabase removes most backend/auth/storage boilerplate while remaining standard Postgres, so we are not locked in at the data layer.
- First-class support for all required deploy targets (Vercel + Supabase primary; Railway possible).
- Clean, modern foundation that scales from MVP to production without an early rewrite.

---

## 4. How this maps to the planned modules

- web — Next.js public site (SSR/SSG, SEO, case studies, onboarding entry).
- client-cabinet — Next.js authenticated routes backed by Supabase Auth + RLS.
- ai — server-side AI route handlers using the AI SDK, with guardrails enforced in code.
- payments — Stripe Checkout + webhook route handlers; tariffs and consent persisted in Postgres.
- admin — Next.js admin routes with role-based access.
- database — Supabase Postgres with migrations and Row Level Security.
- backend — Next.js route handlers / server actions (no separate service initially).
- app / support — shared application shell and internal support tooling within the same codebase.

---

## 5. Constraints honored (explicit)

- No legacy code carried over.
- No legacy agents, orchestration layer, or Telegram logic carried over.
- Railway and the database are NOT connected or provisioned yet.
- This document is an architectural decision and documentation only — no infrastructure changes performed.

---

## 6. Next steps (not executed here)

1. Initialize the Next.js (TypeScript) project skeleton in the repository.
2. Define the data model and Supabase schema (draft, no provisioning).
3. Specify the AI guardrail rules in code-first form (carried over as intent, not as legacy code).
4. Owner to provision Supabase and choose deploy target when ready.
