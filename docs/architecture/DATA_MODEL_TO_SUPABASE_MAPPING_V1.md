# DATA_MODEL_TO_SUPABASE_MAPPING_V1

> Status: Draft v1 — P0 architecture contradiction closure
> Scope: Documentation only. No code, no SQL, no schema-file changes.
> Project / platform name: **Python Method**  ·  Legal payee entity: **Pythons & Co.**

---

## 1. Purpose and scope

This document aligns the **conceptual data architecture** (DATA_MODEL_V1) and the **canonical lifecycle/status model** (CANONICAL_LIFECYCLE_STATUS_MODEL_V1) with the **physical Supabase schema** (SUPABASE_SCHEMA_V1) before any database implementation.

It is **documentation-only P0 closure work**. It does **not** introduce code, does **not** write SQL, and does **not** modify schema files. Its output is a checklist of what must change in the physical schema and what still needs a decision.

Source documents: DATA_MODEL_V1, SUPABASE_SCHEMA_V1, CANONICAL_LIFECYCLE_STATUS_MODEL_V1, ACCESS_CONTROL_V1, AUTHORITY_MATRIX_V1.

SUPABASE_SCHEMA_V1 currently defines 14 tables: client, account, case, case_period, assessment, ai_session, karen_review, message, document_upload, payment, subscription, support_ticket, knowledge_entry, audit_log.

---

## 2. Canonical entity mapping

| Conceptual entity | Supabase representation | Status | Note |
|---|---|---|---|
| User | Supabase Auth (auth.users) + account table | partial | No user_status enum exists; canonical separates Registered User vs Client. Action needed. |
| Client | client table | mapped | client_status enum too small (see section 4). |
| Case | case table | mapped | Missing case_type field and several canonical statuses. |
| Payment | payment table | mapped | payment_status missing not_required, partially_refunded. |
| Support | support_ticket table | mapped | ticket_status missing waiting_on_user, escalated_to_karen, closed. |
| Message / Request | message table | partial | No message_status enum; routing statuses missing. |
| Document Upload | document_upload table | mapped | Missing document type, translation reference. doc_quality exists. |
| AI Session | ai_session table | mapped | Purpose/input/output reference fields need confirmation. |
| Karen Review | karen_review table | mapped | Draft vs published distinction needs field-level access. |
| Knowledge Entry | knowledge_entry table | mapped | Approval-owner (Karen) vs publication-owner (Admin) split missing. |
| Audit Log | audit_log table | mapped | Canonical source of consent and status-change events. |
| Red Flag Event | (no table) | missing | No dedicated red_flag_event table in schema. Action needed. |

---

## 3. Field-by-field mapping table

Legend for status column: mapped / missing / deferred / intentionally collapsed.

| Conceptual field | Supabase table | Supabase column | Status | Reason | Required action |
|---|---|---|---|---|---|
| user identity | auth.users | id | mapped | Auth-owned identity. | None. |
| user_status | account | (none) | missing | No registered-vs-client status at user level. | Add user_status enum + column. |
| account state | account | account_status | mapped | active/suspended/blocked present. | None. |
| client_status | client | client_status | missing | Only active/inactive; canonical adds prospective/returning/archived. | Extend enum. |
| client.current_direction | client | (none) | missing | Recovery direction not represented. | Add current_direction field. |
| client.delivery_address | client | (none) | deferred | Only needed if Pythons & Co. ships Python Elixir. | Decision: Anna (see section 6). |
| case_status | case | case_status | missing | Names differ (intake/under_review vs created/awaiting_start/...); missing awaiting_client, completed, reopened. | Reconcile enum to canonical. |
| case_type | case | (none) | missing | No free/5w/15w/repeat/resumed type field. | Add case_type enum + column. |
| case_urgency | case | case_urgency | mapped | normal/elevated/critical present; Karen-owned (see section 7). | None (enforce owner). |
| payment_status | payment | payment_status | missing | Missing not_required, partially_refunded. | Extend enum. |
| payment processor reference | payment | (confirm) | deferred | Stripe reference; field-level access required. | Confirm column + access rule. |
| support ticket_status | support_ticket | ticket_status | missing | Missing waiting_on_user, escalated_to_karen, closed. | Extend enum. |
| message_status | message | (none) | missing | No message routing status enum. | Add message_status enum + column. |
| ticket/request linkage | message / support_ticket | (none) | missing | No explicit linkage between message thread and ticket. | Add linkage reference. |
| document type | document_upload | (none) | missing | No medical/id/other type field. | Add document_type. |
| document translation reference | document_upload | (none) | missing | No reference to translated copy. | Add translation_ref. |
| document quality/confidence | document_upload | doc_quality | mapped | ok/low_quality/unreadable present. | Confirm sufficiency. |
| ai session purpose | ai_session | (confirm) | deferred | Purpose/input/output refs need confirmation. | Confirm fields. |
| ai_kind | ai_session | ai_kind | mapped | client_facing/karen_assistant present. | None. |
| confidence_level | ai_session | confidence_level | mapped | high/medium/low present. | None. |
| karen review draft | karen_review | (confirm) | deferred | Draft vs published state needs field-level access. | Confirm + access rule. |
| knowledge approval owner | knowledge_entry | (none) | missing | No explicit Karen approval owner vs Admin publication. | Add approval_owner + publication fields. |
| knowledge_status | knowledge_entry | knowledge_status | mapped | draft/approved/archived present. | None. |
| audit metadata | audit_log | (fields) | mapped | Canonical consent/status-change source. | Confirm immutability. |
| red_flag_event | (none) | (none) | missing | No table/structure. | Create red_flag_event model (section 5/7). |

---

## 4. Status enum mapping

CANONICAL_LIFECYCLE_STATUS_MODEL_V1 is the source of truth. Mismatches vs SUPABASE_SCHEMA_V1:

**user_status** — Canonical: registered, active_observer, converted_to_client, suspended, closed. Schema: (none). **Mismatch:** no user-level status exists; add enum.

**client_status** — Canonical: prospective, active, inactive, returning, archived. Schema: active, inactive. **Mismatch:** missing prospective, returning, archived.

**case_status** — Canonical: created, awaiting_start, in_progress, awaiting_client, paused, completed, closed, reopened. Schema: intake, under_review, active, paused, closed. **Mismatch:** different names and missing awaiting_start, awaiting_client, completed, reopened. Requires reconciliation decision.

**payment_status** — Canonical: not_required, pending, paid, failed, refunded, partially_refunded. Schema: pending, paid, failed, refunded. **Mismatch:** missing not_required, partially_refunded.

**support_status (ticket_status)** — Canonical: open, in_progress, waiting_on_user, escalated_to_karen, resolved, closed. Schema: open, in_progress, resolved. **Mismatch:** missing waiting_on_user, escalated_to_karen, closed.

**message_status** — Canonical: submitted, unread_by_karen, in_review_by_karen, answered, closed. Schema: (none). **Mismatch:** no message_status enum exists; add it.

---

## 5. Missing fields

Required conceptual fields not represented in the current Supabase schema:

- delivery_address (client) — deferred pending Anna decision (see section 6).
- current_direction (client) — recovery direction.
- case_type (case) — free_preliminary_analysis / paid_support_5w / paid_support_15w / repeat / resumed.
- message routing status (message) — message_status enum.
- ticket/request linkage — reference between message thread and support_ticket.
- document type (document_upload) — medical / id / other.
- document translation reference (document_upload).
- document quality/confidence — doc_quality exists; confirm it covers confidence needs.
- AI session purpose/input/output references (ai_session) — confirm fields.
- red_flag_event structure — no table; must be created.
- knowledge approval owner (knowledge_entry) — Karen approval vs Admin publication.

---

## 6. Deprecated or questionable fields

- **delivery_address** — Questionable. Python Elixir is **not** part of the licensed commercial platform yet, and the platform does not sell/ship it through Pythons & Co. at this stage. delivery_address should **not** be added until shipping is a real, licensed flow. **Decision required: Anna.**
- Any field implying a sellable Python Elixir product — must not be modeled until legal/licensing is resolved. **Decision required: Karen/Anna/legal.**
- Legacy/Telegram-derived fields — none should be carried into this schema; flag and exclude if found.

---

## 7. Red flag data model

Two clearly separated concepts:

- **red_flag_event** — created by AI/System. A record that a potential red flag was detected, with detector, timestamp, confidence, and reference to the case/message. AI/System may create these events.
- **durable case urgency/status** — owned **only by Karen** (case_urgency, case_status). These are the official, durable state of the case.

**Rule:** AI must **not** directly change official case urgency or status. AI/System may only create a red_flag_event and escalate; Karen reviews and sets durable urgency/status. This must be enforced at access-control and field-ownership level.

---

## 8. Knowledge approval mapping

Canonical split for knowledge_entry:

- **Karen approves methodology/knowledge** — content correctness and methodological approval (knowledge_status: draft -> approved is Karen's authority).
- **Admin manages publication, visibility, access, and technical governance** — where/whether approved knowledge is published and who can see it.

**Action:** add an approval_owner (Karen) distinct from publication/visibility controls (Admin), so the two authorities are not collapsed into one field.

---

## 9. Access-control implications

Fields requiring **field-level access** controls (per ACCESS_CONTROL_V1 and AUTHORITY_MATRIX_V1):

- medical document content — highly restricted; Karen/authorized only.
- document metadata — restricted; minimization applies.
- delivery address — restricted (if ever added).
- payment processor reference — restricted; never client-exposed.
- Karen review drafts — visible to Karen only until finalized.
- AI session internals (inputs/outputs) — restricted; not client-facing.
- audit log metadata — read-restricted; immutable.
- red flag events — restricted; Karen/Support escalation scope only.

---

## 10. Required Supabase schema changes (checklist)

Before any SQL/RLS implementation, the physical schema must be updated to:

- [ ] Add user_status enum + column (registered, active_observer, converted_to_client, suspended, closed).
- [ ] Extend client_status (add prospective, returning, archived).
- [ ] Reconcile case_status to canonical set (decision on rename vs map).
- [ ] Add case_type enum + column on case.
- [ ] Add current_direction on client.
- [ ] Extend payment_status (add not_required, partially_refunded).
- [ ] Extend ticket_status (add waiting_on_user, escalated_to_karen, closed).
- [ ] Add message_status enum + column on message.
- [ ] Add message <-> support_ticket linkage reference.
- [ ] Add document_type and translation_ref on document_upload.
- [ ] Confirm/clarify ai_session purpose/input/output reference fields.
- [ ] Create red_flag_event table (AI/System-created), separate from Karen-owned case urgency/status.
- [ ] Add knowledge_entry approval_owner (Karen) vs publication/visibility (Admin) fields.
- [ ] Confirm payment processor reference column + restricted access.
- [ ] Decide on delivery_address (defer unless shipping flow is licensed).

---

## 11. Open decisions

- **delivery_address / shipping:** Add only if Pythons & Co. sells/ships Python Elixir. Decision: Anna.
- **case_status reconciliation:** rename schema enum to canonical, or maintain a mapping layer. Decision: Karen/Anna.
- **Python Elixir as product entity:** blocked until legal/licensing resolved. Decision: Karen/Anna/legal.
- **Consent/case-history retention period:** verify against legal text and privacy policy before persisting (per DATA_MODEL_OPEN_DECISIONS_V1). Decision: legal.
- **doc_quality vs separate confidence field:** confirm whether doc_quality is sufficient. Decision: Karen.

---

## 12. Self-check

- No code changed. (ok)
- No database schema changed; no SQL written. (ok)
- Canonical lifecycle model (CANONICAL_LIFECYCLE_STATUS_MODEL_V1) used as source of truth for all status enums. (ok)
- All mismatches are either mapped, deferred, or marked for decision. (ok)
- Red flag separation (AI/System creates event; Karen owns durable urgency/status) preserved. (ok)
- Knowledge approval split (Karen approves; Admin publishes) recorded. (ok)
- Brand/entity facts honored (Python Method platform; Pythons & Co. payee; Python Elixir not a product yet; slogan not a name). (ok)

**Open contradictions:** None unresolved — each is mapped, deferred, or listed as an open decision.

---

*End of DATA_MODEL_TO_SUPABASE_MAPPING_V1.*
