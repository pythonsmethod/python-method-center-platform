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
| Case | case table | mapped | Missing case_type field; case_status names differ from canonical (see section 4). |
| Payment | payment table | mapped | payment_status missing not_required, partially_refunded. |
| Support | support_ticket table | mapped | ticket_status missing waiting_on_user, escalated_to_karen, closed. |
| Message / Request | message table | partial | No message_status enum; DATA_MODEL_V1 routing/status set collapsed to is_red_flag boolean (see section 4). |
| Document Upload | document_upload table | mapped | quality_flag exists; document type, translation reference, and separate confidence_level missing. |
| AI Session | ai_session table | partial | summary/confidence/escalated exist; purpose/inputs_ref/outputs_ref missing. |
| Karen Review | karen_review table | mapped | Draft vs published exists as released_to_client; needs field-level access. |
| Knowledge Entry | knowledge_entry table | partial | Methodology approval owner must be Karen, not Admin (see section 8 — contradiction in schema/ACCESS_CONTROL/AUTHORITY_MATRIX). |
| Audit Log | audit_log table | mapped | Canonical source of consent and status-change events. |
| Red Flag Event | (no table) | missing | No dedicated red_flag_event table in schema. Action needed. |

---

## 3. Field-by-field mapping table

Legend for status column: mapped / missing / deferred / intentionally collapsed / naming mismatch / partial.

| Conceptual field | Supabase table | Supabase column | Status | Reason | Required action |
|---|---|---|---|---|---|
| user identity | auth.users | id | mapped | Auth-owned identity. | None. |
| user_status | account | (none) | missing | No registered-vs-client status at user level. | Add user_status enum + column. |
| account state | account | account_status | mapped | active/suspended/blocked present. | None. |
| client_status | client | client_status | partial | Schema has client_status but only active/inactive; canonical adds prospective/returning/archived. | Extend enum. |
| client.current_direction | client | (none) | missing | Recovery direction not represented. | Add current_direction field. |
| client.delivery_address | client | (none) | deferred | Only needed if Pythons & Co. ships Python Elixir. | Decision: Anna (see section 6). |
| case_status | case | case_status | naming mismatch | Schema enum exists (intake/under_review/active/paused/closed) but names differ from canonical and misses awaiting_start, awaiting_client, completed, reopened. | Reconcile enum to canonical. |
| case_type | case | (none) | missing | No free/5w/15w/repeat/resumed type field. | Add case_type enum + column. |
| case_urgency | case | case_urgency | mapped (schema-side addition) | normal/elevated/critical present in schema; not a DATA_MODEL_V1 field — added physically; Karen-owned (see section 7). | None (enforce Karen ownership). |
| payment_status | payment | payment_status | partial | Schema enum exists but misses not_required, partially_refunded. | Extend enum. |
| payment processor reference | payment | processor_ref | mapped | processor_ref column exists; external token only, no card/bank data. Field-level access required. | Enforce restricted access (section 9). |
| support ticket_status | support_ticket | ticket_status | partial | Schema enum exists but misses waiting_on_user, escalated_to_karen, closed. | Extend enum. |
| message_status | message | (none) | intentionally collapsed | DATA_MODEL_V1 defines routing_target + rich status set; schema collapsed messaging state to is_red_flag boolean only — no message_status enum. | Add message_status enum + column. |
| ticket/request linkage | message / support_ticket | (none) | missing | DATA_MODEL_V1 has message.ticket_id; schema message has no link to support_ticket. | Add linkage reference. |
| document type | document_upload | (none) | missing | No medical/id/other type field. | Add document_type. |
| document translation reference | document_upload | (none) | missing | No reference to translated copy (DATA_MODEL_V1 has translation_ref). | Add translation_ref. |
| document quality | document_upload | quality_flag | mapped | quality_flag (ok/low_quality/unreadable) present. | None. |
| document confidence | document_upload | (none) | missing | DATA_MODEL_V1 defines a separate confidence_level on the document; schema has quality_flag only. | Add confidence_level (distinct from quality_flag). |
| ai session purpose | ai_session | (none) | missing | DATA_MODEL_V1 defines purpose; schema has summary only. | Add purpose field. |
| ai session input/output refs | ai_session | (none) | missing | DATA_MODEL_V1 defines inputs_ref/outputs_ref; schema has neither (only summary). | Add inputs_ref + outputs_ref. |
| ai_kind | ai_session | ai_kind | mapped | client_facing/karen_assistant present. | None. |
| confidence_level (ai) | ai_session | confidence | mapped | high/medium/low present. | None. |
| escalated | ai_session | escalated | mapped | boolean escalated-to-Karen present. | None. |
| karen review draft/published | karen_review | released_to_client | mapped | Draft vs published expressed as released_to_client boolean; field-level access required. | Enforce access rule (section 9). |
| knowledge approval owner | knowledge_entry | approved_by | naming mismatch / contradiction | Schema approved_by is documented as Admin; canonical rule is Karen approves methodology/knowledge substance. Contradiction to be corrected in schema/ACCESS_CONTROL/AUTHORITY_MATRIX (see section 8). | Re-designate approval owner = Karen; add separate Admin publication/visibility fields. |
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

**message_status** — Canonical: submitted, unread_by_karen, in_review_by_karen, answered, closed. Schema: (none — collapsed to is_red_flag boolean). **Mismatch:** no message_status enum exists; add it.

---

## 5. Missing fields

Required conceptual fields not represented in the current Supabase schema:

- delivery_address (client) — deferred pending Anna decision (see section 6).
- current_direction (client) — recovery direction.
- case_type (case) — free_preliminary_analysis / paid_support_5w / paid_support_15w / repeat / resumed.
- message routing status (message) — message_status enum (currently collapsed to is_red_flag boolean).
- ticket/request linkage — reference between message thread and support_ticket (DATA_MODEL_V1 message.ticket_id).
- document type (document_upload) — medical / id / other.
- document translation reference (document_upload) — translation_ref.
- document confidence (document_upload) — separate confidence_level; quality_flag exists but is distinct from confidence.
- AI session purpose/input/output references (ai_session) — purpose, inputs_ref, outputs_ref (schema has summary only).
- red_flag_event structure — no table; must be created.
- knowledge approval owner (knowledge_entry) — Karen approval owner missing; schema names Admin (contradiction, see section 8).

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

**Canonical rule (authoritative — not an open decision):**

- **Karen approves methodology and knowledge substance.** Methodological/content approval (knowledge_status: draft -> approved) is Karen authority. Karen is the approval owner of knowledge.
- **Admin manages publication, visibility, access, and technical governance** — where/whether approved knowledge is published and who can see it. Admin is **not** the owner of methodology approval.

**Contradiction to correct in other documents:** SUPABASE_SCHEMA_V1 (knowledge_entry.approved_by = Admin), ACCESS_CONTROL_V1, and AUTHORITY_MATRIX_V1 currently state that **Admin approves Knowledge Entries**. Per the canonical rule above, this is a **contradiction to be corrected in those documents**, not an unresolved decision. Methodology approval ownership must be reassigned to Karen there; Admin retains publication/visibility/access/governance only.

**Action:** model an approval_owner = **Karen** on knowledge_entry, distinct from Admin-owned publication/visibility/access controls, so methodological approval and publication governance are not collapsed into one field. Update schema/ACCESS_CONTROL/AUTHORITY_MATRIX to reflect Karen as the methodology approver.

---

## 9. Access-control implications

Fields requiring **field-level access** controls (per ACCESS_CONTROL_V1 and AUTHORITY_MATRIX_V1):

- medical document content — highly restricted; Karen/authorized only.
- document metadata — restricted; minimization applies.
- delivery address — restricted (if ever added).
- payment processor reference (processor_ref) — restricted; never client-exposed.
- Karen review drafts — visible to Karen only until finalized.
- AI session internals (purpose/inputs_ref/outputs_ref) — restricted; not client-facing.
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
- [ ] Add message_status enum + column on message (replace is_red_flag-only collapse).
- [ ] Add message <-> support_ticket linkage reference.
- [ ] Add document_type, translation_ref, and a separate confidence_level on document_upload (quality_flag already exists).
- [ ] Add ai_session purpose, inputs_ref, outputs_ref (summary/confidence/escalated already exist).
- [ ] Create red_flag_event table (AI/System-created), separate from Karen-owned case urgency/status.
- [ ] Re-designate knowledge_entry approval owner = Karen (methodology) and add separate Admin publication/visibility fields; correct schema/ACCESS_CONTROL/AUTHORITY_MATRIX accordingly.
- [ ] Confirm processor_ref restricted access (column already exists).
- [ ] Decide on delivery_address (defer unless shipping flow is licensed).

---

## 11. Open decisions

- **delivery_address / shipping:** Add only if Pythons & Co. sells/ships Python Elixir. Decision: Anna.
- **case_status reconciliation:** rename schema enum to canonical, or maintain a mapping layer. Decision: Karen/Anna.
- **Python Elixir as product entity:** blocked until legal/licensing resolved. Decision: Karen/Anna/legal.
- **Consent/case-history retention period:** verify against legal text and privacy policy before persisting (per DATA_MODEL_OPEN_DECISIONS_V1). Decision: legal.
> Note: Knowledge approval ownership is **no longer an open decision** — Karen approves methodology/knowledge substance; Admin owns publication/visibility/access/governance (see section 8). The "Admin approves" wording in schema/ACCESS_CONTROL/AUTHORITY_MATRIX is a contradiction to be corrected in those documents.

---

## 12. Self-check

- No code changed. (ok)
- No database schema changed; no SQL written; no schema files modified. (ok)
- Canonical lifecycle model (CANONICAL_LIFECYCLE_STATUS_MODEL_V1) used as source of truth for all status enums. (ok)
- All mismatches are either mapped, partial, naming-mismatch, intentionally collapsed, deferred, or marked for decision. (ok)
- Field-name accuracy corrected (processor_ref exists; ai_session purpose/inputs_ref/outputs_ref missing; document confidence_level missing while quality_flag exists; case_urgency is a schema-side addition). (ok)
- Red flag separation (AI/System creates event; Karen owns durable urgency/status) preserved. (ok)
- Knowledge approval set to canonical: Karen approves methodology/knowledge; Admin manages publication/visibility/access/governance; "Admin approves" flagged as contradiction to correct in other docs. (ok)
- Brand/entity facts honored (Python Method platform; Pythons & Co. payee; Python Elixir not a product yet; slogan not a name). (ok)

Open contradictions: Knowledge-approval ownership wording in SUPABASE_SCHEMA_V1 / ACCESS_CONTROL_V1 / AUTHORITY_MATRIX_V1 must be corrected to Karen (tracked above); all other items are mapped, deferred, or listed as open decisions.

End of DATA_MODEL_TO_SUPABASE_MAPPING_V1.
