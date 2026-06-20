# ACCESS_CONTROL_V1

**Status:** Architectural access document — defines roles, access levels, and access restrictions for the web-first platform of the center / platform Python Method.
**Scope:** Access architecture only. No code, no SQL, no Supabase RLS, no runtime logic.

**Sources of grounding:**
- DATA_MODEL_V1, DATA_MODEL_OPEN_DECISIONS_V1
- AI_GUARDRAILS_V1, AUTHORITY_MATRIX_V1
- Client Cabinet Architecture, Admin Panel Architecture, Support System Architecture, Payment Architecture
- Safety Protocol (Протокол безопасности и красных флагов)
- Offer / Legal documents (Оферта)

Does **not** rely on any old project or Telegram logic. Web-first only.

---

## 1. Principles

- **Least privilege:** every role sees and does the minimum its function requires.
- **Case decisions belong to Karen** (per AUTHORITY_MATRIX_V1); access never grants decision authority it doesn't carry.
- **AI never decides or guesses** (per AI_GUARDRAILS_V1); AI access is scoped to its function and is mostly read + propose.
- **Audit Log is immutable and canonical for consent** (per DATA_MODEL_OPEN_DECISIONS_V1); no role can edit/delete it; access to it is itself audited.
- **Data minimization:** sensitive medical and payment data are exposed only to roles that need them, and only at the needed granularity.
- **One person = one account = one continuous case:** a client only ever accesses their own account, case, and data. (Continuity here means one ongoing case per person, not a case that can never be archived or deleted; see DATA_RETENTION_AND_DELETION_POLICY_V1.)

---

## 2. Access roles

### 2.1 Unauthenticated visitor
- **Pages/zones:** public site only (landing, trust/about, legal, pricing/offer summary, login/registration entry). Per WEB_ARCHITECTURE_V1, public pages may not promise results/remission.
- **Data entities:** none of the protected entities. Only public content.
- **Allowed:** browse public pages, start registration, read the Offer.
- **Forbidden:** any access to Client/Account/Case/Message/Document/Payment/Knowledge/Audit data.
- **Audit:** registration start and consent (once submitted).
- **Hidden/read-only:** everything protected is hidden.

### 2.2 Client (authenticated, baseline)
- **Pages/zones:** own Client Cabinet (dashboard, onboarding, documents, messages, payments, status).
- **Data entities:** own Client, own Account, own Case (status-level), own Case Period, own Assessment, own Messages, own Document Uploads, own Payment/Subscription records, own Support Tickets. **Read-only** for case decisions (Karen Reviews summary as released by Karen).
- **Allowed:** edit own profile basics, upload documents, request assessment, send messages, pay, renew, request own document deletion/archival, open support tickets.
- **Forbidden:** see other clients' data; see internal Karen Reviews/AI Sessions raw; set case status/urgency; access Audit Log; access Admin/Karen/Support workspaces; approve knowledge.
- **Audit:** registration, consent, uploads, payments, deletion requests.
- **Hidden/read-only:** AI Session internals, raw Karen Review notes, other accounts, Audit Log, full payment processor data.

### 2.3 Active client (sub-state of client)
- A client with a currently running Case Period (paid, in support).
- **Additional access:** active accompaniment messaging with Karen, current-period materials, AI-session support.
- Same forbiddens as baseline client.

### 2.4 Inactive client (sub-state of client)
- A client whose single ongoing case persists between periods (after completion / between paid periods) but has no active Case Period. Per DATA_RETENTION_AND_DELETION_POLICY_V1 the case may be archived after long inactivity (archived ≠ deleted) and is removed on client self-service deletion.
- **Access:** read own history (case history, past conclusions as released, documents, payments); may reactivate case and pay for a new period.
- **Restricted:** no active accompaniment messaging beyond reactivation/support; preliminary assessment is one-time and not re-triggered automatically (manual only, per DATA_MODEL_OPEN_DECISIONS_V1).

### 2.5 Karen
- **Pages/zones:** Karen workspace (two-window: client window + Karen-assistant AI window).
- **Data entities:** full case-scoped access — Client, Account (case-relevant), Case, Case Period, Assessment, AI Session (assistant outputs), Karen Review (own), Messages, Document Uploads, plus payment status (not raw processor data); **Knowledge Entries (create / modify / approve / revoke — owner of methodology and content approval).**
- **Allowed:** review cases, create Karen Reviews, set/change case status and urgency, approve/reject AI drafts, answer case questions, authorize manual repeat assessment, decide refund warranted; **create, modify, approve, and revoke Knowledge Entries; approve methodology and clinical-logic changes.**
- **Forbidden:** change legal texts or AI guardrails alone; edit/delete Audit Log; execute payment refunds as an operation (Support/Admin executes); access unrelated administrative governance.
- **Audit:** Karen Reviews, status/urgency changes, case answers, route changes; **knowledge approvals/revocations, methodology approvals.**
- **Hidden/read-only:** raw payment processor data (status only); governance settings.

### 2.6 Support / Anna
- **Pages/zones:** Support workspace.
- **Data entities:** technical/organizational scope — Account (status), Payment/Subscription (operational), Support Tickets, Document Upload (delivery/technical state), login/registration state. **No** case-substance access (no interpretation of medical content).
- **Allowed:** resolve payment/login/upload/technical issues, execute refunds, assist registration, block/unblock per policy.
- **Forbidden:** make case decisions, interpret state, set case status/urgency, approve knowledge, change legal/guardrails, edit/delete Audit Log.
- **Audit:** refunds, user blocks, account-affecting actions.
- **Hidden/read-only:** case-substance (Karen Reviews content, medical interpretation) is hidden; case data visible only at organizational level.

### 2.7 Admin
- **Pages/zones:** Admin Panel.
- **Data entities:** governance scope — Knowledge Entry (publish / unpublish / archive / version / manage visibility / manage access — **not** approval), legal texts, guardrail configuration, access/permission settings, Audit Log (read + grant access). Operational oversight of blocks.
- **Allowed:** publish, unpublish, archive, version Knowledge Entries and manage their visibility/access (publication and technical governance only); change legal texts and AI guardrails through governance; configure access; grant/revoke Audit Log access; oversee blocks.
- **Forbidden:** approve methodology, clinical logic, or knowledge content (that authority belongs to Karen); make case decisions for Karen; edit or delete Audit Log entries; fabricate consent.
- **Audit:** legal-text changes, guardrail changes, knowledge publication/unpublication/archival/versioning, access/permission changes, Audit Log access grants.
- **Hidden/read-only:** Audit Log is read-only even for Admin.

### 2.8 System service
- **Pages/zones:** none (no UI identity).
- **Data entities:** writes/reads mechanically — records consent, stores uploads, starts Case Period after valid payment, writes Audit Log, surfaces statuses.
- **Allowed:** deterministic execution once preconditions are met.
- **Forbidden:** any judgment/decision/interpretation; altering or deleting Audit Log entries; overriding a human.
- **Audit:** it is the **writer** of the Audit Log; mechanical state changes are audited.
- **Hidden/read-only:** N/A — it acts only within deterministic rules.

### 2.9 AI service
- **Pages/zones:** operates inside Client Cabinet (client-facing AI) and Karen workspace (Karen-assistant AI).
- **Data entities:** client-facing AI — navigation/status/organizational scope + approved Knowledge Entries; Karen-assistant AI — case documents and case data for summary/translation, AI Session records (its own outputs). Mostly **read + propose**.
- **Allowed:** client-facing — navigate, inform, support, send approved materials, auto-escalate red flags. Karen-assistant — read/translate/structure, build summaries with confidence, prepare drafts for Karen.
- **Forbidden:** diagnose, interpret state as decision, set status/urgency, send case answers without Karen, create/override consent, guess/fabricate data, write to Audit Log as a decision-maker (System records; AI's escalations are logged events).
- **Audit:** red-flag escalations and escalations to Karen are logged.
- **Hidden/read-only:** Audit Log (no access beyond generating logged escalation events via System); other clients' data; governance settings.

---

## 3. Dedicated access-rule sections

### 3.1 Client Cabinet access rules
Strictly own-data only. Client sees own profile, documents, messages, payments, statuses, and released case outputs (read-only). Internal AI session traces and raw Karen notes are hidden. Cross-account access is impossible by design.

### 3.2 Admin Panel access rules
Governance only. Admin manages knowledge **publication, visibility, access, and versioning** (not approval), legal texts, guardrails, access, and Audit Log access. **Knowledge and methodology approval is owned by Karen, not Admin.** Admin does not decide cases and cannot mutate the Audit Log. All governance actions are audited.

### 3.3 Karen workspace access rules
Full case-scoped access in a two-window interface. Karen sees the client window (messages, documents, history) and the Karen-assistant AI window (summaries, drafts, confidence). Karen decides; payment processor internals are status-only. Karen also owns the **Knowledge Entry lifecycle up to approval**: create, modify, approve, and revoke knowledge content and methodology; Admin publishes and manages visibility but never approves content. Knowledge lifecycle: Draft → Karen Review → Karen Approved → Published → Archived.

### 3.4 Support workspace access rules
Organizational/technical scope only. Support sees account/payment/ticket/technical state, never medical case substance. Support executes refunds and blocks per policy; case matters are routed to Karen.

### 3.5 AI service access boundaries
AI is scoped to its function: client-facing AI to navigation/support + approved knowledge; Karen-assistant AI to case material for proposals. AI never decides, never guesses, never sends case answers without Karen, and never creates/overrides consent. Red-flag handling is automatic.

### 3.6 Audit Log access rules
Immutable and append-only. System writes; no role edits or deletes. Read access is scoped: Karen (case scope), Support (scoped), Admin (read + grant). Every access grant and read of sensitive Audit data is itself audited. Audit Log is canonical for consent.

### 3.7 Payment data access rules
Client sees own payment/subscription records. Support sees operational payment data and executes refunds. Karen sees payment status only. Admin oversees via governance. Raw payment-processor/card data is never exposed in the cabinet or to AI; it stays with the payment provider. (No card/bank data is handled in this platform's own UI.)

### 3.8 Document Upload access rules
Client uploads and views own documents and may request deletion/archival. Karen and Karen-assistant AI read documents for case work; AI flags unreadable documents and never builds conclusions on them. Support sees upload delivery/technical state only. Deletion/archival of case-relevant documents requires Karen confirmation; all deletions are audited.

### 3.9 Red Flag access / escalation access rules
Synchronized to RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1 (canonical). Any client message can trigger a red flag. Client-facing AI may **automatically** respond immediately, advise urgent professional help, briefly explain the concern (no diagnosis), confirm the message reached the responsible human team, and create a red_flag_event. This escalation path is always available regardless of role state and is audited. Routing is dual: **physical/medical → Karen**, **psychological/crisis → Anna/Support**. AI/System may mark `requires_immediate_review` (a transient priority marker), but **only Karen** sets durable case urgency/status/route.

- **red_flag_event access.** Created by AI/System; append-only and immutable. AI/System: create only (no edit/delete). Karen: read for case-scoped events. Support/Anna: read for psychological/crisis events routed to them. Admin: no content edit; access grants only, themselves audited. Clients: no direct access to the event record. The event references the case but never carries or alters case state.
- **Crisis notifications access.** Notifications generated from a psychological/crisis red_flag_event are delivered to **Anna/Support** immediately; physical/medical notifications are delivered to **Karen**. Notifications are read by their target role only and are audited. No role may suppress, delete, or downgrade a crisis notification; corrections are new events, not mutations.
- **Karen queue access.** Karen's urgent review queue surfaces case-scoped red_flag_events with `requires_immediate_review` at the top. Read/act access is Karen-only. Karen alone assigns durable `case_urgency`, changes `case_status`, and changes the support route from this queue; these actions are audited.
- **Anna/Support crisis queue access.** A dedicated crisis queue surfaces psychological/crisis red_flag_events routed to Anna/Support. Read/respond access is Support-only and is audited. Support responds to the crisis routing but **never** makes case-level decisions, sets durable urgency/status, or changes the case route — those remain Karen-only.

This escalation path is always reachable, never blocked by paywalls or onboarding state. Notified humans accompany and support; they never replace emergency services.

### 3.10 Data minimization rules
Each role receives the minimum data needed: Support gets no medical substance; AI gets only what its function needs; clients get only their own data; payment-processor internals are never broadened; Audit Log access is scoped and logged. Sensitive medical and consent data are exposed at the lowest necessary granularity.

---

## 4. Access Matrix

Legend: **R**=Read, **C**=Create, **U**=Update, **D**=Delete/Archive. **Y/N** marks permission; **own** = own-records only; **status** = status-level only; **prop** = propose (Karen/Admin approves); **req-K** = requires Karen confirmation.

| Role | Entity | Read | Create | Update | Delete/Archive | Special Limits | Audit Required |
|---|---|---|---|---|---|---|---|
| Client | Client | own | self | own basics | N | own profile only | Yes (reg) |
| Client | Account | own | self | limited | N | one account per person | Yes |
| Client | Case | status | N | N | N | read-only, status level | – |
| Client | Case Period | own | N | N | N | read-only | – |
| Client | Assessment | own | request | N | N | one-time free; repeat manual only | Yes |
| Client | AI Session | N | via use | N | N | internals hidden | – |
| Client | Karen Review | released only | N | N | N | read-only, as released | – |
| Client | Message | own | Y | own | N | own thread only | case msgs: Yes |
| Client | Document Upload | own | Y | N | request (req-K if case) | own only | Yes |
| Client | Payment | own | Y | N | N | no processor internals | Yes |
| Client | Subscription | own | via pay | N | N | own only | Yes |
| Client | Support Ticket | own | Y | own | N | own only | – |
| Client | Knowledge Entry | published | N | N | N | read approved only | – |
| Client | Audit Log | N | N | N | N | no access | – |
| Karen | Case / Period / Review | Y (case) | Y | Y | req-K policy | owns case decisions | Yes |
| Karen | Assessment | Y | authorize repeat | Y | N | manual repeat only | Yes |
| Karen | Message | Y (case) | Y (case reply) | N | N | case answers owned | Yes |
| Karen | Document Upload | Y (case) | N | N | confirm | reads for case work | Yes |
| Karen | Payment | status | N | N | N | decides refund warranted | Yes (decision) |
| Karen | Audit Log | R (case scope) | N | N | N | read-only | access: Yes |
| Support/Anna | Account | status | assist | limited | block | no case substance | Yes |
| Support/Anna | Payment / Subscription | Y (op) | N | refund | N | executes refunds | Yes |
| Support/Anna | Support Ticket | Y | Y | Y | N | technical scope | – |
| Support/Anna | Document Upload | tech state | N | N | execute per policy | no medical reading | Yes |
| Support/Anna | Audit Log | R (scope) | N | N | N | read-only scoped | access: Yes |
| Karen | Knowledge Entry | Y | Y | approve/revoke | archive (content) | **owns methodology + content approval** | Yes |
| Admin | Knowledge Entry | Y | N | publish/version | archive (publication) | **publication/visibility only; no content approval** | Yes |
| Admin | Legal / Guardrails | Y | governance | governance | N | governance only | Yes |
| Admin | Access / Permissions | Y | Y | Y | Y | controls access | Yes |
| Admin | Audit Log | R + grant | N | N | N | cannot edit/delete | grants: Yes |
| System | Consent / Period / Uploads | Y | Auto | Auto | N | deterministic only | Yes (writes log) |
| System | Audit Log | append | Auto | N (append-only) | N | writer; never mutates | Yes |
| AI (client-facing) | Nav/Status/Knowledge | Y | escalation events | N | N | no case decisions | red-flag/escalation: Yes |
| AI (Karen-assistant) | Case docs / AI Session | Y | prop (drafts) | N | N | proposals only, confidence | – |
| AI (any) | Audit Log | N | via System events | N | N | no direct access | escalations logged |

---

## 5. Age policy and Care Recipient access rules

Per **AGE_AND_CARE_RECIPIENT_POLICY_V1**, access control enforces the adult-Client / Care-Recipient separation:

- Only an authenticated adult **Client** (age 21+) may register, create, view, or act on a Case and its linked Care Recipient.
- A person **under 21** cannot independently register, create a case, accept the offer, sign consent, purchase support, or communicate as the responsible Client.
- A **Care Recipient** is not an account holder: no login, no independent access, no responsibility permissions.
- Care Recipient personal data (name, date of birth, age, location, reason for representation) is sensitive and readable only by the owning Client and authorized internal roles (Karen / Admin per their existing scopes).
- Responsibility-bearing actions (offer acceptance, consent, payment) may be performed only by the Client, never by or on behalf of a Care Recipient acting independently.

See AGE_AND_CARE_RECIPIENT_POLICY_V1.md for the full policy.

---

## 6. Self-check against the Constitution, AI_GUARDRAILS_V1 and AUTHORITY_MATRIX_V1

| Principle | Source | Status |
|---|---|---|
| Center = rehabilitation support, not medical org / no cure | Constitution | **HELD** — no role granted diagnostic/treatment access |
| No guarantee of result/remission; public site cannot promise | Constitution / WEB_ARCH | **HELD** — visitor pages restricted accordingly |
| Karen = single source of case decisions | AUTHORITY_MATRIX_V1 | **HELD** — only Karen holds case create/update authority |
| AI never decides or guesses; read + propose; scoped | AI_GUARDRAILS_V1 | **HELD** — AI rows are read/propose, never decisive |
| Two AI types with distinct boundaries | AI_GUARDRAILS_V1 | **HELD** — client-facing vs Karen-assistant scoped separately |
| Consent explicit, logged, immutable; Audit Log canonical | DATA_MODEL_OPEN_DECISIONS_V1 | **HELD** — Audit Log read-only, append-only, access audited |
| One person = one account = one continuous case (archivable / deletable per DATA_RETENTION_AND_DELETION_POLICY_V1) | Constitution / DATA_MODEL / DATA_RETENTION_AND_DELETION_POLICY_V1 | **HELD** — client own-data only, one account; case archivable after inactivity and removable on client deletion |
| Safety above speed; red-flag escalation always available | Safety Protocol | **HELD** — §3.9 auto-escalation regardless of role state |
| Least privilege / data minimization | AUTHORITY_MATRIX_V1 | **HELD** — §3.10 + scoped matrix |
| No card/bank data handled in own UI; processor isolation | Payment Arch / privacy | **HELD** — §3.7 raw processor data never exposed |
| Human override; AI overrides no human | AI_GUARDRAILS_V1 | **HELD** — Karen/Support/Admin override AI; AI cannot |
| Knowledge/methodology approval is Karen-owned; Admin publishes/manages only | CANONICAL_LIFECYCLE_STATUS_MODEL_V1 | **HELD** — §2.5/§2.7 + matrix; no Admin content approval |

**No contradictions found** with the Constitution, AI_GUARDRAILS_V1, or AUTHORITY_MATRIX_V1. The document is architectural only — no code, SQL, Supabase RLS, or runtime logic.

After this document, the platform's access model is defined and consistent with the authority matrix, the guardrails, the data model, and the safety protocol.

---

## 7. Data retention and deletion access rules (synchronized with DATA_RETENTION_AND_DELETION_POLICY_V1)

DATA_RETENTION_AND_DELETION_POLICY_V1 is the canonical source of truth for archive, deletion, account closure, and case closure. The access rules below extend §3 and the Access Matrix; where any earlier wording conflicts, the policy governs.

### 7.1 Who may initiate deletion

- **Only the authenticated adult Client** (the account owner, age 21+ per AGE_AND_CARE_RECIPIENT_POLICY_V1) may initiate self-service deletion of their own account and data. A Client may delete only their own account; they can never delete another client's data.
- A Care Recipient is not an account holder and can never initiate deletion.
- **Support/Admin may assist** a client (e.g. explain the flow, troubleshoot) but must **not delete client data without an explicit authorized process**. Support/Admin do not silently delete accounts or cases on a client's behalf; any staff-side removal follows an authorized, audited process and never substitutes for the client's own confirmed self-service deletion.

### 7.2 Deletion flow must be audited

The deletion flow is an access-sensitive action and must be audited. The Audit Log records that a deletion occurred, when, the actor, and the deletion reason — without retaining the deleted personal content. Audit Log remains immutable and append-only; the deletion-event record is the only durable trace.

### 7.3 Access is revoked after deletion

After confirmed deletion, **access is revoked**: the account no longer authenticates, and all client-scoped reads/writes for that account cease. Karen and staff lose access to the deleted client's historical record, because the record no longer exists. The client's deletion right takes priority over retaining a case for organizational history.

### 7.4 Archive does not remove authorized access

**Archive only hides a case from active views; it does not remove authorized access.** Archived cases (after 5 years of inactivity) are excluded from active operational queues and active work views but remain **recoverable by authorized staff**. Recovery from archive is an authorized, audited action governed by these access rules. Archival never deletes data and never, by itself, revokes a client's deletion right over the archived case.

### 7.5 Access Matrix addenda

- **Client — Account/Case (own):** add **D = self-service delete** (own account + all own cases, questionnaires, uploads; confirmation + reason required; audited). Client delete remains own-records only.
- **Support/Anna:** assist with deletion only; **no delete of client case data** outside an explicit authorized, audited process.
- **Karen / authorized staff:** **recover** archived cases (read/restore from archive); archival visibility change is staff-scoped and audited; no override of a confirmed client deletion.
- **System:** executes the deletion cascade deterministically once the client confirms; writes the deletion-event audit row; never deletes the Audit Log itself.

See DATA_RETENTION_AND_DELETION_POLICY_V1.md for the full canonical policy.
