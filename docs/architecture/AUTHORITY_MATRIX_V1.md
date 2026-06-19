# AUTHORITY_MATRIX_V1

**Status:** Architectural document — defines the authority matrix of the web-first platform of the center / platform Python Method.
**Scope:** Architecture only. No code, no SQL, no runtime logic. This document states *who may do what, who owns each decision, and what must be recorded in the Audit Log.*

**Sources of grounding (only these):**
- Конституция Центра
- DATA_MODEL_V1
- DATA_MODEL_OPEN_DECISIONS_V1
- AI_GUARDRAILS_V1
- WEB_ARCHITECTURE_V1
- Client Cabinet Architecture
- Admin Panel Architecture
- Support System Architecture
- Payment Architecture
- Safety Protocol (Протокол безопасности и красных флагов)
- Offer / Legal documents (Оферта)

This document does **not** rely on any old project or Telegram logic. It is web-first only.

---

## 1. Legend

- **Allowed** — the role may perform the action on its own.
- **Propose** — the role may prepare/draft, but the action takes effect only after the Decision Owner approves.
- **Confirm** — the action requires confirmation by another named role before it takes effect.
- **No** — the role may not perform the action.
- **Auto** — the System executes mechanically once preconditions are met; it makes no judgment.
- **Decision Owner** — the single role accountable for the decision behind the action.
- **Audit Required** — whether the action must be written to the immutable Audit Log (canonical per DATA_MODEL_OPEN_DECISIONS_V1).

**Roles:** Client · Client-facing AI · Karen-assistant AI · Karen · Support/Anna · Admin · System.

> Throughout this matrix, **"AI" never decides a case and never guesses** (per AI_GUARDRAILS_V1). Every case decision is owned by Karen. Consent fact is anchored in the Audit Log and is never created or overridden by AI.

---

## 2. Role definitions

### 2.1 Client
- **Can:** create own account; give/withhold consent; complete onboarding; upload documents; request the one-time free preliminary assessment; ask questions; pay; renew; decide whether to follow recommendations; request deletion/archival of own documents.
- **Cannot:** access other clients' data; interpret own case as a decision; set case status/urgency; approve knowledge; issue refunds; access the Audit Log; change legal texts or guardrails.
- **Decisions it owns:** participation, payment, renewal, whether to follow recommendations, consent.
- **Decisions it cannot make:** anything about case state, route, conclusions, urgency.
- **Needs confirmation from:** Support/Karen for non-standard payment or document deletion.
- **Audited actions:** registration, consent, uploads, payment, deletion requests.

### 2.2 Client-facing AI
- **Can:** navigate, organize, inform, give calm emotional support (no promises); send approved center materials; remind about missing data; raise red-flag escalations automatically.
- **Cannot:** diagnose, interpret tests/state, recommend, set route/urgency, answer case questions, promise results/remission, decide for Karen, create/override consent, guess data.
- **Decisions it owns:** none (it owns no case or business decision).
- **Needs confirmation from:** Karen for anything case-related (escalates instead of acting).
- **Audited actions:** red-flag escalations it triggers; escalations to Karen.

### 2.3 Karen-assistant AI
- **Can (for Karen only):** read/translate/structure documents; extract indicators; build summaries with confidence levels; prepare draft replies and draft conclusions.
- **Cannot:** make case decisions; send case answers to the client without Karen; guess/fabricate values; set status/urgency.
- **Decisions it owns:** none — outputs are proposals for Karen.
- **Needs confirmation from:** Karen for everything decision-bearing.
- **Audited actions:** none on its own; the Karen Review built on its proposals is audited.

### 2.4 Karen
- **Can:** review cases; create Karen Reviews; make recommendations/conclusions; set/change case status; set case urgency/criticality; approve or reject AI drafts; answer case questions; approve renewals/route changes; authorize a manual repeat assessment.
- **Cannot:** replace emergency services; change legal texts or AI guardrails alone (governance change); issue refunds as a payment operation (that is Support/Admin) though Karen may decide a refund is warranted.
- **Decisions it owns:** all case decisions, urgency, significance of new data, case status.
- **Needs confirmation from:** Admin/Support for the operational execution of payment refunds.
- **Audited actions:** Karen Reviews, status changes, urgency setting, case answers, route changes.

### 2.5 Support / Anna
- **Can:** resolve payment/login/upload/technical issues; handle non-standard payment situations; execute refunds (operationally); assist registration; block/unblock a user for technical/abuse reasons (per policy).
- **Cannot:** make case decisions; interpret state; answer case questions; set case status/urgency; approve knowledge; change legal texts or guardrails.
- **Decisions it owns:** technical/organizational resolutions; refund execution.
- **Needs confirmation from:** Karen for anything touching the case; Admin for governance-level changes.
- **Audited actions:** refunds, user blocks, account-affecting actions.

### 2.6 Admin
- **Can:** govern the platform; approve Knowledge Entries; change legal texts (Offer/legal) through governance; change AI guardrails through governance; configure access; grant/revoke Audit Log access; oversee blocks.
- **Cannot:** make case decisions for Karen; silently edit or delete the Audit Log (it is immutable); fabricate consent.
- **Decisions it owns:** governance — legal texts, guardrails, knowledge approval, access control.
- **Needs confirmation from:** appropriate governance/legal review for legal-text and guardrail changes.
- **Audited actions:** legal-text changes, guardrail changes, knowledge approvals, access/permission changes, Audit Log access grants.

### 2.7 System
- **Can:** execute mechanical actions once preconditions are met — record consent, store uploads, start a case period after valid payment, write Audit Log entries, surface statuses.
- **Cannot:** make any judgment, decision, or interpretation; alter or delete Audit Log entries; override a human.
- **Decisions it owns:** none — it is deterministic.
- **Audited actions:** it is the writer of the Audit Log; mechanical state changes it performs are themselves audited.

---

## 3. Authority Matrix

Legend per cell: **A**=Allowed, **P**=Propose (Karen/Admin approves), **C**=Confirm by another role, **No**=not permitted, **Auto**=mechanical execution, **–**=not applicable.

| Action | Client | Client-facing AI | Karen-assistant AI | Karen | Support/Anna | Admin | System | Decision Owner | Audit Required |
|---|---|---|---|---|---|---|---|---|---|
| Client registration | A (self) | No | No | No | Assist | No | Auto | Client | Yes |
| Consent to Offer | A | No | No | No | No | No | Auto (records) | Client | Yes |
| Document upload | A | No | No | No | Assist | No | Auto (stores) | Client | Yes |
| Document deletion / archival | Request | No | No | C (if case-relevant) | Execute (per policy) | Oversee | Auto | Karen (if case) / Client (own) | Yes |
| Preliminary assessment (one-time, free) | Request | No | P (prepare for Karen) | A (owns output) | No | No | Auto (triggers once) | Karen | Yes |
| Case creation | No | No | No | A | No | No | Auto (on conditions) | Karen | Yes |
| Start support period | No | No | No | A | No | No | Auto (after valid payment) | Karen | Yes |
| View messages | Own only | Read for navigation | Read for Karen | A | Tech context only | Oversight | Auto (serves) | – | View of case msgs: Yes |
| Reply to client | Ask | Organizational/support only | P (draft) | A (case replies) | Technical replies | No | Auto (delivers) | Karen (case) / Support (tech) | Case reply: Yes |
| Escalation to Karen | – | A (auto) | A (flag) | Receives | A | – | Auto (routes) | Karen | Yes |
| Red flag escalation | – | A (auto: direct to emergency + reassure + mark critical) | A (flag) | Receives critical | A | – | Auto (raises priority) | Karen (accompaniment) | Yes |
| Create Karen Review | No | No | P (draft material) | A | No | No | Auto (stores) | Karen | Yes |
| Change case status | No | No | No | A | No | No | Auto (applies) | Karen | Yes |
| Create Knowledge Entry | No | No | P (draft) | Propose | Propose | Propose | Auto (stores draft) | Admin (approval) | Yes |
| Approve Knowledge Entry | No | No | No | No | No | A | Auto (publishes) | Admin | Yes |
| Payment | A | No | No | No | Assist/non-standard | No | Auto (processes) | Client | Yes |
| Refund of payment | Request | No | No | Decide warranted | Execute | Oversee | Auto (processes) | Karen decides / Support executes | Yes |
| Technical support | Request | No | No | No | A | Oversight | Auto (logs) | Support | Account-affecting: Yes |
| Block user | No | No | No | Request | A (per policy) | A | Auto (applies) | Admin / Support (policy) | Yes |
| Change legal texts (Offer/legal) | No | No | No | No | No | A (governance) | Auto (versions) | Admin | Yes |
| Change AI guardrails | No | No | No | No | No | A (governance) | Auto (versions) | Admin | Yes |
| Access Audit Log | No | No | No | Read (case scope) | Read (scope) | A (grants/reads) | Writes only | Admin (grants) | Access grants: Yes |

---

## 4. Cross-cutting rules

- **Single case decision-owner:** every case action resolves to **Karen** as Decision Owner. AI may only propose; Support and Admin never decide a case.
- **Consent integrity:** consent is recorded by the System and anchored in the **Audit Log** as the canonical, immutable source; no role creates an independent or overriding consent record.
- **Immutability of the Audit Log:** no role — not even Admin — edits or deletes Audit Log entries; Admin only controls *access*, which is itself audited.
- **Governance separation:** legal texts and AI guardrails change only through Admin governance, never by Karen, Support, or AI acting alone.
- **Emergency primacy:** red-flag handling is automatic and overrides normal flow; AI directs to emergency help, reassures, and marks critical for Karen — Karen accompanies but never replaces emergency services.
- **No guessing:** wherever data is insufficient, the responsible AI says "I don't know" and escalates; it never fabricates values or decisions.

---

## 5. Self-check against the Constitution and AI_GUARDRAILS_V1

| Principle | Source | Status |
|---|---|---|
| Center = rehabilitation support, not medical org / no cure | Constitution | **HELD** — no role diagnoses or treats |
| No guarantee of result or remission | Constitution | **HELD** — not an action any role may take |
| Karen = single source of case decisions | Constitution / Roles | **HELD** — Decision Owner = Karen for all case actions |
| AI never decides or guesses; proposes, escalates | AI_GUARDRAILS_V1 | **HELD** — AI rows are Propose/No, never Allowed for case decisions |
| Two AI types with distinct authority | AI_GUARDRAILS_V1 | **HELD** — client-facing vs Karen-assistant rows differ |
| Consent explicit, logged, immutable; Audit Log canonical | DATA_MODEL_OPEN_DECISIONS_V1 / Guardrails | **HELD** — consent audited; Audit Log immutable |
| Safety above speed; emergency reaction real | Safety Protocol / Guardrails | **HELD** — red-flag row auto + critical |
| Human override always available | AI_GUARDRAILS_V1 | **HELD** — Karen/Support/Admin override AI; AI overrides no human |
| Governance of legal/guardrails is controlled | Constitution / Admin Arch | **HELD** — Admin-only, audited |
| Audit Log access is controlled and recorded | DATA_MODEL_V1 | **HELD** — access grants audited; System writes only |

**No contradictions found** with the Constitution or AI_GUARDRAILS_V1. The document is architectural only — no code, SQL, or runtime logic.

After this matrix, the platform's authority boundaries are defined and consistent with the data model, the guardrails, and the safety protocol.
