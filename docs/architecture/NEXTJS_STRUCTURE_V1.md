# NEXTJS_STRUCTURE_V1

**Status:** Architectural document — describes the structure of the Next.js web-first application for the center / platform Python Method.
**Scope:** Architecture only. **No code is written, no application files are created, no dependencies are installed, Supabase is not connected, and Stripe is not connected.** The project tree below is illustrative.

**Sources of grounding:**
- TECH_STACK_DECISION_V1 (Next.js + Supabase + Stripe)
- WEB_ARCHITECTURE_V1, DATA_MODEL_V1, SUPABASE_SCHEMA_V1
- ACCESS_CONTROL_V1, AUTHORITY_MATRIX_V1, AI_GUARDRAILS_V1
- Client Cabinet Architecture, Admin Panel Architecture, Support System Architecture, Payment Architecture

---

## 1. Principles

- **App Router** (Next.js `app/` directory) with **route groups** to separate public, authenticated, and role-scoped areas without leaking URL structure.
- **Server-first:** server components and server actions for data access; the client never holds privileged logic.
- **Access enforced in depth:** middleware does coarse gating; layouts + server-side checks enforce role scope; the database (per SUPABASE_SCHEMA_V1 access implications) is the final authority. The UI never becomes the source of truth for permissions.
- **AI boundaries respected:** AI surfaces are UI affordances only; they never expose decision authority. Red-flag UX is always reachable.
- **Web-first:** no Telegram, no legacy structure.

---

## 2. Route groups (App Router)

The app uses route groups to apply different layouts and access rules:

- `(public)` — public marketing/trust/legal site; no auth.
- `(auth)` — login, registration entry, password reset (auth handled by Supabase Auth; the app never stores passwords).
- `(client)` — client cabinet; requires client auth.
- `(karen)` — Karen workspace; requires Karen role.
- `(support)` — Support/Anna workspace; requires Support role.
- `(admin)` — Admin panel; requires Admin role.

Payment and legal surfaces live partly in `(public)` (legal, pricing) and partly in `(client)` (checkout, billing), per Payment Architecture.

---

## 3. Routes by area

### 3.1 Public website routes — `(public)`
- `/` — landing
- `/about` — center, trust, boundaries (no result/remission promises, per WEB_ARCHITECTURE_V1)
- `/how-it-works`
- `/pricing` — products: free preliminary assessment, Support 5w, Support 15w
- `/contact`
- These pages may state what the site is allowed to promise and never imply cure/diagnosis.

### 3.2 Auth routes — `(auth)`
- `/login`
- `/register` — registration entry (account creation performed by the user via Supabase Auth)
- `/reset-password`
- `/auth/callback` — Supabase Auth callback (route handler)

### 3.3 Client cabinet routes — `(client)` (requires client auth)
- `/cabinet` — dashboard / next step
- `/cabinet/onboarding` — onboarding flow
- `/cabinet/case` — own case status (read-only, status level)
- `/cabinet/documents` — own uploads + request archival
- `/cabinet/messages` — unified contact window (Message + Support Ticket presented as one UX)
- `/cabinet/assessment` — request one-time free preliminary assessment
- `/cabinet/billing` — own payments/subscription
- `/cabinet/ai` — client-facing AI surface (navigation/support only)

### 3.4 Karen workspace routes — `(karen)` (requires Karen role)
- `/karen` — case queue (critical/red-flag at top)
- `/karen/urgent` — **Karen urgent review queue**: physical/medical red_flag_events with `requires_immediate_review` at top; Karen-only. Karen alone assigns durable `case_urgency` / `case_status` / support route from here (RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1).
- `/karen/case/[caseId]` — two-window view: client window + Karen-assistant AI window
- `/karen/case/[caseId]/review` — create Karen Review (decision)
- `/karen/case/[caseId]/documents` — case documents (read for case work)

### 3.5 Support/Anna workspace routes — `(support)` (requires Support role)
- `/support` — ticket queue
- `/support/crisis` — **Anna/Support crisis queue**: psychological/crisis red_flag_events routed to support; Support-only. Support responds to crisis routing but makes **no** case-level decisions and sets **no** durable urgency/status/route (Karen-only).
- `/support/tickets/[ticketId]` — technical/organizational handling
- `/support/payments` — payment/refund operations
- `/support/accounts` — account status / block per policy
- (No case-substance / medical interpretation surfaces.)

### 3.6 Admin panel routes — `(admin)` (requires Admin role)
- `/admin` — overview
- `/admin/knowledge` — Knowledge Entries (approve)
- `/admin/legal` — legal text governance
- `/admin/guardrails` — AI guardrail governance
- `/admin/access` — access/permission settings
- `/admin/audit` — Audit Log (read + grant access; never edit/delete)

### 3.7 Payment routes
- `(public)/pricing` — public pricing
- `(client)/cabinet/billing/checkout` — checkout (Stripe handled externally; no card data in app UI)
- `/api/webhooks/stripe` — payment webhook (route handler; System-only)

### 3.8 Legal routes — `(public)`
- `/legal/offer` — Оферта
- `/legal/privacy`
- `/legal/terms`

---

## 4. API route handlers — `app/api/*`
- `/api/auth/callback` — Supabase Auth callback (System)
- `/api/webhooks/stripe` — payment events (System-only; verifies signature)
- `/api/ai/client` — client-facing AI gateway (navigation/support; no case decisions)
- `/api/ai/karen` — Karen-assistant AI gateway (proposals only, with confidence)
- `/api/escalation/red-flag` — red-flag escalation intake (auto: emergency guidance + reassure + mark critical for Karen)

Route handlers validate role server-side and emit Audit Log events for sensitive actions (per SUPABASE_SCHEMA_V1).

---

## 5. Server actions / service-layer boundaries
- **Service layer** (`lib/services/*`, conceptual) encapsulates all privileged data access; UI calls server actions, never the database directly.
- **Boundaries:** `caseService`, `reviewService` (Karen-owned writes), `paymentService` (status reads + refund execution by Support), `knowledgeService` (Admin approval), `aiService` (proposals/escalation only), `auditService` (append-only writer; no edits).
- Every decision-bearing action resolves to the correct Decision Owner (per AUTHORITY_MATRIX_V1) before persistence.

---

## 6. Shared components, layouts, middleware

### 6.1 Layouts
- `(public)/layout` — marketing chrome.
- `(auth)/layout` — minimal auth chrome.
- `(client)/layout` — cabinet shell + client-facing AI affordance + always-visible red-flag/help path.
- `(karen)/layout` — two-window workspace shell.
- `(support)/layout` — support shell.
- `(admin)/layout` — admin shell.

### 6.2 Shared components (`components/*`, conceptual)
- Navigation, status badges, document list, message thread, payment status, confidence indicator (for Karen view), red-flag banner/emergency CTA, consent display.

### 6.3 Middleware / access checks
- `middleware.ts` (conceptual) does coarse gating: unauthenticated → public/auth only; authenticated → role-appropriate group.
- Role/scope is re-verified in server components and service layer; the database access rules (SUPABASE_SCHEMA_V1) are final.
- Active-vs-inactive client distinctions are enforced server-side, not by UI alone.

---

## 7. Error and red-flag UX boundaries
- **Error UX:** `error.tsx` / `not-found.tsx` per route group; errors never leak privileged data or other-tenant content.
- **Red-flag UX (dual routing):** a red-flag detected in any client message triggers (automatically) an emergency-guidance surface that responds immediately, advises urgent professional help, briefly explains the concern (no diagnosis), and confirms the message reached the responsible human team. The system creates a red_flag_event and routes it: **physical/medical → Karen urgent review queue (`/karen/urgent`)**, **psychological/crisis → Anna/Support crisis queue (`/support/crisis`)**. `requires_immediate_review` is a transient priority marker; **only Karen** sets durable case urgency/status/route. This path is always reachable, is never blocked by paywalls or onboarding state, and is audited (per AI_GUARDRAILS_V1 / RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1).

---

## 8. Example project tree (illustrative — not created)

```
app/
  (public)/
    layout.tsx
    page.tsx                  # /
    about/page.tsx
    how-it-works/page.tsx
    pricing/page.tsx
    contact/page.tsx
    legal/
      offer/page.tsx
      privacy/page.tsx
      terms/page.tsx
  (auth)/
    layout.tsx
    login/page.tsx
    register/page.tsx
    reset-password/page.tsx
  (client)/
    layout.tsx                # cabinet shell + red-flag path
    cabinet/
      page.tsx
      onboarding/page.tsx
      case/page.tsx
      documents/page.tsx
      messages/page.tsx
      assessment/page.tsx
      ai/page.tsx
      billing/
        page.tsx
        checkout/page.tsx
  (karen)/
    layout.tsx                # two-window workspace
    karen/
      page.tsx
      case/[caseId]/
        page.tsx
        review/page.tsx
        documents/page.tsx
  (support)/
    layout.tsx
    support/
      page.tsx
      tickets/[ticketId]/page.tsx
      payments/page.tsx
      accounts/page.tsx
  (admin)/
    layout.tsx
    admin/
      page.tsx
      knowledge/page.tsx
      legal/page.tsx
      guardrails/page.tsx
      access/page.tsx
      audit/page.tsx
  api/
    auth/callback/route.ts
    webhooks/stripe/route.ts
    ai/client/route.ts
    ai/karen/route.ts
    escalation/red-flag/route.ts
components/
  navigation/  status/  documents/  messages/  payments/
  ai/  red-flag/  consent/
lib/
  services/    # caseService, reviewService, paymentService, knowledgeService, aiService, auditService
  access/      # role + scope helpers (server-side)
middleware.ts
```

---

## 9. Route access mapping

| Route area | Public | Client auth | Active client | Karen | Support/Anna | Admin | System only |
|---|---|---|---|---|---|---|---|
| `(public)/*`, `/legal/*`, `/pricing` | Yes | – | – | – | – | – | – |
| `(auth)/*` | Yes (entry) | – | – | – | – | – | – |
| `/cabinet`, onboarding, case, documents, messages, billing, ai | No | Yes | – | – | – | – | – |
| `/cabinet/assessment`, active accompaniment messaging | No | Yes | Yes (active) | – | – | – | – |
| `/cabinet/billing/checkout` | No | Yes | – | – | – | – | – |
| `/karen/*` (incl. `/karen/urgent`) | No | – | – | Yes | – | – | – |
| `/support/*` (incl. `/support/crisis`) | No | – | – | – | Yes | – | – |
| `/admin/*` | No | – | – | – | – | Yes | – |
| `/admin/audit` (read+grant) | No | – | – | scoped read | scoped read | Yes | – |
| `/api/webhooks/stripe`, `/api/auth/callback` | – | – | – | – | – | – | Yes |
| `/api/escalation/red-flag` | – | Yes (triggered) | – | receives | – | – | System routes |

Inactive clients access history + reactivation only; active-client-only surfaces (active accompaniment) are gated server-side.

---

## 10. Age policy onboarding and Care Recipient UI

Per **AGE_AND_CARE_RECIPIENT_POLICY_V1**, the onboarding UI must implement:

- A required onboarding question — “Who is this case for?” — with options: **Myself**, **My child**, **A dependent / another person under my responsibility**.
- If **My child** or **Dependent** is selected, a conditional **Care Recipient form** opens (full name, date of birth, age, relationship to client, country / location, reason for representation, representative confirmation, data consent, responsibility acknowledgment).
- If **Myself** is selected, the case is a self case (`self_case` flag) and no Care Recipient form is shown.
- An age gate ensuring only users age 21+ can register and proceed as the responsible Client; under-21 users are routed to the adult responsible-Client path.
- UI must make clear that account, consent, payment, and communication are owned by the adult Client; the Care Recipient is never the responsible actor.

See AGE_AND_CARE_RECIPIENT_POLICY_V1.md for the full policy.

---

## 11. Self-check against ACCESS_CONTROL_V1, AI_GUARDRAILS_V1 and WEB_ARCHITECTURE_V1

| Requirement | Source | Status |
|---|---|---|
| Public site promises no result/remission/cure | WEB_ARCHITECTURE_V1 | **HELD** — public pages constrained |
| Role-scoped areas separated; least privilege | ACCESS_CONTROL_V1 | **HELD** — route groups + server checks + DB final |
| Client sees own data only | ACCESS_CONTROL_V1 | **HELD** — `(client)` scoped, no cross-tenant routes |
| Active vs inactive client distinction | ACCESS_CONTROL_V1 | **HELD** — §9 server-gated |
| Karen workspace two-window; Karen owns decisions | Cabinet/Authority | **HELD** — `/karen/case/[caseId]` + review |
| Support no case substance | ACCESS_CONTROL_V1 | **HELD** — support routes organizational only |
| Admin governance + Audit Log read/grant, no edit | ACCESS_CONTROL_V1 | **HELD** — `/admin/audit` read+grant |
| AI is UI affordance only; never decides/guesses | AI_GUARDRAILS_V1 | **HELD** — `/api/ai/*` proposals/support only |
| Two AI types distinguished | AI_GUARDRAILS_V1 | **HELD** — client vs karen AI gateways |
| Red-flag path always reachable + audited | AI_GUARDRAILS_V1 / Safety | **HELD** — §7 + `/api/escalation/red-flag` |
| No card data in app UI; Stripe external | Payment Arch / privacy | **HELD** — checkout external, webhook System-only |
| Auth via Supabase; app stores no passwords | ACCESS_CONTROL_V1 | **HELD** — `(auth)` + callback handler |

**No contradictions found** with ACCESS_CONTROL_V1, AI_GUARDRAILS_V1, or WEB_ARCHITECTURE_V1. This document is architectural only — no code, no app files, no dependencies, no Supabase/Stripe connection.

After this document, the Next.js application structure is defined and ready for a future, separately-authorized implementation step.

---

## 12. Account management and data deletion UI/API (synchronized with DATA_RETENTION_AND_DELETION_POLICY_V1)

DATA_RETENTION_AND_DELETION_POLICY_V1 is canonical for archive, deletion, account closure, and case closure. The following UI/API requirements extend §3 (routes) and §4 (API handlers). No code is written here; routes/handlers are described conceptually.

### 12.1 Client Cabinet → Account Management

Add an **Account Management** area in the client cabinet, e.g. `(client)/cabinet/account`. It is the self-service surface where the authenticated adult Client manages their account and exercises the deletion right. Only the account owner can access it; it never exposes other clients' data.

### 12.2 Delete account and data flow (required UX sequence)

The Account Management area must implement a **“Delete account and data”** action that runs this ordered, irreversible flow:

1. **Delete account and data button** — entry point in `(client)/cabinet/account`.
2. **Confirmation screen** — a dedicated screen (e.g. `(client)/cabinet/account/delete`) that the client must deliberately reach; never a single accidental click.
3. **Consequence explanation** — clearly states that deletion removes the account, all cases (active and archived), questionnaires/assessment inputs, and uploaded documents; that access will be revoked; and that the action is permanent and that returning later requires a new account and new onboarding.
4. **Deletion reason field** — collects the client's reason (per policy; never used to block the deletion right).
5. **Final confirmation** — an explicit confirm step before the cascade runs.
6. **Access revocation** — on confirmation the session/account is invalidated and the client is signed out; subsequent auth for that account fails.

A server-side handler (e.g. `/api/account/delete`, System/owner-scoped) performs the cascade and writes the deletion-event audit row; it validates that the requester is the authenticated account owner. The UI never performs the deletion client-side.

### 12.3 Archived cases hidden from active views but recoverable

Active operational queues and work views (Karen `/karen`, `/karen/urgent`; Support `/support`; case lists) must **exclude archived cases by default** (cases archived after 5 years of inactivity). Archived cases remain **recoverable by authorized staff** through an explicit, audited recovery affordance (e.g. an "archived/recover" view available only to authorized roles, server-gated per ACCESS_CONTROL_V1). Hiding is a visibility filter, not a delete; recovery never bypasses a client's confirmed deletion.

### 12.4 Self-check addendum

- Deletion is self-service, owner-only, confirmed, reasoned, and ends in access revocation. ✔
- Archived cases excluded from active views; recoverable only by authorized staff; server-enforced. ✔
- No card/financial data involved; no client-side deletion authority; cascade + audit are server-side. ✔

See DATA_RETENTION_AND_DELETION_POLICY_V1.md for the full canonical policy.
