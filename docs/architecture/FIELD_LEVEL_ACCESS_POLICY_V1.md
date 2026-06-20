# FIELD_LEVEL_ACCESS_POLICY_V1

Status: Architectural security policy document — defines the canonical field-level access policy for sensitive data on the web-first platform of the center / platform Python Method. Scope: Access-policy architecture only. No code, no SQL, no Supabase RLS implementation, no runtime logic. This document closes the final P0 architecture/security gap (field-level access) before the P0 Closure Audit.

Date: 2026-06-20

Sources of grounding (canonical inputs):

- ACCESS_CONTROL_V1 (roles, role-level access, least privilege, Audit Log immutability)
- DATA_MODEL_V1 (entities, ownership, source of truth)
- SUPABASE_SCHEMA_V1 (physical fields, enums, audit fields, processor-reference-only payments)
- AGE_AND_CARE_RECIPIENT_POLICY_V1 (adult Client 21+ vs Care Recipient separation)
- RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1 (red_flag_event, dual routing, requires_immediate_review)
- DATA_RETENTION_AND_DELETION_POLICY_V1 (archive, deletion, account/case closure)
- REFUND_POLICY_V1 (refund as exception, AI has no refund authority, no card/bank data)

IMPORTANT: This document is documentation-only P0 closure. No SQL is written, no code is modified, and no RLS is implemented. It defines policy intent that a future, separately-authorized implementation step must enforce. Final legal/compliance wording is deferred to legal review and the Public Offer.

## 1. Purpose

This document defines, at the level of individual fields and field groups, who may access which sensitive data and under what conditions. Role-level access is already defined in ACCESS_CONTROL_V1 and AUTHORITY_MATRIX_V1; this policy refines that to the field level so that sensitive data (identity, medical substance, payment, AI internals, audit records) is exposed only to the roles and contexts that genuinely need it.

It exists to close the final P0 field-level-access gap before the P0 Closure Audit, to make data minimization enforceable per field, to separate operational/technical access from medical substance, to keep developers away from production medical data by default, to bound AI/System processing to the current task, and to keep the Audit Log immutable and access-controlled. It is not legal text; the Public Offer and privacy policy remain binding, and all final compliance wording is pending legal review.

## 2. Definitions

- Field — a single attribute of an entity (e.g. client.full_name, document_upload.confidence).
- Field group — a set of related fields treated together for access purposes (e.g. "Client identity fields").
- Sensitive field — a field whose exposure carries privacy, medical-confidentiality, financial, or safety risk.
- Medical substance — the interpretable clinical content of uploaded documents, summaries, translations, and Karen's case conclusions. Distinct from technical/delivery metadata about those documents.
- Field-level access — the determination of read/write/no-access per field per role, beyond coarse entity-level access.
- Need-to-know / task-scoped — access granted only because the role's current, legitimate function requires that specific field at that moment.
- Internal-only — data never shown to the client (e.g. AI internal reasoning, Karen drafts/internal notes).
- Conditional / future — a field group not active in the current MVP; documented for future use only and not collected/exposed now.

## 3. Role definitions

- Client — the authenticated adult account holder (age 21+ per AGE_AND_CARE_RECIPIENT_POLICY_V1). Owns identity, consent, payment, and responsibility. Sees own data and the Care Recipient data they are responsible for.
- Care Recipient — the person whose condition/documents are reviewed. Not an account holder. A Care Recipient under 21 (or otherwise dependent) gets no independent access of any kind.
- Karen — the single source of case decisions. Sees the case substance needed to review and support the case.
- Anna / Support — operational/technical support. Must not see medical substance unless explicitly authorized for a specific, audited reason.
- Admin — governs access, configuration, knowledge publication, and Audit Log access grants. Governs access but does not need routine access to medical substance.
- AI / System — automated processing (client-facing AI, Karen-assistant AI, and deterministic System). Processes only what is necessary for the current task; never a decision-maker; never writes case/refund decisions.
- Legal / Compliance — a governance/oversight role that may review records (including audit and consent) strictly for legal/compliance obligations, under an authorized, audited process. Not a routine operational role.
- Developer / Engineer — builds and maintains the platform. Must not access production medical data by default; works against non-production/synthetic data, with any production access being exceptional, time-bound, approved, and audited.
- Public / Visitor — unauthenticated. Sees only public content and never any private data.

## 4. Access principles

- Least privilege: every role gets the minimum fields its function requires; nothing more.
- Need-to-know, task-scoped: access to a sensitive field is justified by a current legitimate task, not by role convenience.
- Separation of substance from metadata: operational/technical/delivery metadata is treated separately from medical substance; seeing one never implies seeing the other.
- Client ownership: the Client sees their own data and the Care Recipient data they are responsible for; the Care Recipient has no independent access.
- Karen owns case substance: Karen reads the case substance needed for review/support; AI only proposes; Support/Admin do not interpret case substance.
- Support excludes medical substance: Support sees account/payment/ticket/technical/document-delivery state, never medical content, unless explicitly and exceptionally authorized and audited.
- Admin governs, does not interpret: Admin manages access, configuration, and governance, and does not need routine access to medical substance; Admin can never edit/delete the Audit Log.
- Developers are isolated from production medical data: default is no production PHI/PII access; exceptions are approved, time-bound, and audited.
- AI/System minimization: AI processes only the fields needed for the current task; internal AI reasoning is internal-only; AI never decides cases or refunds.
- Public sees nothing private: visitors access only public marketing/legal/pricing content.
- Audit everything sensitive: every access to and change of sensitive fields that matters for safety, consent, payment, or legal defensibility is recorded in the immutable, append-only Audit Log; access to the Audit Log is itself controlled and audited.
- No card/bank data in platform: payment card/bank details are never stored in platform tables; only a processor reference is kept.

## 5. Field sensitivity levels

Sensitivity levels classify fields so access rules and audit treatment scale with risk:

- L0 Public — non-private content (public site, pricing, legal text). No restriction.
- L1 Operational — account/technical/status metadata needed to run the service (e.g. payment status, ticket status, document delivery state). Scoped to operational roles.
- L2 Personal identity — Client/Care Recipient identifying data (name, email, phone, DOB, location, relationship). Owner + need-to-know internal roles only.
- L3 Medical substance — interpretable clinical content: medical document content, translations, extracted summaries, Karen case conclusions. Karen + Client (own/Care Recipient) only; Support excluded unless explicitly authorized.
- L4 Internal-only — AI internal reasoning/processing metadata, Karen drafts/internal notes. Never shown to the Client; scoped to the owning internal context.
- L5 Audit/immutable — Audit Log records. Append-only; read access controlled and itself audited; never editable/deletable by any role.
- L6 Financial-sensitive (external) — card/bank data. Never stored in platform tables; lives only with the payment processor. Out of scope for all platform roles.

Legend used in the matrices below: R = read, W = write/update, C = create, No = no access, Own = own records (and Care Recipient the Client is responsible for) only, Cond = conditional/exceptional (approved + audited), Future = not active in MVP.

## 6. Field-level access matrix

The following sub-sections define access per field group. "Karen" means case-scoped read of substance needed for review; "Support" excludes medical substance by default; "Admin" governs access and does not get routine medical substance; "Dev" is non-production by default; "AI/System" is task-scoped; "Legal" is exceptional/audited; "Public" sees nothing private.

### 6.1 Client identity fields

Fields: full_name, email, phone, date_of_birth, country/location. Sensitivity: L2.

| Field | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| full_name | R/W (own) | No | R (case) | R (account/contact) | R (governance, no routine substance) | Task-scoped | Cond (audited) | No (prod); synthetic only | No |
| email | R/W (own) | No | R (case) | R (account/contact) | R (governance) | Task-scoped (e.g. send notice) | Cond | No (prod) | No |
| phone | R/W (own) | No | R (case) | R (contact/technical) | R (governance) | Task-scoped | Cond | No (prod) | No |
| date_of_birth | R/W (own) | No | R (case, age relevance) | No (not needed) | R (governance, minimal) | Task-scoped (age gate) | Cond | No (prod) | No |
| country/location | R/W (own) | No | R (case) | R (operational, e.g. payment region) | R (governance) | Task-scoped | Cond | No (prod) | No |

Notes: identity is owned by the Client; the Care Recipient never gets independent access. Support sees contact/account-level identity for operational help but not medical substance. DOB is exposed to Support only if an operational need is explicitly justified (default No).

### 6.2 Care Recipient fields

Fields: full_name, date_of_birth, age, relationship_to_client, plus reason_for_representation. Sensitivity: L2.

| Field | Client (responsible) | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| full_name | R/W (own) | No (no independent access) | R (case) | No (default) | R (governance, minimal) | Task-scoped | Cond | No (prod) | No |
| date_of_birth | R/W (own) | No | R (case) | No | R (minimal) | Task-scoped | Cond | No (prod) | No |
| age | R/W (own) | No | R (case) | No | R (minimal) | Task-scoped (eligibility) | Cond | No (prod) | No |
| relationship_to_client | R/W (own) | No | R (case) | No | R (minimal) | Task-scoped | Cond | No (prod) | No |
| reason_for_representation | R/W (own) | No | R (case) | No | R (minimal) | Task-scoped | Cond | No (prod) | No |

Notes: per AGE_AND_CARE_RECIPIENT_POLICY_V1, a Care Recipient (especially under 21 or dependent) is never an account holder and gets no login or independent access. Responsibility-bearing actions reference the Client only. Care Recipient data is readable only by the owning Client and authorized internal roles (Karen, and Admin minimally for governance).

### 6.3 Medical document fields

Fields: uploaded file content (L3 substance), storage_path / document metadata (L1), quality_flag (L1), confidence_level (L1/L4), translations (L3), extracted summaries (L3). 

| Field | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| file content (substance) | R (own) | No | R (case) | No (excluded unless explicitly authorized) | No routine | Task-scoped processing only | Cond (audited) | No (prod) | No |
| document metadata (path, type, language, upload time) | R (own) | No | R (case) | R (delivery/technical state only) | R (governance) | Task-scoped | Cond | No (prod) | No |
| quality_flag (ok/low_quality/unreadable) | R (own, limited) | No | R (case) | R (technical state) | R | Task-scoped (flagging) | Cond | No (prod) | No |
| confidence_level | Not shown raw to client | No | R (case) | No | No routine | Writes own (proposal) | Cond | No (prod) | No |
| translations (substance) | R (own) | No | R (case) | No | No routine | Task-scoped (produce) | Cond | No (prod) | No |
| extracted summaries (substance) | R (own, as released) | No | R (case) | No | No routine | Task-scoped (produce, proposal) | Cond | No (prod) | No |

Notes: medical substance (file content, translations, summaries) is L3 — Karen and the owning Client only. Support sees only delivery/technical state (that a file exists, its type, whether it uploaded, quality flag), never the clinical content, unless an exceptional, explicitly authorized, audited reason exists. AI processes substance only for the current task and never publishes case conclusions without Karen.

### 6.4 Questionnaire / onboarding fields

Fields: onboarding answers, assessment inputs, "who is this case for" routing, consent acknowledgements. Sensitivity: L2 (identity/intake) with some L3 (health-relevant answers).

| Field | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| onboarding/questionnaire answers | R/W (own) | No | R (case) | No (substance) | No routine | Task-scoped (structure) | Cond | No (prod) | No |
| assessment inputs | R/W (own) | No | R (case, authors evaluation) | No | No routine | Task-scoped (structure, never evaluate) | Cond | No (prod) | No |
| case_for / self_case routing | R/W (own) | No | R (case) | R (operational minimal) | R (minimal) | Task-scoped (routing) | Cond | No (prod) | No |
| consent acknowledgements | R (own) | No | R (relevant) | R (operational fact only) | R (governance) | Auto (records) | R (Cond, legal need) | No (prod) | No |

Notes: health-relevant questionnaire content is treated as medical substance (L3) and excluded from Support. The consent fact (that consent/offer acceptance happened, with version + timestamp) is operational/audit and is broader than the substance of the answers.

### 6.5 Message / request fields

Fields: client messages, Karen replies, support messages, status (unread / in-review / answered). Sensitivity: L1 (status) / L2–L3 (content, depending on whether it carries case substance).

| Field | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| client messages (case substance) | R/W (own) | No | R (case) | No (case substance) | No routine | Task-scoped (route/draft) | Cond | No (prod) | No |
| client messages (technical/organizational) | R/W (own) | No | R (case) | R (technical tickets) | R (governance) | Task-scoped | Cond | No (prod) | No |
| Karen replies (case answers) | R (own, as sent) | No | R/W (author) | No | No routine | Propose draft only (no send) | Cond | No (prod) | No |
| support messages | R (own) | No | R (case context) | R/W (author) | R (governance) | Task-scoped | Cond | No (prod) | No |
| status (unread/in-review/answered) | R (own) | No | R/W (case) | R/W (own tickets) | R | Auto (transitions) | R (Cond) | No (prod) | No |

Notes: the single-window UX routes a message to AI, Support, or Karen; Support reads only technical/organizational messages, not case-substance messages. AI may draft and route but never sends a case answer without Karen.

### 6.6 Karen review fields

Fields: drafts (L4 internal-only), final review / case conclusions (L3, released to client), internal notes (L4 internal-only). 

| Field | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| drafts | No (internal-only) | No | R/W (author) | No | No | Propose draft only | Cond | No (prod) | No |
| final review / case conclusions | R (own, only released_to_client) | No | R/W (author, owns) | No | No routine | No (cannot author/decide) | Cond | No (prod) | No |
| internal notes | No (internal-only) | No | R/W (author) | No | No | No | Cond | No (prod) | No |

Notes: Karen Review is the authoritative case output and is Karen-owned. Only content explicitly released to the client is visible to the Client; drafts and internal notes are internal-only (L4) and never exposed to Client, Support, or Admin in routine operation. AI may prepare drafts but never authors or publishes a conclusion.

### 6.7 AI session fields

Fields: prompts, summaries, confidence, escalation flags, internal reasoning/processing metadata; and the distinction between AI output shown to the client vs internal-only AI output. Sensitivity: L4 internal-only for reasoning/metadata; L2–L3 for content processed.

| Field | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| prompts (inputs) | No (internal) | No | R (Karen-assistant context) | No | No routine | Read/write task-scoped | Cond | No (prod) | No |
| summaries (proposals) | Only if released | No | R (case) | No | No routine | Produce (proposal) | Cond | No (prod) | No |
| confidence | No (raw) | No | R (case) | No | No | Produce | Cond | No (prod) | No |
| escalation flags | No (raw) | No | R (queue) | R (crisis routing only) | No routine | Set (auto) | Cond | No (prod) | No |
| internal reasoning / processing metadata | No (internal-only) | No | Limited (only what aids review) | No | No | Internal | Cond (audited) | No (prod) | No |
| AI output shown to client | R (own, client-facing only) | No | R | No | No routine | Produce (client-facing scope) | Cond | No (prod) | No |
| internal-only AI output | No | No | R (if it aids review) | No | No | Internal | Cond | No (prod) | No |

Notes: client-facing AI output is navigational/supportive and scoped to the Client's own context; internal-only AI output (raw reasoning, Karen-assistant internals) is L4 and never shown to the Client. AI processes only the fields needed for the current task. AI never sets durable case urgency/status and never writes case or refund decisions.

### 6.8 Red flag event fields

Fields: category (physical/medical vs psychological/crisis), routing_target, requires_immediate_review, notification_status, signals (brief non-diagnostic), confidence, client_response_sent. Sensitivity: L3/L4 (safety-sensitive), L5 once audited. Per RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1, events are append-only and immutable.

| Field | Client | Care Recipient | Karen | Support/Anna | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| category (physical/medical) | No (raw event) | No | R (routed to Karen) | No (unless routed) | Access grants only | Create only (append-only) | Cond | No (prod) | No |
| category (psychological/crisis) | No (raw event) | No | No (unless routed) | R (routed to Anna/Support) | Access grants only | Create only | Cond | No (prod) | No |
| routing_target | No | No | R (own queue) | R (own queue) | No content edit | Set (mechanical) | Cond | No (prod) | No |
| requires_immediate_review | No | No | R (durable urgency only Karen sets) | R (crisis queue) | No | Set (transient marker only) | Cond | No (prod) | No |
| notification_status | No | No | R (relevant) | R (relevant) | No | Set (auto) | Cond | No (prod) | No |
| signals (brief, non-diagnostic) | No (raw) | No | R (physical/medical) | R (psychological/crisis) | No | Create only | Cond | No (prod) | No |
| client_response_sent | R (sees the safety response) | No | R | R | No | Set (auto) | Cond | No (prod) | No |

Notes: red_flag_events are created by AI/System, append-only and immutable; no role edits or deletes them, and no role may suppress/downgrade a crisis notification (corrections are new events). Dual routing: physical/medical → Karen; psychological/crisis → Anna/Support. requires_immediate_review is a transient priority marker only; only Karen sets durable case urgency/status/route. Admin controls access (grants), never event content.

### 6.9 Payment / refund fields

Fields: payment status, processor_ref, refund status, refund reason, refund decision metadata. No card/bank data is stored in platform tables (L6 — external processor only). Sensitivity: L1 (status) / L2 (reason) / L5 (decision audit).

| Field | Client | Care Recipient | Karen | Support/Anna | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| payment status | R (own) | No | R (status only, no card data) | R/W (operational) | R (governance) | Auto (webhook) | R (Cond) | No (prod) | No |
| processor_ref | No (raw) | No | No | R (operational reconciliation) | R (governance) | Read/write (mechanical) | R (Cond) | No (prod) | No |
| refund status | R (own) | No | Context only (no execute) | R/W (execute authorized exception) | R (oversight) | Auto (execute authorized only) | R (Cond) | No (prod) | No |
| refund reason | R (own, as recorded) | No | Context only | R/W (records) | R | No (cannot author) | R (Cond) | No (prod) | No |
| refund decision metadata (decided_by/at, offer basis) | R (own, summary) | No | No (not Decision Owner) | Records execution | R (oversight) | No (never decides) | R (Cond, legal basis) | No (prod) | No |
| card/bank data | N/A — not stored | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

Notes: per REFUND_POLICY_V1, AI has no refund authority; the refund-exception Decision Owner is the authorized human/admin/legal process, Offer-bound. Support/Admin execute only authorized exceptions; Karen provides context only. Card/bank details are never in platform tables — only processor_ref is stored (L6 stays with the processor).

### 6.10 Audit log fields

Fields/event types: consent events, access events, deletion events, refund events, red-flag events, admin/support actions (actor, action, target, timestamp, metadata, offer/version, consent_fact). Sensitivity: L5 — immutable, append-only.

| Field/event | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| consent events | No direct (rights via export) | No | R (case scope) | R (scoped) | R + grant access | System writes | R (Cond, legal) | No (prod) | No |
| access events | No | No | R (case scope) | R (scoped) | R + grant | System writes | R (Cond) | No (prod) | No |
| deletion events | No (own confirmation only) | No | R (case scope) | R (scoped) | R + grant | System writes | R (Cond) | No (prod) | No |
| refund events | R (own summary) | No | R (case scope) | R (scoped) | R + grant | System writes | R (Cond) | No (prod) | No |
| red-flag events | No | No | R (case scope) | R (scoped crisis) | R + grant | System writes | R (Cond) | No (prod) | No |
| admin/support actions | No | No | R (relevant) | R (own) | R + grant | System writes | R (Cond) | No (prod) | No |

Notes: the Audit Log is immutable and append-only. System is the sole writer; no role — not even Admin — edits or deletes entries. Read access is scoped (Karen case-scope, Support scoped, Admin read + grant, Legal exceptional/audited). Every access grant and every read of sensitive audit data is itself audited.

### 6.11 Delivery / shipping fields (conditional / future only)

Fields: delivery_address (country, region, city, street, building, apartment, postal_code, recipient_name) and related shipping data. Sensitivity: L2.

Status: CONDITIONAL / FUTURE ONLY. Python Elixir (physical product) is not currently part of the licensed commercial platform sales. Therefore delivery/shipping fields are not collected, stored, or exposed in the MVP. They are documented here only so that, if and when physical-product sales are licensed and added, access rules already exist.

| Field | Client | Care Recipient | Karen | Support | Admin | AI/System | Legal | Dev | Public |
|---|---|---|---|---|---|---|---|---|---|
| delivery_address / shipping (FUTURE) | R/W (own) — Future | No | No (not case substance) — Future | R (fulfillment) — Future | R (governance) — Future | Task-scoped (label) — Future | Cond — Future | No (prod) | No |

Notes: until physical-product sales are licensed, this group must not be active. When activated, delivery data is operational (Support fulfillment) and is not medical substance; Karen has no routine need for it.

## 7. Developer / engineer access boundaries

- Developers must not access production medical data by default. Development and testing use non-production environments with synthetic or de-identified data.
- Any access to production data is exceptional: it must be explicitly approved, narrowly scoped, time-bound, justified by a specific operational/debugging need, and fully audited; it is revoked when the task ends.
- Production medical substance (L3), internal-only AI/Karen content (L4), and raw card/bank data (L6 — not stored anyway) are out of scope for routine engineering work.
- Schema, structure, and non-identifying telemetry are available to engineers; identifiable client/medical content is not.
- Break-glass access (if ever defined) is an emergency, audited, multi-party-approved exception — never a standing privilege.

## 8. AI / System access boundaries

- AI/System processes only what is necessary for the current task (task-scoped minimization); it does not retain or surface fields beyond that task.
- AI never decides: no case decisions, no urgency/status changes, no refund decisions, no consent creation/override. AI may recognize, structure, summarize, translate, draft, route, and escalate only.
- Internal reasoning/processing metadata is internal-only (L4) and never shown to the Client.
- Client-facing AI is scoped to the Client's own navigational/support context plus approved knowledge; Karen-assistant AI is scoped to case material for proposals to Karen.
- System is deterministic: it records consent, stores uploads, activates periods on confirmed full payment, executes only already-authorized refunds, and writes the Audit Log; it makes no judgment and never mutates the Audit Log.
- AI/System must not depend on retaining personally identifiable client data; methodology value derives from non-identifying, aggregated, or de-identified signals (per DATA_RETENTION_AND_DELETION_POLICY_V1).

## 9. Public / visitor access boundaries

- Public visitors see only L0 public content: landing, about/trust, how-it-works, pricing, contact, and legal/offer pages.
- No private field of any group (identity, Care Recipient, medical, questionnaire, messages, reviews, AI internals, red-flag events, payment, audit) is ever exposed to a visitor.
- Public pages make no result/remission/cure claims (per WEB_ARCHITECTURE_V1) and collect only what a visitor voluntarily submits to begin registration (handled by the auth provider).

## 10. Deletion and retention implications

Aligned with DATA_RETENTION_AND_DELETION_POLICY_V1 (canonical):

- Client self-service deletion permanently removes the account and all client-owned fields across every group above — identity, Care Recipient data, medical documents and their substance, questionnaires, messages, reviews released to the client, AI session content, and payment records — and revokes access. Archived data is not exempt.
- Field-level access ends at deletion: once deleted, Karen and staff lose access because the data no longer exists; the client's deletion right takes priority over organizational retention.
- Archival (after 5 years of inactivity) is a visibility state, not deletion; archived fields remain recoverable by authorized staff and excluded from active views.
- The only durable trace of a deletion is a minimal, non-identifying deletion-event row in the immutable Audit Log (actor, timestamp, reason) — never the deleted personal/medical content.
- Legal/Compliance reads of audit/consent records must reconcile the immutable Audit Log with the obligation to remove personal data on deletion; the Audit Log proves process integrity without retaining deleted personal content.

## 11. Supabase / RLS implications (conceptual — no SQL, no RLS here)

Documented as future implementation intent only; no SQL is written and no RLS policy is implemented:

- Tenant isolation: client-owned rows are scoped to the owning auth identity; cross-client field reads are impossible by design.
- Column/field-level controls: L3 medical-substance fields and L4 internal-only fields require stricter scoping than L1 operational fields on the same row, so Support can see operational columns without seeing substance columns. This implies column-level access (views, column privileges, or policy-enforced projections) at implementation time.
- Care Recipient data scoped to the owning Client and authorized internal roles only; no independent Care Recipient identity.
- Audit Log table is append-only and immutable; no role has update/delete; read access is policy-scoped and itself audited.
- Payments store only processor_ref + amount/currency/status; no card/bank columns exist to protect (L6 stays with the processor).
- Red-flag events are append-only; routing-based read scoping (Karen vs Support) is enforced at implementation.
- Developer/non-production isolation and any exceptional production access are operational controls enforced outside the row policies (environment separation, approvals, audit).

These are implications only; actual RLS/column policies are a future, separately-authorized step.

## 12. Admin dashboard implications

- The Admin dashboard exposes governance fields (access/permissions, knowledge publication/visibility, legal/guardrail configuration, Audit Log read + access grants) but does not surface routine medical substance (L3) or internal-only AI/Karen content (L4).
- Admin can grant/revoke Audit Log access and oversee blocks; Admin can never edit or delete Audit Log entries.
- Any place where Admin could technically reach substance must be justified, minimized, and audited; the default Admin view excludes medical substance.

## 13. Karen dashboard implications

- The Karen workspace surfaces case-scoped substance needed to review and support the case: medical document content, translations, summaries (as proposals with confidence), case messages, questionnaire/assessment inputs, and the Karen Review authoring surface (drafts, internal notes, final conclusions).
- Karen sees payment status only (never card/bank data, never processor internals beyond status) and provides refund context only (no execution, not the refund Decision Owner).
- Karen's urgent queue surfaces physical/medical red_flag_events; Karen alone sets durable case urgency/status/route. Drafts and internal notes are internal-only and not exposed to the Client.

## 14. Client cabinet implications

- The Client cabinet exposes only the Client's own fields and the Care Recipient data they are responsible for: own identity, own Care Recipient data, own documents (content they uploaded), own questionnaire/assessment, own messages and released Karen conclusions, own payment/refund status, and own consent records.
- Internal-only content (AI raw reasoning, Karen drafts/internal notes, raw confidence, raw red-flag event records, processor_ref, Audit Log internals) is never shown in the cabinet.
- A Care Recipient has no cabinet and no independent access; everything is mediated through the responsible adult Client (21+).
- The cabinet provides self-service deletion (confirmation + consequence explanation + reason) and pre-payment refund/no-refund disclosure, consistent with the retention and refund policies.

## 15. Required updates to other documents

This policy is the canonical field-level access source. The following documents should reference it and align (documentation-only; applied in those documents, not as final legal text):

- ACCESS_CONTROL_V1 — add a field-level access layer that refines role-level access; note that Support excludes medical substance by default, Admin governs without routine substance, and field groups follow FIELD_LEVEL_ACCESS_POLICY_V1.
- DATA_MODEL_V1 — annotate entities/fields with sensitivity levels (L0–L6) and note that access is field-scoped per this policy.
- SUPABASE_SCHEMA_V1 — note future column-level/field-level access implications (substance vs metadata separation, append-only audit, processor-ref-only payments) per this policy; no SQL.
- NEXTJS_STRUCTURE_V1 — note that UI surfaces (cabinet, Karen, Support, Admin) must project only the fields each role may see, and that internal-only fields are never sent to the client.
- MVP_BUILD_PLAN_V1 — make field-level access enforcement (substance/metadata separation, developer non-production isolation, audit of sensitive access) an MVP-required pre-launch gate.

## 16. Legal review required

This document is not legal text. Final data-protection, consent, medical-confidentiality, and cross-border obligations — and the precise definition of "explicitly authorized" exceptional access to medical substance — must be drafted and approved through legal/compliance review and aligned with the Public Offer and privacy policy before production. Where this document and the Offer/privacy policy differ, the legally reviewed text governs.

## 17. Self-check

- Support must not see medical substance unless explicitly authorized — HELD. L3 substance fields are No for Support by default; only operational/technical/delivery metadata is visible; exceptions are Cond (authorized + audited).
- Admin governs access but does not need routine access to medical substance — HELD. Admin rows are governance/access-grant; medical substance is excluded from routine Admin view.
- Developers must not access production medical data by default — HELD. §7 sets non-production/synthetic default; production access is exceptional, time-bound, approved, audited.
- AI/System can process only what is necessary for the current task — HELD. §8 task-scoped minimization; internal reasoning internal-only; AI never decides.
- Public visitors see no private data — HELD. §9 limits visitors to L0 public content.
- Client can see their own data and Care Recipient data they are responsible for — HELD. Owner/own scoping throughout; cabinet implications in §14.
- Care Recipient under 21 does not get independent access — HELD. Care Recipient = No independent access across all groups (§6.2, §3).
- Karen can see case substance needed for review and support — HELD. Karen case-scoped R on substance; §13.
- Audit Log must be immutable and access controlled — HELD. L5 append-only; System sole writer; no edit/delete; scoped, audited reads (§6.10, §11).
- Payment card/bank details must not be stored in platform tables — HELD. L6 external-only; only processor_ref stored (§6.9, §11).
- No SQL, no code, no RLS implementation — HELD. Documentation-only; implications documented as future, separately-authorized steps.

End of FIELD_LEVEL_ACCESS_POLICY_V1.

