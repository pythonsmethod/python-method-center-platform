# MVP_BUILD_PLAN_V1

> Status: Draft v1
> Scope: Step-by-step build plan for the MVP of the web-first platform.
> Project / platform name: **Python Method**
> Slogan (meaning formula, not legal name): «Реабилитация без границ»
> This document is a build plan only. No code, no Issues, no changes to existing documents.

---

## 1. Purpose

This document defines the **ordered plan** for assembling the MVP of the Python Method web-first platform. It describes what is in scope, what is out of scope, the build phases, the source-of-truth documents per phase, technical dependencies, and the gates around Supabase and Stripe. It also defines the minimal journeys for Client, Karen, Support/Anna and Admin, and what must exist before the first paying client.

This plan does not introduce architecture decisions. It sequences decisions already recorded in the referenced documents.

### Source documents
- TECH_STACK_DECISION_V1
- WEB_ARCHITECTURE_V1
- DATA_MODEL_V1
- SUPABASE_SCHEMA_V1
- NEXTJS_STRUCTURE_V1
- ACCESS_CONTROL_V1
- AUTHORITY_MATRIX_V1
- AI_GUARDRAILS_V1
- Payment Architecture
- Client Cabinet Architecture
- Admin Panel Architecture
- Support System Architecture
- MVP Launch Checklist

---

## 2. What is IN the MVP

- Public website (informational pages, offer/legal pages, entry CTA).
- Account / authentication (one person = one account = one permanent case).
- Explicit, logged consent to the offer (Audit Log as canonical source of consent).
- Client cabinet: case overview, document upload, message/communication window.
- Free one-time preliminary assessment (manual repeat only with Karen/admin permission).
- Two paid products: Support 5 weeks and Support 15 weeks.
- Payment flow for the two paid products.
- Karen workspace: case review, status, red-flag handling, Karen Review records.
- **Red-flag event workflow (MVP-required, not deferred):** immediate AI client response, red_flag_event creation, and dual human routing — **physical/medical → Karen**, **psychological/crisis → Anna/Support** (RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1). Includes a Karen urgent review queue and an Anna/Support crisis queue. `requires_immediate_review` is a transient marker; only Karen sets durable case urgency/status/route.
- Support/Anna workspace (admin/support combined at MVP level).
- Guarded AI interaction (client-facing AI + Karen-assistant AI) within AI_GUARDRAILS_V1 boundaries.
- Audit Log for all consent, case-status, escalation, and access-sensitive actions.

## 3. What is NOT in the MVP

- Legacy code, legacy agents, Telegram logic (excluded permanently from this project).
- Any oncology/medical claims, diagnosis, treatment, result/remission guarantees.
- Automatic re-assessment (re-run only manual, with permission).
- Self-service role management or permission changes by clients.
- Advanced analytics dashboards, reporting, marketing automation.
- Multi-case per person, team seats, or organisation accounts.
- AI making decisions, setting urgency, or acting without escalation.
- Refund self-service automation beyond the minimal supported path.
- Anything requiring Railway/DB provisioning outside the agreed stack.

---

## 4. Build sequence (phases overview)

| Phase | Name | Gate |
|---|---|---|
| 0 | Repository and foundation freeze | — |
| 1 | Next.js skeleton | — |
| 2 | Public website | Pre-Supabase |
| 3 | Supabase / Auth foundation | Supabase ON |
| 4 | Client cabinet MVP | Supabase ON |
| 5 | Document upload and case workspace | Supabase ON |
| 6 | Payment flow | Stripe ON |
| 7 | Karen workspace | Supabase ON |
| 8 | Support / Admin MVP | Supabase ON |
| 9 | AI guarded interaction MVP | Supabase ON |
| 10 | Launch readiness audit | Pre-launch |

---

## 5. Dependency gates

### 5.1 What CAN be done before Supabase is connected
- Repository structure, foundation freeze, documentation.
- Next.js skeleton, routing structure, layouts, shared components.
- Public website pages and static legal/offer pages (display only).
- UI states and placeholders that do not read/write real user data.
- Access-rule mapping in middleware structure (without live sessions).

### 5.2 What CANNOT be done before Supabase is connected
- Real account creation, authentication, sessions.
- Persisting consent, cases, case periods, assessments, messages.
- Document upload storage tied to a real account.
- Any Audit Log writes for real users.
- Karen Review / case-status persistence.

### 5.3 What CAN be done before Stripe is connected
- Product presentation pages (Support 5w, Support 15w) as information.
- Checkout UI scaffolding with non-functional / disabled payment action.
- Payment-result page structures and post-payment routing design.

### 5.4 What CANNOT be done before Stripe is connected
- Real charges, real payment confirmation, real refunds.
- Activating a paid case period based on a real payment event.
- Marking a client as "active client" via a real payment.

---

## 6. Phases (detail)

### Phase 0 — Repository and foundation freeze
- **Goal:** Lock the foundation and brand identity before build starts.
- **Result:** Frozen docs set; confirmed name = Python Method, slogan = «Реабилитация без границ».
- **Input documents:** All foundation docs, BRAND_IDENTITY_V1, TECH_STACK_DECISION_V1.
- **Can do:** Confirm structure, naming, constraints; tag a foundation baseline.
- **Cannot do:** Start app code; change architecture meaning.
- **Done criterion:** Foundation and identity confirmed and committed; no open identity contradictions.

### Phase 1 — Next.js skeleton
- **Goal:** Establish the App Router structure with no business logic.
- **Result:** Empty but navigable route tree, layouts, middleware placeholders.
- **Input documents:** NEXTJS_STRUCTURE_V1, WEB_ARCHITECTURE_V1, TECH_STACK_DECISION_V1.
- **Can do:** Routes, layouts, shared components, access-check placeholders.
- **Cannot do:** Connect Supabase/Stripe; persist data; real auth.
- **Done criterion:** All planned route groups exist and render placeholder content per NEXTJS_STRUCTURE_V1.

### Phase 2 — Public website
- **Goal:** Deliver the public-facing site and legal/offer pages.
- **Result:** Public routes, offer/legal pages, entry CTA toward signup.
- **Input documents:** WEB_ARCHITECTURE_V1, NEXTJS_STRUCTURE_V1, Offer/Legal docs.
- **Can do:** Public content, product info (free assessment, Support 5w/15w), legal display.
- **Cannot do:** Real signup/auth; charge; store data.
- **Done criterion:** Public site complete; CTA points to auth entry; no medical/result claims present.

### Phase 3 — Supabase / Auth foundation
- **Goal:** Bring authentication and the physical data model online.
- **Result:** Auth, account creation, one person = one account = one permanent case, consent + Audit Log writes.
- **Input documents:** SUPABASE_SCHEMA_V1, DATA_MODEL_V1, ACCESS_CONTROL_V1, AUTHORITY_MATRIX_V1.
- **Can do:** Auth, account/case creation, consent logging, Audit Log foundation.
- **Cannot do:** Charge; expose Karen/Admin data to clients; bypass access rules.
- **Done criterion:** A user can register, consent (logged immutably), and get one permanent case per ACCESS_CONTROL_V1.

### Phase 4 — Client cabinet MVP
- **Goal:** Give the client their authenticated workspace.
- **Result:** Cabinet with case overview, communication window, profile basics.
- **Input documents:** Client Cabinet Architecture, ACCESS_CONTROL_V1, NEXTJS_STRUCTURE_V1.
- **Can do:** Client-scoped reads/writes per access rules; communication window.
- **Cannot do:** View other clients' data; change own role/permissions; access Karen/Admin zones.
- **Done criterion:** Client sees only their own case/data; access matrix honored.

### Phase 5 — Document upload and case workspace
- **Goal:** Enable case documents and the free preliminary assessment intake.
- **Result:** Document upload (client-scoped), case workspace, one-time free assessment intake.
- **Input documents:** DATA_MODEL_V1, ACCESS_CONTROL_V1, Client Cabinet Architecture, Safety Protocol.
- **Can do:** Upload/store client documents; record one free assessment per client.
- **Cannot do:** Auto re-assessment; AI diagnosis/treatment; expose documents cross-client.
- **Done criterion:** Client can upload documents and submit one free assessment; repeat requires Karen/admin permission.

### Phase 6 — Payment flow
- **Goal:** Enable paid products via Stripe.
- **Result:** Working checkout for Support 5w and Support 15w; paid case period activation on confirmed payment.
- **Input documents:** Payment Architecture, SUPABASE_SCHEMA_V1, DATA_MODEL_V1 (Subscription/Payment kept separate from Case Period).
- **Can do:** Real charge, payment confirmation, activate paid period, log to Audit.
- **Cannot do:** Promise results/remission; merge Payment with Case Period; auto-refund beyond supported path.
- **Done criterion:** A client can pay for a product and have the corresponding period activated, with payment and consent traceable in Audit Log.

### Phase 7 — Karen workspace
- **Goal:** Give Karen the single decision surface for cases.
- **Result:** Case review, status changes, red-flag handling, Karen Review records, and a **Karen urgent review queue** (`/karen/urgent`) surfacing physical/medical red_flag_events.
- **Input documents:** AUTHORITY_MATRIX_V1, AI_GUARDRAILS_V1, RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1, Safety Protocol, ACCESS_CONTROL_V1.
- **Can do:** Karen views cases, sets status/urgency, creates Karen Reviews, handles escalations.
- **Cannot do:** Let AI decide for Karen; let Support/Admin make case decisions.
- **Done criterion:** Karen is the single source of case decisions; urgency/criticality set only by Karen; physical/medical red_flag_events route to the Karen urgent queue; all decisions audited.

### Phase 8 — Support / Admin MVP
- **Goal:** Provide Support/Anna operational tools at MVP level.
- **Result:** Support workspace (Anna = admin/support at MVP), tickets, user assistance, limited admin, and an **Anna/Support crisis queue** (`/support/crisis`) surfacing psychological/crisis red_flag_events routed to support.
- **Input documents:** Support System Architecture, Admin Panel Architecture, ACCESS_CONTROL_V1, AUTHORITY_MATRIX_V1.
- **Can do:** Handle Support Tickets (technical/organizational), assist users, perform permitted admin tasks.
- **Cannot do:** Make case decisions; change legal texts or AI guardrails without authority; permanent deletions outside policy.
- **Done criterion:** Support/Anna can resolve tickets and perform MVP admin tasks within their access scope; case decisions remain with Karen.

### Phase 9 — AI guarded interaction MVP
- **Goal:** Enable AI within strict guardrails.
- **Result:** Client-facing AI and Karen-assistant AI operating per AI_GUARDRAILS_V1.
- **Input documents:** AI_GUARDRAILS_V1, RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1, Safety Protocol, AUTHORITY_MATRIX_V1, ACCESS_CONTROL_V1.
- **Can do:** AI assists, uses center knowledge, says "I don't know" when data is missing, responds immediately to red flags, creates red_flag_event, routes physical/medical to Karen and psychological/crisis to Anna/Support, hands off to humans.
- **Cannot do:** Diagnose, treat, promise results/remission, decide for Karen, invent facts, set urgency.
- **Done criterion:** AI behavior matches AI_GUARDRAILS_V1 Action → Allowed/Escalate/Forbidden table; dual red-flag routing (Karen vs Anna/Support) per RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1 verified; AI never sets durable case urgency/status; escalation and human override paths verified.

### Phase 10 — Launch readiness audit
- **Goal:** Confirm the MVP is safe and complete enough for the first paying client.
- **Result:** Signed-off launch readiness against the MVP Launch Checklist.
- **Input documents:** MVP Launch Checklist, all phase outputs.
- **Can do:** Verify access matrix, consent logging, payment traceability, AI guardrails, red-flag escalation.
- **Cannot do:** Launch with unresolved guardrail, consent, or access-control gaps.
- **Done criterion:** All checklist items pass; no open Constitution / AI_GUARDRAILS / ACCESS_CONTROL contradictions.

---

## 7. Minimal role journeys

### 7.1 Minimal client path (site → cabinet)
Public site → product/offer page → signup/auth → consent (logged) → permanent case created → cabinet → upload documents → free preliminary assessment → (optional) pay for Support 5w/15w → active client.

### 7.2 Minimal Karen path
Login → Karen workspace → review case/documents/assessment → set status/urgency → create Karen Review → handle red-flag escalations → respond / hand decisions back into the case (all audited).

### 7.3 Minimal Support/Anna path
Login → Support workspace → receive Support Ticket → assist with technical/organizational issue → escalate case-meaning items to Karen → perform permitted MVP admin tasks → close ticket (audited where required).

### 7.4 Minimal Admin path
Login → Admin area → manage users/operational settings within authority → review Audit Log (read) → no case decisions, no unauthorized legal/guardrail changes, no permanent deletions outside policy.

---

## 8. Before the first paying client (must be ready)
- Auth + one person = one account = one permanent case.
- Explicit consent captured immutably in Audit Log.
- Client cabinet with document upload and communication window.
- Free one-time preliminary assessment.
- Working payment for Support 5w / 15w with audited activation.
- Karen workspace with case decisions and red-flag escalation.
- AI operating strictly within AI_GUARDRAILS_V1.
- Access matrix enforced per ACCESS_CONTROL_V1.

## 9. Can be left for after launch
- Advanced reporting/analytics dashboards.
- Expanded admin tooling and automation.
- Refund automation beyond the minimal supported path.
- Knowledge Entry approval workflows beyond MVP minimum.
- UX polish, additional content, and non-critical optimizations.

---

## 10. Age policy and Care Recipient (MVP-required)

Per **AGE_AND_CARE_RECIPIENT_POLICY_V1**, the following are **MVP-required and not deferred**:

- The **21+ age gate** for independent registration / acting as the responsible Client.
- The onboarding **“Who is this case for?”** question (Myself / My child / Dependent) and the conditional **Care Recipient form**.
- The **Client vs Care Recipient** data separation and the Case link (`case_for`, `self_case`, Client owns account / consent / payment / responsibility).
- Enforcement that a minor (or person under another responsibility) is never treated as the responsible decision-maker; support is provided only through an adult responsible Client.
- Auditable consent, offer-acceptance, payment, and responsibility-acknowledgment actions by the Client.

See AGE_AND_CARE_RECIPIENT_POLICY_V1.md for the full policy.

---

## 11. Self-check

**Against the Constitution**
- No oncology/medical claims, no diagnosis, no treatment, no result/remission guarantees anywhere in the plan. ✔
- Center framed as rehabilitation/recovery support, not a medical organization. ✔
- One person = one account = one permanent case preserved (Phase 3). ✔
- Karen is the single source of case decisions; urgency/criticality only by Karen (Phase 7). ✔
- Consent explicit, logged, immutable; Audit Log canonical (Phases 3, 6). ✔
- Brand identity correct: name = Python Method; slogan = «Реабилитация без границ» (not used as legal/platform name). ✔

**Against AI_GUARDRAILS_V1**
- AI never diagnoses, treats, promises results, decides for Karen, or invents facts (Phase 9). ✔
- AI says "I don't know" on missing data, escalates red flags, hands off to humans. ✔
- Client-facing AI and Karen-assistant AI separated, each with its own source of truth. ✔
- Phase 9 done-criterion ties directly to the Action → Allowed/Escalate/Forbidden table. ✔

**Against ACCESS_CONTROL_V1**
- Clients see only their own data; cross-client exposure forbidden (Phases 4, 5). ✔
- Role zones (Client / Karen / Support-Anna / Admin / AI service / System) respected per access matrix. ✔
- Audit Log writes for consent, case-status, escalation, payment, and access-sensitive actions. ✔
- No self-service permission/role changes by clients; no permanent deletions outside policy. ✔

**Open contradictions:** None identified at plan level. Physical implementation must re-verify consent retention against legal text and privacy policy before persisting (per DATA_MODEL_OPEN_DECISIONS_V1).

---

*End of MVP_BUILD_PLAN_V1.*
