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
- **One person = one account = one permanent case:** a client only ever accesses their own account, case, and data.

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
- A client whose case exists permanently but has no active Case Period (between periods / after completion).
- **Access:** read own history (case history, past conclusions as released, documents, payments); may reactivate case and pay for a new period.
- **Restricted:** no active accompaniment messaging beyond reactivation/support; preliminary assessment is one-time and not re-triggered automatically (manual only, per DATA_MODEL_OPEN_DECISIONS_V1).

### 2.5 Karen
- **Pages/zones:** Karen workspace (two-window: client window + Karen-assistant AI window).
- **Data entities:** full case-scoped access — Client, Account (case-relevant), Case, Case Period, Assessment, AI Session (assistant outputs), Karen Review (own), Messages, Document Uploads, plus payment status (not raw processor data).
- **Allowed:** review cases, create Karen Reviews, set/change case status and urgency, approve/reject AI drafts, answer case questions, authorize manual repeat assessment, decide refund warranted.
- **Forbidden:** change legal texts or AI guardrails alone; edit/delete Audit Log; execute payment refunds as an operation (Support/Admin executes); access unrelated administrative governance.
- **Audit:** Karen Reviews, status/urgency changes, case answers, route changes.
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
- **Data entities:** governance scope — Knowledge Entry (approve), legal texts, guardrail configuration, access/permission settings, Audit Log (read + grant access). Operational oversight of blocks.
- **Allowed:** approve Knowledge Entries; change legal texts and AI guardrails through governance; configure access; grant/revoke Audit Log access; oversee blocks.
- **Forbidden:** make case decisions for Karen; edit or delete Audit Log entries; fabricate consent.
- **Audit:** legal-text changes, guardrail changes, knowledge approvals, access/permission changes, Audit Log access grants.
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
Governance only. Admin manages knowledge approval, legal texts, guardrails, access, and Audit Log access. Admin does not decide cases and cannot mutate the Audit Log. All governance actions are audited.

### 3.3 Karen workspace access rules
Full case-scoped access in a two-window interface. Karen sees the client window (messages, documents, history) and the Karen-assistant AI window (summaries, drafts, confidence). Karen decides; payment processor internals are status-only.

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
Any client message can trigger a red flag. Client-facing AI may **automatically** (a) direct the client to emergency help without softening, (b) reassure that the center is near, (c) mark the request critical and raise it to the top of Karen's queue. This escalation path is always available regardless of role state and is audited. Karen receives critical items first; Karen accompanies but never replaces emergency services.

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
| Admin | Knowledge Entry | Y | prop | approve | per policy | approval authority | Yes |
| Admin | Legal / Guardrails | Y | governance | governance | N | governance only | Yes |
| Admin | Access / Permissions | Y | Y | Y | Y | controls access | Yes |
| Admin | Audit Log | R + grant | N | N | N | cannot edit/delete | grants: Yes |
| System | Consent / Period / Uploads | Y | Auto | Auto | N | deterministic only | Yes (writes log) |
| System | Audit Log | append | Auto | N (append-only) | N | writer; never mutates | Yes |
| AI (client-facing) | Nav/Status/Knowledge | Y | escalation events | N | N | no case decisions | red-flag/escalation: Yes |
| AI (Karen-assistant) | Case docs / AI Session | Y | prop (drafts) | N | N | proposals only, confidence | – |
| AI (any) | Audit Log | N | via System events | N | N | no direct access | escalations logged |

---

## 5. Self-check against the Constitution, AI_GUARDRAILS_V1 and AUTHORITY_MATRIX_V1

| Principle | Source | Status |
|---|---|---|
| Center = rehabilitation support, not medical org / no cure | Constitution | **HELD** — no role granted diagnostic/treatment access |
| No guarantee of result/remission; public site cannot promise | Constitution / WEB_ARCH | **HELD** — visitor pages restricted accordingly |
| Karen = single source of case decisions | AUTHORITY_MATRIX_V1 | **HELD** — only Karen holds case create/update authority |
| AI never decides or guesses; read + propose; scoped | AI_GUARDRAILS_V1 | **HELD** — AI rows are read/propose, never decisive |
| Two AI types with distinct boundaries | AI_GUARDRAILS_V1 | **HELD** — client-facing vs Karen-assistant scoped separately |
| Consent explicit, logged, immutable; Audit Log canonical | DATA_MODEL_OPEN_DECISIONS_V1 | **HELD** — Audit Log read-only, append-only, access audited |
| One person = one account = one permanent case | Constitution / DATA_MODEL | **HELD** — client own-data only, one account |
| Safety above speed; red-flag escalation always available | Safety Protocol | **HELD** — §3.9 auto-escalation regardless of role state |
| Least privilege / data minimization | AUTHORITY_MATRIX_V1 | **HELD** — §3.10 + scoped matrix |
| No card/bank data handled in own UI; processor isolation | Payment Arch / privacy | **HELD** — §3.7 raw processor data never exposed |
| Human override; AI overrides no human | AI_GUARDRAILS_V1 | **HELD** — Karen/Support/Admin override AI; AI cannot |

**No contradictions found** with the Constitution, AI_GUARDRAILS_V1, or AUTHORITY_MATRIX_V1. The document is architectural only — no code, SQL, Supabase RLS, or runtime logic.

After this document, the platform's access model is defined and consistent with the authority matrix, the guardrails, the data model, and the safety protocol.
