# SUPABASE_SCHEMA_V1

**Status:** Architectural physical-model document — maps DATA_MODEL_V1 and ACCESS_CONTROL_V1 onto a Supabase/Postgres physical structure.
**Scope:** Schema architecture only. **No database is created, no SQL files are written, Supabase is not connected, and no code is produced.** This document *describes* tables, fields, types, keys, enums, indexes, audit fields, and access/RLS implications conceptually.

**Sources of grounding:**
- DATA_MODEL_V1, DATA_MODEL_OPEN_DECISIONS_V1
- AI_GUARDRAILS_V1, AUTHORITY_MATRIX_V1, ACCESS_CONTROL_V1
- Payment Architecture, Client Cabinet Architecture, Admin Panel Architecture, Support System Architecture

---

## 1. Conventions

- **Primary keys:** `uuid` (default `gen_random_uuid()`), named `id`.
- **Foreign keys:** `<entity>_id uuid` referencing the parent table's `id`.
- **Audit fields (every table):** `created_at timestamptz`, `updated_at timestamptz`, `created_by uuid` (actor reference), `updated_by uuid`. The immutable Audit Log itself is append-only and is never updated.
- **Soft archival:** where ACCESS_CONTROL_V1 calls for archival rather than deletion, tables carry `archived_at timestamptz` and `archived_by uuid` instead of hard deletes.
- **Enums:** modeled as Postgres enum types (or constrained text), listed in §4.
- **Money:** stored as integer minor units (`amount_cents bigint`) + `currency text`; **no card/bank data is stored** (handled by the payment processor, per Payment Architecture and privacy rules).
- **Naming:** snake_case tables and columns.

---

## 2. Supabase Auth vs public tables

- **Supabase Auth (`auth.users`)** holds authentication identity only: email, hashed credentials, auth provider, session/MFA metadata. The platform never stores raw passwords in public tables.
- **`public.client`** holds the domain profile and links 1:1 to `auth.users` via `auth_user_id uuid` (FK to `auth.users.id`). All domain data (cases, documents, payments, messages) lives in **public** tables keyed to `client`, never in Auth.
- **Card/bank data** lives with the external payment processor — not in Auth and not in public tables.

---

## 3. Tables (14 entities + 1 required future entity)

### 3.1 client
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| auth_user_id | uuid FK → auth.users.id | 1:1, unique |
| full_name | text | |
| contact_email | text | mirror of auth email (display) |
| phone | text | optional |
| locale | text | preferred language |
| status | client_status enum | active / inactive |
| + audit fields | | |

- **Relationships:** 1:1 with account; 1:1 with one permanent case (one person = one account = one case).
- **Access/RLS implication:** a client row is readable/updatable only by its own `auth_user_id`; Karen/Support/Admin read per scope. No cross-client read.

### 3.2 account
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → client.id | unique (one account per person) |
| status | account_status enum | active / suspended / blocked |
| + audit fields | | |

- **RLS implication:** own-account read for client; Support may update status (block) with audit; Admin oversight.

### 3.3 case
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → client.id | unique (one permanent case) |
| status | case_status enum | intake / under_review / active / paused / closed |
| urgency | case_urgency enum | normal / elevated / critical (set by Karen) |
| + audit fields | | |

- **Decision owner:** Karen. **RLS implication:** client reads status-level only; Karen full case scope; status/urgency writes are Karen-only and audited.

### 3.4 case_period
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → case.id | |
| product | product_type enum | assessment / support_5w / support_15w |
| started_at | timestamptz | set after valid payment |
| ended_at | timestamptz | |
| status | period_status enum | scheduled / active / completed / cancelled |
| subscription_id | uuid FK → subscription.id | kept separate from billing (DATA_MODEL_OPEN_DECISIONS_V1) |
| + audit fields | | |

- **Note:** Case Period (factual accompaniment) is deliberately distinct from Subscription/Payment (financial-contractual).

### 3.5 assessment
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → client.id | |
| case_id | uuid FK → case.id | |
| is_repeat | boolean | repeat only by Karen/Admin authorization |
| authorized_by | uuid | required if is_repeat |
| status | assessment_status enum | requested / prepared / delivered |
| + audit fields | | |

- **Rule:** one-time free per client; repeats manual only (no auto-trigger).

### 3.6 ai_session
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → case.id | |
| ai_kind | ai_kind enum | client_facing / karen_assistant |
| summary | text | proposal content (never a decision) |
| confidence | confidence_level enum | high / medium / low |
| escalated | boolean | true if escalated to Karen |
| + audit fields | | |

- **RLS implication:** internals hidden from client; Karen-assistant outputs visible to Karen. AI writes proposals only, never decisions.

### 3.7 karen_review
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → case.id | |
| karen_id | uuid | author (Karen) |
| decision | text | the case decision/recommendation |
| released_to_client | boolean | controls client visibility |
| + audit fields | | |

- **Decision owner:** Karen. **RLS implication:** client sees only `released_to_client = true` content; raw notes hidden.

### 3.8 message
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → case.id | |
| sender_role | actor_role enum | client / karen / ai / support |
| body | text | substantive case communication |
| is_red_flag | boolean | flagged acute content |
| + audit fields | | |

- **Note:** Message (case communication) is separate at data level from support_ticket (technical), though UX shows one window.

### 3.9 document_upload
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → client.id | |
| case_id | uuid FK → case.id | |
| storage_path | text | Supabase Storage object reference |
| original_language | text | |
| quality_flag | doc_quality enum | ok / low_quality / unreadable |
| archived_at | timestamptz | archival not hard delete |
| + audit fields | | |

- **RLS implication:** own documents for client; Karen/Karen-assistant AI read for case work; Support sees technical state only; deletion of case-relevant docs requires Karen confirmation; all deletions audited.

### 3.10 payment
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → client.id | |
| subscription_id | uuid FK → subscription.id | |
| amount_cents | bigint | minor units |
| currency | text | |
| processor_ref | text | external processor token/reference only |
| status | payment_status enum | pending / paid / failed / refunded |
| + audit fields | | |

- **Privacy:** **no card/bank numbers stored** — only the processor reference. Refunds executed by Support; Karen sees status only.

### 3.11 subscription
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → client.id | |
| product | product_type enum | |
| status | subscription_status enum | active / cancelled / expired |
| current_period_start | timestamptz | |
| current_period_end | timestamptz | |
| + audit fields | | |

- **Note:** financial-contractual record; kept distinct from case_period.

### 3.12 support_ticket
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → client.id | |
| category | ticket_category enum | payment / login / upload / technical / other |
| status | ticket_status enum | open / in_progress / resolved |
| body | text | technical/organizational only |
| + audit fields | | |

- **RLS implication:** own tickets for client; Support full; no case-substance.

### 3.13 knowledge_entry
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text | |
| body | text | |
| status | knowledge_status enum | draft / approved / archived (lifecycle below) |
| created_by | uuid | author (Karen; may be drafted via AI/Support proposal) |
| reviewed_by | uuid | Karen reviewer (required future ownership field) |
| approved_by_karen | uuid | **Karen** — owner of methodology/content approval (required future field) |
| published_by_admin | uuid | **Admin** — publication/visibility only, not approval (required future field) |
| + audit fields | | created_at / updated_at / archived_at / archived_by |

- **Knowledge governance (canonical):** **Karen** owns create / modify / approve / revoke of knowledge content and methodology; **Admin** owns only publication, visibility, access, and versioning. Admin must not approve methodology, clinical logic, or knowledge content.
- **Knowledge lifecycle:** Draft → Karen Review → Karen Approved → Published → Archived. (The current `knowledge_status` enum collapses this to draft/approved/archived; the richer lifecycle and the ownership fields above are documented as required future schema additions — no SQL here.)
- **RLS implication:** clients/AI read only `approved`/`published`; **Karen approves content** (drafts may be proposed by Karen/Support/AI); **Admin publishes/unpublishes/archives/versions and manages visibility** but never approves content. Every approval, revocation, publication, and archival action emits an `audit_log` row.

### 3.14 audit_log
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid | who acted (or system) |
| actor_role | actor_role enum | |
| action | text | action key |
| entity_type | text | affected entity |
| entity_id | uuid | affected row |
| consent_fact | jsonb | canonical consent record when applicable |
| occurred_at | timestamptz | |

- **Immutability:** **append-only; no `updated_at`, no deletes.** System is the sole writer. Canonical source of consent fact (DATA_MODEL_OPEN_DECISIONS_V1). Read access scoped (Karen case-scope, Support scoped, Admin read + grant); access grants are themselves audited. Retention: indefinite as architectural intention, subject to legal/Offer reconciliation before physical implementation.

---

### 3.15 red_flag_event (required future entity — not yet implemented)

> **No SQL and no schema implementation here.** This documents a **required future entity** mandated by RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1 (canonical) and tracked in DATA_MODEL_TO_SUPABASE_MAPPING_V1. The table does not exist yet; the protocol makes it MVP-required. Created by AI/System; **append-only and immutable**.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → case.id | event belongs to a case |
| message_id | uuid FK → message.id | triggering message (nullable) |
| detected_by | enum | client_facing_ai / system |
| category | enum | physical_medical / psychological_crisis |
| signals | jsonb | brief non-diagnostic observation only (no diagnosis/treatment) |
| confidence | confidence_level enum | detection confidence, never medical certainty |
| **requires_immediate_review** | boolean | transient priority marker; **NOT** durable case urgency/status |
| **routing_target** | enum | karen (physical/medical) / support (psychological/crisis) |
| **notification_status** | enum | pending / sent / acknowledged |
| notified_at | timestamptz | when notification was emitted |
| client_response_sent | boolean | whether immediate AI safety response was delivered |
| created_at | timestamptz | append-only; event is immutable |
| created_by | uuid | actor reference (AI/System) |

- **Append-only.** Never edited to express a case decision; corrections are new events, not mutations.
- **requires_immediate_review lives only on the event.** It must never be written into `case.case_urgency` or `case.case_status` by AI/System. **Only Karen** sets durable `case_urgency` / `case_status` / support route.
- **routing_target** is mechanical: physical/medical → Karen, psychological/crisis → Support/Anna.
- The event references the case but does **not** own or alter case state.

---

## 4. Enums / status types

- **client_status:** active, inactive
- **account_status:** active, suspended, blocked
- **case_status:** intake, under_review, active, paused, closed
- **case_urgency:** normal, elevated, critical
- **product_type:** assessment, support_5w, support_15w
- **period_status:** scheduled, active, completed, cancelled
- **assessment_status:** requested, prepared, delivered
- **ai_kind:** client_facing, karen_assistant
- **confidence_level:** high, medium, low
- **doc_quality:** ok, low_quality, unreadable
- **payment_status:** pending, paid, failed, refunded
- **subscription_status:** active, cancelled, expired
- **ticket_category:** payment, login, upload, technical, other
- **ticket_status:** open, in_progress, resolved
- **knowledge_status:** draft, approved, archived
- **actor_role:** client, ai, karen, support, admin, system
- **red_flag_category:** physical_medical, psychological_crisis _(required future entity — RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1)_
- **red_flag_detected_by:** client_facing_ai, system _(required future)_
- **red_flag_routing_target:** karen, support _(required future)_
- **red_flag_notification_status:** pending, sent, acknowledged _(required future)_

---

## 5. Indexes (architectural intent)

- FK columns indexed: `account.client_id`, `case.client_id`, `case_period.case_id`, `assessment.case_id`, `ai_session.case_id`, `karen_review.case_id`, `message.case_id`, `document_upload.case_id`, `payment.client_id`, `subscription.client_id`, `support_ticket.client_id`.
- Status filters: partial/btree indexes on `case.status`, `case.urgency`, `case_period.status`, `payment.status`, `subscription.status`, `support_ticket.status`, `knowledge_entry.status`.
- Red-flag fast path: index on `message.is_red_flag` and `case.urgency = critical` for Karen's priority queue.
- Audit queries: index on `audit_log.entity_type, entity_id` and `audit_log.occurred_at`.
- Uniqueness: unique on `client.auth_user_id`, `account.client_id`, `case.client_id`.

---

## 6. Audit fields convention

Every mutable table carries `created_at / updated_at / created_by / updated_by`; archival-capable tables add `archived_at / archived_by`. The `audit_log` table is the immutable event ledger and uses only `occurred_at` (append-only). Sensitive actions (consent, payments, refunds, blocks, status/urgency changes, knowledge approvals, legal/guardrail changes, Audit Log access grants, document deletions) emit an `audit_log` row.

---

## 7. Access / RLS implications (conceptual, not policy code)

- **Tenant isolation:** client-owned tables are scoped to `auth.uid() = client.auth_user_id` (described conceptually; no RLS policy is written here).
- **Karen scope:** case-scoped read/write on case-related tables; payment status-only.
- **Support scope:** account/payment/ticket/technical state; no case substance.
- **Admin scope:** governance tables + Audit Log read/grant; cannot mutate Audit Log; for `knowledge_entry`, Admin publishes/unpublishes/archives/versions and manages visibility but does **not** approve content (Karen approves).
- **AI scope:** client-facing AI → navigation/status + approved knowledge; Karen-assistant AI → case material read + propose; neither writes decisions; neither edits Audit Log.
- **System:** sole writer of Audit Log; deterministic mechanical writes.

---

## 8. Age policy and Care Recipient (future schema)

Per **AGE_AND_CARE_RECIPIENT_POLICY_V1**, the following are documented for **future** implementation only — no SQL is written and no schema file is changed here:

- Future `care_recipient` entity with fields: `full_name`, `date_of_birth`, `age`, `relationship_to_client`, `country`, `reason_for_representation`, `client_is_authorized_representative` (bool), `care_recipient_data_consent` (bool), `responsibility_acknowledgment` (bool).
- Future fields on the case / owning entity: `case_for` (enum: self / child / dependent), `self_case` (bool), `client_id` (responsible Client, age 21+), `care_recipient_id` (linked Care Recipient).
- Future audit fields capturing who accepted the offer, signed consent, and made payment (always the Client).
- Row-level access must restrict Care Recipient data to the owning Client and authorized internal roles (Karen / Admin).

> No SQL written, no schema modified by this note. See AGE_AND_CARE_RECIPIENT_POLICY_V1.md for the full policy.

---

## 9. Self-check against ACCESS_CONTROL_V1 and AI_GUARDRAILS_V1

| Requirement | Source | Status |
|---|---|---|
| Client own-data isolation; one account/one case | ACCESS_CONTROL_V1 | **HELD** — unique FKs + tenant scope |
| Karen owns case decisions; status/urgency Karen-only | ACCESS_CONTROL_V1 | **HELD** — karen_review + case writes audited |
| AI read + propose only; never decides/guesses | AI_GUARDRAILS_V1 | **HELD** — ai_session stores proposals + confidence, escalates |
| Two AI types distinguished | AI_GUARDRAILS_V1 | **HELD** — ai_kind enum |
| Audit Log immutable, append-only, consent canonical | ACCESS_CONTROL_V1 / DATA_MODEL_OPEN_DECISIONS_V1 | **HELD** — append-only audit_log, consent_fact |
| No card/bank data stored; processor isolation | ACCESS_CONTROL_V1 / Payment Arch | **HELD** — only processor_ref + amount_cents |
| Case Period separate from Subscription | DATA_MODEL_OPEN_DECISIONS_V1 | **HELD** — distinct tables, FK link only |
| Message separate from Support Ticket | DATA_MODEL_OPEN_DECISIONS_V1 | **HELD** — separate tables |
| Assessment one-time; repeat manual | DATA_MODEL_OPEN_DECISIONS_V1 | **HELD** — is_repeat + authorized_by |
| Knowledge approved-only visible; **Karen approves content**, Admin publishes/manages only | ACCESS_CONTROL_V1 / CANONICAL_LIFECYCLE_STATUS_MODEL_V1 | **HELD** — knowledge_status + approved_by_karen / published_by_admin |
| Document deletion = archival, Karen-confirmed, audited | ACCESS_CONTROL_V1 | **HELD** — archived_at, audited |
| Red-flag priority path | Safety Protocol / AI_GUARDRAILS_V1 | **HELD** — is_red_flag + urgency index |
| Auth identity separate from domain data | ACCESS_CONTROL_V1 | **HELD** — auth.users vs public tables |

**No contradictions found** with ACCESS_CONTROL_V1 or AI_GUARDRAILS_V1. This document is an architectural schema description only — no database, no SQL files, no Supabase connection, no code.

After this document, the physical-model architecture is defined and ready for a future, separately-authorized implementation step.

---

## 10. Data retention and deletion (future schema implications — synchronized with DATA_RETENTION_AND_DELETION_POLICY_V1)

DATA_RETENTION_AND_DELETION_POLICY_V1 is canonical for archive, deletion, account closure, and case closure. The following are **future schema implications only** — no SQL is written, no database is created, no schema is implemented here. Where earlier conventions conflict (e.g. the §1 "soft archival" note), the policy governs and these implications extend it.

### 10.1 Future fields (documented, not implemented)

On the relevant case / account / deletion-tracking tables, future schema work will need to represent:

- **archived_at** `timestamptz` — when a case became archived (set after the five-year inactivity threshold). Archival is a visibility state, not a delete.
- **last_activity_at** `timestamptz` — last meaningful activity on the case; the basis for evaluating the **five-year archival rule**.
- **deletion_requested_at** `timestamptz` — when the client initiated self-service deletion.
- **deletion_reason** `text` — the reason captured at confirmed deletion (retained in non-identifying form; see audit treatment below).
- **deleted_at** `timestamptz` — when the deletion cascade completed.
- **deletion_actor** `uuid` / actor reference — who performed the deletion (normally the client; an authorized process actor if applicable).
- **deletion_audit_event_id** `uuid` — FK to the immutable `audit_log` row recording the deletion event.
- **account_recreated_as_new** `boolean` — marks that a returning person starts a brand-new account/onboarding; deletion is final and no old data is restored or merged.

### 10.2 Deletion cascade (conceptual)

On confirmed deletion, the cascade removes the account and all client-owned rows — cases (active and archived), assessments/questionnaire inputs, document_upload rows **and their Supabase Storage objects (storage_path)**, messages, support_tickets, ai_session content, and access — and revokes authentication. Archival status (`archived_at`) does not exempt rows from the cascade.

### 10.3 Audit-log treatment for deletion events

The `audit_log` table remains append-only and immutable. A deletion emits a single audit_log row capturing **actor, action, timestamp, and deletion_reason**, plus the affected account/case identifiers, but it must **not** retain the deleted personal content (no case substance, no questionnaire answers, no document bodies). The `deletion_audit_event_id` on the deletion-tracking record points to this row. The prior "Retention: indefinite ... subject to legal/Offer reconciliation" note (§3.14) is now bounded by the client's deletion right: personal data is removed on confirmed deletion regardless of indefinite-retention intent, while the non-identifying deletion-event record persists.

### 10.4 No PII dependency

Any future de-identification, analytics, or methodology tables must be designed so they do not depend on retaining personally identifiable client data after deletion (per the policy and DATA_MODEL_V1 §10.7).

No SQL written, no schema modified by this note. See DATA_RETENTION_AND_DELETION_POLICY_V1.md for the full canonical policy.
