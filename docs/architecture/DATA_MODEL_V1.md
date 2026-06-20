# Data Model V1 — Pythons Center Platform

Status: CONCEPTUAL DATA ARCHITECTURE ONLY (no SQL, no Supabase schema, no code, no infrastructure)
Date: 2026-06-15
Center / platform: Python Method (slogan: «Реабилитация без границ» — Rehabilitation Without Borders; the slogan is not the legal/platform name), web-first platform.

Sources of truth used:
- Constitution of the Center (purpose, values, Karen's role, AI role, boundaries, scaling)
- Constitution of Cases
- Constitution of the Knowledge Center
- WEB_ARCHITECTURE_V1
- 09 Case Lifecycle Architecture
- Client Cabinet Architecture
- Admin Panel Architecture
- Payment Architecture
- Support System Architecture
- 07 AI & Karen Operational Roles
- Safety / Red-flags Protocol
- Public Offer v2

Non-goals (explicit): no Telegram model is reused; no legacy agents are carried over; this is a fresh web-first conceptual model only.

---

## 1. Modeling principles (derived from the Constitution)

1. One person = one account = one continuous case. New accounts and new independent cases are never created on repeat engagement.
2. The case is the single continuous history of the person's journey; it is never silently lost. Support status changes over its life, and per DATA_RETENTION_AND_DELETION_POLICY_V1 a case may become archived after long inactivity (archived ≠ deleted; recoverable by authorized staff) and is fully removed on client self-service deletion. Updated to align with DATA_RETENTION_AND_DELETION_POLICY_V1.
3. Karen is the single source of decisions about a case. AI never decides; it prepares, structures, translates, drafts, and escalates.
4. No guessing. AI records confidence levels and must never invent data.
5. No result guarantees. The model stores facts, statuses, and consent — never promises of outcomes.
6. Not medical. The platform stores client-provided medical documents as data; it does not produce diagnoses or treatment as system output.
7. Consent is explicit and logged. Document storage, AI processing, and case-history storage require recorded consent.
8. History is preserved for as long as the account exists and is retained for historical continuity and recoverability, not discarded by routine system behavior. Archival after long inactivity hides a case from active views without deleting it, and the client's self-service deletion right (per DATA_RETENTION_AND_DELETION_POLICY_V1) permanently removes the account, cases, questionnaires, uploads, and access. Updated to align with DATA_RETENTION_AND_DELETION_POLICY_V1.

---

## 2. Entities

For each entity: purpose, data owner, key fields (conceptual), relationships, access levels.
Access roles referenced: Client, Karen, Karen-AI-Assistant, Client-AI, Admin/Support (Anna at MVP), System.

### 2.1 Client
- Purpose: the human being supported by the Center (the natural person).
- Data owner: Client (personal identity data belongs to the client).
- Key fields: client_id; first_name; last_name; middle_name (optional); email; phone (mandatory); delivery_address (country, region, city, street, building, apartment, postal_code, recipient_name); preferred_language; current_direction (Recovery / Rehabilitation / Preservation); created_at.
- Relationships: one Client has exactly one Account; one Client has exactly one Case.
- Access: Client (read/write own profile); Karen (read, in case context); Admin/Support (read for organizational/technical help); Client-AI (read to assist).

### 2.2 Account
- Purpose: the authentication and access identity for the platform (web-first login).
- Data owner: Client (it is their access), administered by System.
- Key fields: account_id; client_id; auth_identity (provider/SSO reference — credentials NOT stored as plaintext, handled by auth provider); status (active / suspended); created_at; last_login_at.
- Relationships: one Account belongs to one Client; one Account is the gateway to one Case.
- Access: Client (own account); Admin/Support (status/troubleshooting, not credentials); System (auth).
- Note: account creation and password handling are performed by the person via the auth provider; the model does not store raw credentials.

### 2.3 Case
- Purpose: the single, continuous history of the person's journey in the Center (one ongoing case per person; archivable after long inactivity and removable on client deletion per DATA_RETENTION_AND_DELETION_POLICY_V1, not a case that can never be archived).
- Data owner: shared — Client owns their submitted content; Karen owns the decisions/conclusions within it; the Center is custodian of the case as a whole.
- Key fields: case_id; client_id; case_number; current_case_status (account_created / awaiting_onboarding / case_formed / ready_for_review / analysis_complete / support_active / support_inactive / support_resumed / support_completed); current_direction; created_at.
- Relationships: one Case belongs to one Client; has many Case Periods, Assessments, Messages, Document Uploads, Karen Reviews, Payments, Subscriptions, Support Tickets, AI Sessions.
- Access: Client (read own case surfaces in cabinet); Karen (full working view in admin panel); Karen-AI-Assistant (read to prepare summaries); Admin/Support (organizational/technical view, not case decisions).

### 2.4 Case Period
- Purpose: a single bounded period of paid active support within the person's single continuous case.
- Data owner: System (records facts); governed by Payment and Subscription.
- Key fields: case_period_id; case_id; product_type (support_5_weeks / support_15_weeks); start_date; end_date; status (active / completed); linked_payment_id.
- Relationships: many Case Periods belong to one Case; each links to a Payment; activity (messages to Karen) is allowed only while a Case Period is active.
- Access: Client (read own periods); Karen (read in case card); Admin/Support (manage exceptions); System (lifecycle transitions).

### 2.5 Assessment
- Purpose: the free, one-time, orientational preliminary resource-state assessment given by Karen (not a full analysis).
- Data owner: Client owns submitted inputs; Karen owns the orientational evaluation output.
- Key fields: assessment_id; case_id; status (submitted / in_queue / preliminary_evaluation_provided); submitted_inputs_ref; karen_orientational_evaluation; provided_at; confidence_note.
- Relationships: belongs to one Case; one free Assessment per client (one-time); precedes optional paid support.
- Access: Client (read own); Karen (author of evaluation); Client-AI (structure inputs, never evaluate); Admin/Support (queue handling).
- Constraint: orientational only; not a full review; no recommendations; no continuing connection to Karen.

### 2.6 AI Session
- Purpose: a record of AI interaction — either Client-AI (cabinet) or Karen-AI-Assistant (admin panel) — used for support, navigation, summaries, drafts, and document processing.
- Data owner: System/Center (AI is a tool of the Center); content attributed to the role context.
- Key fields: ai_session_id; case_id; ai_role (client_ai / karen_assistant_ai); purpose (navigation / organizational / emotional_support / document_processing / summary / draft_answer / command); inputs_ref; outputs_ref; confidence_level (high / medium / low where applicable); escalated_to_karen (bool); created_at.
- Relationships: belongs to a Case; may reference Document Uploads, Messages, Knowledge Entries; may produce a draft for a Karen Review or Message.
- Access: Client (sees Client-AI interactions in cabinet); Karen (sees Karen-AI-Assistant interactions); Admin/Support (operational/debug, limited); Karen-AI cannot send case answers without Karen's approval.
- Constraint: AI never decides on the case; no guessing; low confidence must be surfaced; case questions are escalated to Karen.

### 2.7 Karen Review
- Purpose: Karen's decisions, conclusions, recommendations, and corrections about a case — the substantive case output.
- Data owner: Karen (this is the single source of case decisions).
- Key fields: karen_review_id; case_id; type (primary_conclusion / recommendation / update / correction / follow_up); content; related_documents_refs; status (draft / published); published_at.
- Relationships: belongs to one Case; may be drafted with help from a Karen-AI-Assistant AI Session; visible to the Client in "Karen's recommendations/conclusions".
- Access: Karen (create/publish); Client (read after publication; recommendations remain available after support ends); Karen-AI-Assistant (prepare drafts only); Admin/Support (no authorship).
- Constraint: a conclusion does not exist separately from the case; only Karen authorizes sending.

### 2.8 Message
- Purpose: a unit of the in-cabinet request system ("обращение") — the single-window communication where the system routes to AI, Support, or Karen.
- Data owner: author (Client or responder); stored in the Case.
- Key fields: message_id; case_id; ticket_id (optional link to Support Ticket); author_role (client / client_ai / karen / support); body; attachments_refs; routing_target (client_ai / support / karen); status (received / ai_answering / forwarded_to_support / forwarded_to_karen / awaiting_karen / draft_prepared / awaiting_karen_approval / sent / closed); created_at.
- Relationships: belongs to a Case; may belong to a Support Ticket; may attach Document Uploads; case-substantive replies require a Karen Review/approval.
- Access: Client (own messages); Karen (case messages); Client-AI (navigational/organizational/emotional replies only); Admin/Support (organizational/technical messages).
- Constraint: single message window; client does not choose the recipient; the system routes. Messages to Karen are available only during an active Case Period.

### 2.9 Document Upload
- Purpose: client-provided documents (analyses, imaging, discharge summaries, pathology, operation protocols, etc.).
- Data owner: Client (the document belongs to the client; consent governs processing).
- Key fields: document_id; case_id; uploaded_by (client); type (CBC / blood_chemistry / physician_report / discharge / MRI / CT / PET-CT / pathology / histology / operation_protocol / other); original_file_ref; detected_language; translation_ref (optional); quality_flag (ok / low_quality); confidence_level (high / medium / low); linked_message_id (optional); uploaded_at.
- Relationships: belongs to a Case; may link to a Message; processed by AI Sessions; referenced by Karen Reviews.
- Access: Client (upload/read own); Karen (read in case); Karen-AI-Assistant (read to process/translate/summarize, never invent); Admin/Support (technical upload help only).
- Constraint: AI must not build conclusions on unreadable documents; low-quality originals are flagged for Karen's manual check.

### 2.10 Payment
- Purpose: a single payment transaction record for a product.
- Data owner: System/Center (transaction record); processed externally by the payment provider (Stripe).
- Key fields: payment_id; case_id; product (preliminary_assessment_free / support_5_weeks / support_15_weeks); amount; currency; method; status (awaiting_payment / awaiting_confirmation / confirmed / manual_check_required / payment_error / declined); offer_version_accepted; consent_timestamp; linked_case_period_id (on confirmation); created_at.
- Relationships: belongs to a Case; on confirmation activates/creates a Case Period; appears as a row in payment history.
- Access: Client (read own payment history); Admin/Support (handle exceptions, manual checks, non-standard payments); System (provider webhooks); Karen (sees product/status in case card, not card data).
- Constraint: no card/bank data is stored in this model; payment processing is delegated to the provider. Offer acceptance + consent are recorded with the payment.

### 2.11 Subscription
- Purpose: the conceptual link between a confirmed payment and an active support entitlement (the right to active support for a period). At MVP these are fixed-term products, not recurring billing.
- Data owner: System/Center.
- Key fields: subscription_id; case_id; product_type (support_5_weeks / support_15_weeks); status (active / completed / not_active / resumed); start_date; end_date; source_payment_id; case_period_id.
- Relationships: belongs to a Case; corresponds 1:1 with a Case Period; derived from a confirmed Payment.
- Access: Client (read own); Karen (read in case card); Admin/Support (manage); System (auto-complete by end_date).
- Note: modeled as fixed-term entitlement; recurring/auto-renew is deferred to Version 2.

### 2.12 Support Ticket
- Purpose: an organizational/technical or case request thread ("обращение") with a lifecycle and priority, used to route and track client requests.
- Data owner: shared — Client opens it; the responding role (Support or Karen) progresses it.
- Key fields: ticket_id; case_id; opened_by (client); category (navigational / organizational_technical / new_documents / case_question); priority (normal / priority / critical); status (new / awaiting_review / in_progress / awaiting_client / answer_prepared / sent / completed); assigned_role (client_ai / support / karen); created_at.
- Relationships: belongs to a Case; contains Messages; case_question tickets escalate to Karen; technical tickets go to Support (Anna at MVP).
- Access: Client (own tickets); Karen (case/priority/critical queues); Admin/Support (organizational/technical queues); Client-AI (navigational/organizational auto-answers).
- Constraint: critical priority can be set ONLY by Karen (protects against urgency-button abuse). At MVP there is no separate "urgent" button for clients.

### 2.13 Knowledge Entry
- Purpose: a unit of the Center's knowledge base — Karen-approved materials/templates and patterns derived from real cases; used by Karen-AI-Assistant.
- Data owner: Karen / the Center (methodology belongs to Karen and the Center).
- Key fields: knowledge_entry_id; type (approved_recommendation / instruction / link / message_template / organizational_answer / extracted_pattern); content; status (Draft / Karen Review / Karen Approved / Published / Archived); created_by (author); reviewed_by (Karen); approved_by_karen (Karen owns content/methodology approval); published_by_admin (Admin owns publication/visibility only); source (case-derived / manually_authored); version; created_at.
- Relationships: referenced by AI Sessions and Messages (as approved material); patterns may be derived from Cases/Karen Reviews.
- Access: Karen (create / modify / approve / revoke — owner of methodology and content approval); Admin (publish / unpublish / archive / version / manage visibility and access — publication and technical governance only, never content approval); Karen-AI-Assistant (use approved entries only); Client-AI (use only approved client-facing materials); Client (sees only material sent to them, not the library).
- Constraint: AI must not create new methodological rules as Center knowledge; only Karen-approved content becomes Knowledge.
- Governance (canonical): Karen owns knowledge and methodology approval (create / modify / approve / revoke); Admin owns only publication, visibility, access, and versioning and must not approve methodology, clinical logic, or knowledge content. Lifecycle: Draft → Karen Review → Karen Approved → Published → Archived. Every approval, revocation, publication, and archival action is auditable.

### 2.14 Audit Log
- Purpose: an immutable record of significant actions for accountability, safety, and legal defensibility (e.g., consent capture, offer acceptance, payment status changes, Karen publications, escalations, access events).
- Data owner: System/Center.
- Key fields: audit_id; case_id (optional); actor_role; actor_id; action; target_entity; target_id; metadata (e.g., offer_version, confidence, priority change); timestamp.
- Relationships: references any entity; append-only.
- Access: Admin (read); Karen (read relevant case events); System (write); Client (not direct — but consent/offer records support the client's rights).
- Constraint: append-only; supports consent logging required by onboarding and the offer; not used for surveillance beyond operational/legal need.

---

## 3. Source of truth (per data domain)

- Identity & contact data: Client (the person) — source of truth for who they are and their address.
- Account/auth: the auth provider/System — source of truth for access; raw credentials are never stored here.
- Case decisions, conclusions, recommendations, route: Karen (Karen Review) — the single source of truth for anything substantive about the case.
- Client-submitted documents & medical inputs: Client (Document Upload, onboarding inputs) — source of truth for what the client provided; AI never overrides or invents.
- AI summaries/translations/drafts: AI Session — a derived, non-authoritative layer; never a source of truth for case decisions; always carries confidence and is subordinate to Karen.
- Payments & entitlements: payment provider + System (Payment, Subscription, Case Period) — source of truth for money and access periods.
- Knowledge base: Karen/the Center (Knowledge Entry) — source of truth for approved methodology materials.
- Action history & consent: Audit Log — source of truth for "what happened and when".

---

## 4. Data ownership by party

What belongs to the Client:
- Identity and contact data; delivery address; preferred language.
- Uploaded documents and medical inputs.
- Their own messages and the content they submit.
- Their consent records (as their rights), their payment history (as their record of purchases).
- The decision whether to follow recommendations.

What belongs to Karen:
- Karen Reviews: conclusions, recommendations, updates, corrections — the substantive case output.
- The methodology and approved Knowledge Entries.
- Case decisions and the determination of significance of new data.
- Critical-priority designation.

What belongs to AI (as a tool of the Center):
- AI Session records: summaries, translations, drafts, navigation/organizational/emotional-support outputs, document-processing results with confidence levels.
- No ownership of case decisions; AI output is derived and non-authoritative.

What belongs to Administration (Admin/Support — Anna at MVP):
- Operational handling of payments, registration/login issues, file-upload problems, non-standard payment situations, organizational questions.
- Queue and exception management; library/admin management.
- No ownership of case decisions, conclusions, or medical interpretation.

---

## 5. Text ERD (relationships)

Notation: (1) one, (M) many.

- Client (1) --- (1) Account
- Client (1) --- (1) Case
- Case (1) --- (M) Case Period
- Case (1) --- (M) Assessment            [free assessment: one-time per client]
- Case (1) --- (M) AI Session
- Case (1) --- (M) Karen Review
- Case (1) --- (M) Message
- Case (1) --- (M) Document Upload
- Case (1) --- (M) Payment
- Case (1) --- (M) Subscription
- Case (1) --- (M) Support Ticket
- Case (1) --- (M) Audit Log entries

- Payment (1) --- (1) Subscription        [a confirmed payment yields one entitlement]
- Subscription (1) --- (1) Case Period     [entitlement corresponds to a bounded period]
- Payment (1) --- (0..1) Case Period       [Case Period is created/activated on confirmation]

- Support Ticket (1) --- (M) Message
- Message (M) --- (0..M) Document Upload   [attachments]
- AI Session (M) --- (0..M) Document Upload [processing]
- AI Session (M) --- (0..M) Knowledge Entry [uses approved material]
- AI Session (0..M) --- (0..1) Karen Review [drafts a review for Karen's approval]
- Karen Review (M) --- (0..M) Document Upload [references]
- Knowledge Entry (0..M) <-- derived from -- Case / Karen Review [pattern extraction, Karen-approved]

- Audit Log references any entity (append-only).

Cross-cutting:
- Knowledge Entry and Audit Log are Center-level but always reference a Case where applicable.
- Client-AI and Karen-AI-Assistant are both represented through AI Session (distinguished by ai_role); they are tools, not owners.

---

## 6. Self-check against the Constitution

1. One person = one account = one case — HELD. Client 1:1 Account, Client 1:1 Case; repeat engagement adds Case Periods/Payments, never new accounts/cases.
2. Case continuity and recoverability — HELD. Each person has one continuous case; status changes over its life; history is preserved while the account exists. Per DATA_RETENTION_AND_DELETION_POLICY_V1 a case may be archived after long inactivity (archived ≠ deleted; recoverable by authorized staff) and is removed on confirmed client self-service deletion. Updated to align with DATA_RETENTION_AND_DELETION_POLICY_V1.
3. Karen is the single source of case decisions — HELD. Karen Review is the only authoritative case output; AI Session is explicitly non-authoritative; Messages with case substance require Karen approval.
4. AI does not decide; no guessing; transparent confidence — HELD. AI Session carries confidence_level and escalated_to_karen; Knowledge constraint forbids AI-created methodology.
5. No result guarantees — HELD. No entity stores promises/guarantees; only facts, statuses, consent.
6. Not a medical organization — HELD. Documents are stored as client data; no entity produces diagnosis/treatment as system output; case substance is Karen's human judgment.
7. Consent is explicit and logged — HELD. Payment stores offer_version_accepted + consent_timestamp; Audit Log records consent events; onboarding consents referenced.
8. Boundaries protect client and Center — HELD. Critical priority restricted to Karen; Support cannot decide case matters; access levels separate organizational help from case decisions.
9. Knowledge grows from real cases under Karen's control — HELD. Knowledge Entry is Karen-approved; patterns are case-derived; AI only uses approved entries.
10. Web-first, no legacy — HELD. No Telegram/agent entities; Account is web auth; no orchestration-layer constructs.

---

## 7. Contradictions and open questions found

No hard contradictions with the Constitution were found. The following are tensions/decisions to confirm before physical modeling (not blockers):

1. Subscription vs Case Period overlap: at MVP both represent the same bounded entitlement. Two entities were requested, so both are kept, but they are near-1:1. Decide whether to keep them separate (future recurring billing) or merge later. Flagged, not resolved here.
2. Assessment cardinality: the free assessment is "one-time per client", but a permanent case may see future product changes. Modeled as one free Assessment per client; confirm whether any repeat orientational assessment is ever allowed.
3. Message vs Support Ticket: the docs describe a single "обращение" system. Here Support Ticket is the thread and Message is the unit; case_question tickets route to Karen, technical to Support. Confirm this two-level split matches the intended single-window UX (it is a data split, not a UX split).
4. Audit Log and client rights: the offer/privacy terms govern retention and deletion. The model keeps history indefinitely by default; confirm deletion/retention rules from the offer before physical design.
5. Consent storage location: consent is referenced on Payment and in Audit Log and onboarding; confirm the canonical consent record so it is not duplicated inconsistently.

---

## 8. Age policy and Client vs Care Recipient

Per **AGE_AND_CARE_RECIPIENT_POLICY_V1**, the data model distinguishes the responsible **Client** from the **Care Recipient**:

- **Client** — adult account holder (age 21+); owns account, consent, payment, and responsibility. Every case has exactly one responsible Client.
- **Care Recipient** — the person whose condition / documents are being reviewed (may be a minor, dependent, or other person under the Client responsibility); not an account holder and never the responsible decision-maker.
- **Case** links one Client and one Care Recipient and carries `case_for` (self / child / dependent) and a `self_case` flag.
- Care Recipient attributes: full name, date of birth, age, relationship to client, country / location, reason for representation, plus Client confirmations (representative confirmation, data consent, responsibility acknowledgment).
- For a self case, the Care Recipient may equal the Client or be represented by the `self_case` flag.
- Consent, payment, and responsibility records always reference the **Client**, never the Care Recipient.

See AGE_AND_CARE_RECIPIENT_POLICY_V1.md for the full canonical age policy (independent registration 21+ only) and the Client / Care Recipient model.

---

## 9. Constraints honored

- No SQL, no Supabase schema, no code, no infrastructure.
- No Telegram model reused; no legacy agents carried over.
- Conceptual, web-first data architecture only.
- No existing documents modified; this file only adds DATA_MODEL_V1.md.

---

## 10. Data retention, archival, and deletion (synchronized with DATA_RETENTION_AND_DELETION_POLICY_V1)

DATA_RETENTION_AND_DELETION_POLICY_V1 is the canonical source of truth for archive, deletion, account closure, and case closure. Where any earlier statement in this document conflicts with that policy, the policy governs. The §1 modeling principles and the §6 self-check in this document have been rewritten to align with this policy (no contradictory wording remains): a case is never silently lost, but it can be archived after long inactivity (archived ≠ deleted; recoverable by authorized staff) and is fully removed on client self-service deletion.

### 10.1 Archive vs deletion vs account closure vs case closure

- **Case closure** — the operational end of case work (a support period ends or Karen marks the case complete). Closure changes status only; it does **not** remove data and does **not** close the account.
- **Archive** — a case hidden from active operational queues and excluded from active work views after inactivity, but still stored and recoverable by authorized staff. **Archived does not mean deleted.**
- **Account closure** — the lifecycle end-state of an account; for a departing client it is realized through self-service **deletion**.
- **Deletion** — permanent, irreversible removal of the account and its case data, initiated by the client through self-service, after confirmation, consequence explanation, and a deletion reason.

### 10.2 Five-year archival rule

A case becomes **archived after 5 years of inactivity** (measured from the last meaningful activity on the case). Archival is a visibility/queue state, not a deletion event, and never auto-deletes client data.

### 10.3 Client self-service deletion

A client does **not** need to contact support to delete their account. Deletion is **self-service from the client cabinet**, gated by confirmation, consequence explanation, and a deletion reason.

### 10.4 Deletion removes account / cases / questionnaires / uploads / access

On confirmed deletion: the **account** is deleted, all **cases** (active and archived), **questionnaires/assessment inputs**, and **uploaded documents** are deleted, and **access is revoked**. Archival status does not protect data from deletion. Only a minimal, non-identifying deletion-event record (reason + timestamp) is retained in the Audit Log, never the deleted personal content.

### 10.5 Returning user after deletion

Deletion is final. If the person returns later, **they create a new account and start a new onboarding process**. There is no restoration, no merge with a previously deleted account, and no recovery of deleted cases, questionnaires, or documents.

### 10.6 Karen historical access applies only to non-deleted clients

Karen's full historical view (previous cases, documents, reviews, communication) — including for clients returning after months or years — applies **only while the account exists**. Once a client deletes their account, the historical record is gone and cannot be surfaced. The client's deletion right takes priority over retaining a case for organizational history.

### 10.7 AI and methodology must not depend on retaining PII

AI and methodology development must **not** depend on retaining personally identifiable client data. Methodology and AI value must survive the deletion of any individual client's identifiable data and derive only from non-identifying, aggregated, or de-identified signals. This resolves the prior open item (§7 / DATA_MODEL_OPEN_DECISIONS_V1) that consent/retention must be reconciled against legal text and the privacy policy before persisting.

See DATA_RETENTION_AND_DELETION_POLICY_V1.md for the full canonical policy.
