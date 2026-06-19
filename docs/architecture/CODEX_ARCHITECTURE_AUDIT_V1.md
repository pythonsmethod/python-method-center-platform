# CODEX_ARCHITECTURE_AUDIT_V1

**Project:** Python Method / python-method-center-platform  
**Repository:** `pythonsmethod/python-method-center-platform`  
**Branch audited:** `main`  
**Audit date:** 2026-06-19  
**Auditor:** Codex  
**Scope:** Architecture documentation audit only. No code changes. Existing documents were not modified.

---

## 0. Preflight Result

Preflight passed.

Verified:

- Repository: `pythonsmethod/python-method-center-platform`
- Default branch: `main`
- Branch `main`: exists
- Required folders: present by file/direct-directory checks
  - `docs/architecture`
  - `docs/constitution`
  - `docs/foundation`
  - `docs/launch`
  - `docs/legal`
  - `docs/safety`
- Required key files: present
  - `docs/foundation/BRAND_IDENTITY_V1.md`
  - `docs/architecture/WEB_ARCHITECTURE_V1.md`
  - `docs/architecture/DATA_MODEL_V1.md`
  - `docs/architecture/AI_GUARDRAILS_V1.md`
  - `docs/architecture/AUTHORITY_MATRIX_V1.md`
  - `docs/architecture/ACCESS_CONTROL_V1.md`
  - `docs/architecture/SUPABASE_SCHEMA_V1.md`
  - `docs/architecture/NEXTJS_STRUCTURE_V1.md`
  - `docs/launch/MVP_BUILD_PLAN_V1.md`

Additional documents checked because the key files reference them:

- `docs/architecture/DATA_MODEL_OPEN_DECISIONS_V1.md`
- `docs/architecture/TECH_STACK_DECISION_V1.md`
- `docs/constitution/constitution_01_purpose_of_center.md`
- `docs/constitution/constitution_08_boundaries_of_responsibility.md`
- `docs/legal/Оферта новая версия 2.pdf` existence confirmed
- `docs/safety/Протокол безопасности и красных флагов.pdf` existence confirmed

Limitation: the GitHub connector available in this session could fetch known files, but could not list the full repository tree. Therefore this audit covers the required architecture package and referenced known documents, not an exhaustive unknown-file inventory.

---

## 1. Executive Verdict

**READY FOR DEVELOPMENT: MOSTLY YES**

The architecture package is substantially coherent and is strong enough to begin controlled development, especially Phase 0-2 from `MVP_BUILD_PLAN_V1`:

- repository/foundation freeze;
- Next.js skeleton;
- public website and static legal pages.

However, the answer is not `YES` because several contradictions must be resolved before implementing Supabase/Auth, case lifecycle, AI red-flag routing, payments, access control, and production launch.

The main blocking issues are:

1. Brand/name inconsistency between the canonical brand document and Constitution headings.
2. `DATA_MODEL_V1` and `SUPABASE_SCHEMA_V1` diverge in several core fields and status enums.
3. Red-flag criticality authority is inconsistent: some documents say only Karen sets urgency/criticality; others allow AI/System to auto-mark critical on red flags.
4. Knowledge approval ownership differs between `DATA_MODEL_V1` and `AUTHORITY_MATRIX_V1` / `ACCESS_CONTROL_V1`.
5. Public route scope in `WEB_ARCHITECTURE_V1` is not fully represented in `NEXTJS_STRUCTURE_V1`.
6. Legal/privacy retention remains explicitly unresolved before physical implementation.

**Practical verdict:** proceed with scaffold/public-site development only after opening fix tasks for the P0 items. Do not implement database schema, RLS, AI escalation, payments, or real client data flows until the P0 corrections below are made.

---

## 2. What Is Strong

### 2.1 Web-first reset is real

The new platform explicitly excludes legacy Telegram, legacy agents, old orchestration, and old environment values. `TECH_STACK_DECISION_V1`, `DATA_MODEL_V1`, and `MVP_BUILD_PLAN_V1` all state that this is a greenfield web-first platform.

### 2.2 Core authority principle is consistent

Across the architecture package, the central principle is stable:

- AI supports and structures.
- Karen makes case decisions.
- The client decides whether to participate and whether to follow recommendations.
- Support/Anna handles technical and organizational issues.
- Admin governs access, knowledge, legal text, and guardrails.

### 2.3 Medical/legal boundaries are well represented

The architecture consistently prohibits:

- diagnosis;
- treatment prescription;
- result/remission guarantees;
- replacing emergency services;
- AI guessing or inventing data;
- AI making decisions for Karen.

This is aligned with `constitution_08_boundaries_of_responsibility.md`.

### 2.4 MVP sequencing is sensible

`MVP_BUILD_PLAN_V1` correctly separates:

- pre-Supabase work;
- Supabase/Auth work;
- Stripe work;
- Karen workspace;
- Support/Admin MVP;
- guarded AI;
- launch audit.

This reduces premature coupling and is a good development spine.

---

## 3. Contradictions Between Documents

### 3.1 Brand identity vs Constitution naming

`BRAND_IDENTITY_V1.md` says the official project/platform name is **Python Method**, and `«Реабилитация без границ»` is slogan only and must not be used as the legal/platform name.

But the Constitution documents are titled and worded as `КОНСТИТУЦИЯ ЦЕНТРА «РЕАБИЛИТАЦИЯ БЕЗ ГРАНИЦ»`, and section 1 says the center is created under that name.

This is a direct naming contradiction between the brand foundation and the Constitution text.

**Risk:** legal, brand, public trust, and copy drift.

**Required fix:** add a short constitutional amendment or header note stating that the historical Constitution title uses the slogan, but the official name is now Python Method and the slogan remains only a slogan. Alternatively update Constitution headings if that is allowed.

### 3.2 `DATA_MODEL_V1` vs `SUPABASE_SCHEMA_V1` field/status drift

The conceptual model and physical schema diverge in ways that will create implementation ambiguity.

Examples:

- `Client` in `DATA_MODEL_V1` has mandatory phone, delivery address, preferred language, and current direction. `SUPABASE_SCHEMA_V1.client` has `full_name`, `contact_email`, optional phone, `locale`, and no delivery address/current direction fields.
- `Case.current_case_status` in `DATA_MODEL_V1` includes `account_created`, `awaiting_onboarding`, `case_formed`, `ready_for_review`, `analysis_complete`, `support_active`, `support_inactive`, `support_resumed`, `support_completed`. `SUPABASE_SCHEMA_V1.case_status` uses `intake`, `under_review`, `active`, `paused`, `closed`.
- `Subscription` statuses differ: data model says `active / completed / not_active / resumed`; schema says `active / cancelled / expired`.
- `Assessment` statuses differ: data model says `submitted / in_queue / preliminary_evaluation_provided`; schema says `requested / prepared / delivered`.
- `Message` in `DATA_MODEL_V1` has routing/status/ticket linkage fields; schema has only a minimal message row and does not model the detailed message lifecycle.
- `Support Ticket` in `DATA_MODEL_V1` has `case_id`, priority, assigned role, and status lifecycle. Schema uses `client_id`, category/status/body only.
- `Document Upload` in `DATA_MODEL_V1` includes document type, translation reference, quality flag, confidence, linked message. Schema omits several of these.
- `AI Session` in `DATA_MODEL_V1` has role, purpose, input/output refs, confidence, escalation; schema collapses this toward summary/confidence/escalated only.

**Risk:** developers will implement either the conceptual model or the physical model, and both will be “correct” according to different docs.

**Required fix:** create a mapping appendix or revise `SUPABASE_SCHEMA_V1` so each conceptual field is explicitly mapped to physical fields, deferred with reason, or intentionally collapsed for MVP.

### 3.3 AI red-flag authority contradiction

`AI_GUARDRAILS_V1` says that on red flags AI automatically directs the client to emergency help, reassures them, and marks the request critical / raises it to the top of Karen's queue.

`AUTHORITY_MATRIX_V1` includes a red-flag row allowing client-facing AI to auto-mark critical, with System routing.

But other parts of `AUTHORITY_MATRIX_V1`, `ACCESS_CONTROL_V1`, and `MVP_BUILD_PLAN_V1` say urgency/criticality is set only by Karen.

This is a real ambiguity:

- Does AI/System set `case.urgency = critical`?
- Or does AI/System create a provisional `red_flag_event` / priority queue marker, while Karen remains owner of case urgency?

**Risk:** unsafe emergency behavior or authority leakage from Karen to AI/System.

**Required fix:** split the concepts:

- AI/System may create a `red_flag_event` and place it in a critical queue immediately.
- Karen remains the only owner of durable case urgency/status decisions.

Then update `AI_GUARDRAILS_V1`, `AUTHORITY_MATRIX_V1`, `ACCESS_CONTROL_V1`, `SUPABASE_SCHEMA_V1`, `NEXTJS_STRUCTURE_V1`, and `MVP_BUILD_PLAN_V1` consistently.

### 3.4 Knowledge ownership / approval contradiction

`DATA_MODEL_V1` says Knowledge Entry is owned by Karen / the Center and lists Karen as author/approve.

`AUTHORITY_MATRIX_V1` says Admin is the decision owner for Knowledge Entry approval; Karen can only propose.

`ACCESS_CONTROL_V1` also gives Admin approval authority.

**Risk:** unclear governance over methodology and approved content.

**Required fix:** decide one of the following:

- Karen approves methodology/case-derived knowledge; Admin manages publication/access.
- Admin approves publication only after Karen approves methodology.
- Admin fully owns knowledge approval.

Then align all documents.

### 3.5 Public site page scope mismatch

`WEB_ARCHITECTURE_V1` includes MVP public pages:

- Home;
- About;
- How It Works;
- Programs/Pricing;
- Trust/Experience;
- FAQ;
- Legal;
- Contact/Support entry;
- Authentication entry.

`NEXTJS_STRUCTURE_V1` includes:

- `/`
- `/about`
- `/how-it-works`
- `/pricing`
- `/contact`
- `/legal/offer`
- `/legal/privacy`
- `/legal/terms`

There is no explicit `/faq` and no explicit `/trust` or `/experience` route.

**Risk:** public-site build may omit expected trust/FAQ surfaces, or developers may hide them inside other pages without a documented choice.

**Required fix:** either add routes to `NEXTJS_STRUCTURE_V1`, or state that FAQ and Trust/Experience are sections inside existing pages for MVP.

### 3.6 Public website vs full Next.js app boundary

`WEB_ARCHITECTURE_V1` is explicitly about the public website and says the site does not store medical data or run onboarding; the cabinet owns those flows.

`NEXTJS_STRUCTURE_V1` describes the full Next.js application, including cabinet, onboarding, Karen, support, admin, APIs, and AI gateways.

This is not a fatal contradiction, but the naming can confuse development: “web architecture” may be mistaken for the whole app architecture.

**Required fix:** rename/clarify in headers: `WEB_ARCHITECTURE_V1` = public website architecture; `NEXTJS_STRUCTURE_V1` = full web application structure.

### 3.7 Retention / deletion remains unresolved

`DATA_MODEL_OPEN_DECISIONS_V1` says Audit Log and key case history are retained indefinitely, provided this does not conflict with law and the Offer/privacy terms. It explicitly says this must be reconciled before physical implementation.

`SUPABASE_SCHEMA_V1` repeats indefinite retention as architectural intention.

**Risk:** privacy/legal implementation cannot proceed until retention/deletion rules are settled.

**Required fix:** before Supabase implementation, add a retention/privacy decision document or legal appendix that defines what can be deleted, archived, anonymized, exported, and retained indefinitely.

---

## 4. Constitution vs Architecture

### 4.1 Name conflict

As noted above, the Constitution still uses `«Реабилитация без границ»` as center name, while `BRAND_IDENTITY_V1` and most newer architecture documents state that **Python Method** is the official name and `«Реабилитация без границ»` is only a slogan.

This must be resolved because Constitution has higher normative weight than ordinary architecture.

### 4.2 Case decisions vs medical decisions need sharper wording

The Constitution says the center does not make medical decisions, does not diagnose, and does not prescribe treatment.

The architecture says Karen is the single source of “case decisions,” recommendations, route, urgency, and conclusions.

This is mostly consistent because the guardrails define the center's work as support/accompaniment, not medical treatment. But the wording can be risky unless every implementation and public-facing text makes clear that “case decision” means internal support-route/accompaniment decision, not medical decision.

**Required fix:** add a definition: “case decision” means platform/accompaniment decision inside Python Method boundaries; it is not diagnosis, treatment, prescription, or medical instruction.

---

## 5. `DATA_MODEL_V1` vs `ACCESS_CONTROL_V1`

Mostly aligned:

- Client owns own identity, documents, messages, payments.
- Karen owns case decisions.
- Support/Anna handles operational issues only.
- Admin owns governance.
- AI is read/propose/escalate only.
- Audit Log is immutable and canonical for consent.

Contradictions / gaps:

1. Knowledge approval owner differs, as described above.
2. `DATA_MODEL_V1` has richer Support Ticket and Message lifecycle fields than `ACCESS_CONTROL_V1` operationally describes.
3. Support can see upload technical state, but the data model does not define a separate technical metadata layer for documents. Without that, support may need access to records that also contain medical metadata.
4. Client profile includes delivery address in the data model, but access control does not separately classify address sensitivity or who can see it.

**Required fix:** add field-level access notes for high-sensitivity fields: delivery address, document metadata, document content, Karen Review drafts, AI Session internals, payment processor reference, and Audit Log metadata.

---

## 6. `AUTHORITY_MATRIX_V1` vs `AI_GUARDRAILS_V1`

Mostly aligned:

- AI never decides cases.
- AI escalates case questions to Karen.
- AI stops on missing data / low confidence.
- Red flags are handled immediately.
- Human override is preserved.

Contradiction:

- Durable urgency/criticality authority is unclear in red-flag cases.

Recommended resolution:

- AI can trigger emergency guidance and a critical red-flag queue event.
- Karen owns durable case urgency/status after reviewing the event.
- System records both: AI-triggered red flag and Karen-confirmed urgency/status.

---

## 7. `WEB_ARCHITECTURE_V1` vs `NEXTJS_STRUCTURE_V1`

Mostly aligned:

- Public site routes map to Next.js public route group.
- Cabinet, Karen, Support, Admin zones map to role-scoped route groups.
- Stripe webhooks and AI routes are server-side route handlers.
- Legal pages are public.
- Red-flag path is always reachable.

Mismatches:

1. FAQ and Trust/Experience are in `WEB_ARCHITECTURE_V1` but not explicit routes in `NEXTJS_STRUCTURE_V1`.
2. `WEB_ARCHITECTURE_V1` is public-site-only; `NEXTJS_STRUCTURE_V1` is full-app. The boundary is understandable but should be more explicit.
3. `WEB_ARCHITECTURE_V1` says website should link to privacy/consent terms; `NEXTJS_STRUCTURE_V1` has `/legal/privacy` and `/legal/terms`, but the actual legal/privacy source documents were not confirmed as Markdown files. Legal PDF exists.

---

## 8. `SUPABASE_SCHEMA_V1` vs `DATA_MODEL_V1`

This is the largest architecture gap.

The schema is directionally correct but currently not a faithful mapping of the conceptual model. The mismatch is not just naming; it affects lifecycle implementation.

High-priority mismatches:

1. Client fields and delivery address.
2. Case status enum.
3. Subscription status enum.
4. Assessment status enum.
5. Message lifecycle fields.
6. Support Ticket case linkage, priority, and assigned role.
7. Document Upload type, translation, confidence, linked message.
8. AI Session purpose/input/output references.
9. Knowledge approval owner.
10. Red-flag criticality data model.

**Required fix before Supabase implementation:** produce `DATA_MODEL_TO_SUPABASE_MAPPING_V1.md` or revise `SUPABASE_SCHEMA_V1` so every mismatch is resolved.

---

## 9. `MVP_BUILD_PLAN_V1` vs Architecture

Mostly aligned:

- The plan follows the chosen tech stack.
- It respects Supabase and Stripe gates.
- It excludes legacy/Telegram.
- It delays launch until access, consent, payments, AI guardrails, and red flags are verified.

Gaps:

1. It says Phase 0 foundation freeze before build, but foundation still has the brand/Constitution name contradiction.
2. It says Phase 3 creates consent + permanent case, but the exact distinction between “case record exists” and “active case formed” needs clearer wording because `WEB_ARCHITECTURE_V1` says an active case is not created immediately after registration.
3. It says Phase 7 urgency/criticality only by Karen, but guardrails red-flag flow auto-marks critical.
4. It says Support/Anna is admin/support combined at MVP level; `ACCESS_CONTROL_V1` separates Support and Admin authority. If one person holds both roles, the system still needs separate permissions and audit identity.
5. It lacks an explicit P0 documentation-fix phase before code, despite the contradictions above.

---

## 10. Missing / Weak Documents

Required documents from the user's checklist are present.

Additional documents or decisions still needed before full implementation:

1. `DATA_MODEL_TO_SUPABASE_MAPPING_V1.md` or equivalent mapping appendix.
2. Retention/privacy decision for Audit Log, case history, documents, deletion, archival, export, and anonymization.
3. Field-level access matrix for sensitive fields.
4. Red-flag event vs durable case urgency decision document/update.
5. Knowledge governance decision: Karen vs Admin approval.
6. Public route/content inventory for FAQ and Trust/Experience.
7. Implementation-level RLS policy spec before SQL is written.
8. AI implementation test matrix based on `AI_GUARDRAILS_V1` action table.
9. Stripe webhook idempotency and reconciliation spec.
10. File-upload security spec: allowed types, size, virus scanning strategy, storage bucket separation, signed URLs, retention.
11. Legal/privacy pages source text if not already represented outside the checked files.

---

## 11. Hidden Risks

1. **Normative drift:** several documents self-certify “no contradictions found,” but cross-document comparison shows real drift.
2. **Status enum drift:** if not fixed early, developers will encode different lifecycle states in UI, database, and business logic.
3. **Red-flag ambiguity:** emergency flow must be immediate, but authority must not silently transfer to AI.
4. **Support/Admin role merge:** one human may perform both roles at MVP, but permissions should remain distinct.
5. **Document deletion vs indefinite history:** privacy rights may conflict with “retain indefinitely” architecture.
6. **Public claims risk:** public site can be safe only if copy strictly follows Constitution and guardrails.
7. **Schema under-modeling:** simplified schema may lose data needed for Karen, AI confidence, support routing, and audit defense.
8. **PDF dependency:** legal and safety sources exist as PDFs; implementation teams may not extract exact operational requirements unless summarized in Markdown.

---

## 12. Scaling Risks

1. **Single Next.js app breadth:** public site, cabinet, Karen, support, admin, AI, Stripe, and API routes in one app is good for MVP but needs clear service boundaries.
2. **Supabase RLS complexity:** role-scoped access across client/Karen/support/admin/AI/system will require careful policy testing.
3. **Audit Log growth:** immutable audit events can grow quickly; indexes, retention, and query scopes need early design.
4. **Document storage growth:** medical documents and translations can become the largest storage/cost/security surface.
5. **AI streaming/serverless limits:** Vercel/serverless timeouts and long-running AI/document processing may require a queue/worker later.
6. **Karen queue scaling:** red-flag and case-review prioritization needs explicit queue semantics, not just `case.urgency`.
7. **Knowledge governance scaling:** if Admin and Karen approval are not separated clearly, knowledge publication will bottleneck or become unsafe.

---

## 13. Legal Risks

This is not legal advice; it is architecture risk classification.

1. Brand/legal naming conflict between Constitution and Brand Identity.
2. Health-related data collection requires precise consent, retention, deletion, and access rules.
3. Indefinite retention must be reconciled with applicable law, privacy policy, and the Offer.
4. Public website must not imply diagnosis, treatment, recovery, remission, life extension, or guaranteed results.
5. Red-flag messaging must not replace emergency services or delay urgent care.
6. AI must not provide medical advice or interpret tests for clients.
7. Stripe/payment records must not store card/bank data in platform tables.
8. Delivery address and medical documents are high-sensitivity personal data and need explicit handling rules.

---

## 14. Security Risks

1. RLS is conceptual only; actual policies are not specified.
2. Service-role usage rules are not defined.
3. AI service access boundaries need implementation-level enforcement.
4. Stripe webhook verification and idempotency are mentioned architecturally but not specified operationally.
5. File upload security is not defined.
6. Audit Log read access and access-grant audit must be implemented carefully.
7. Support must not see medical substance, but current schema may not separate technical upload metadata from document substance.
8. Admin can read Audit Log; sensitive audit views need field-level minimization.
9. Red-flag API route must be protected from abuse/spam while still always reachable for authenticated clients.

---

## 15. Development Risks

1. Developers may start from `SUPABASE_SCHEMA_V1` and lose conceptual fields from `DATA_MODEL_V1`.
2. Developers may start from `NEXTJS_STRUCTURE_V1` and omit FAQ/Trust pages from `WEB_ARCHITECTURE_V1`.
3. Developers may treat Support/Admin as one role because Anna is both at MVP.
4. Developers may encode AI red-flag criticality as durable case urgency, violating the Karen-only principle.
5. Developers may implement legal/privacy pages before final retention/deletion decisions are made.
6. No actual SQL/RLS/test plan exists yet, by design; this is correct for architecture stage but not enough for implementation.
7. PDF-only legal/safety sources may be skipped by implementation agents unless converted into implementation checklists.

---

## 16. Required Fixes Before Development Scope Expands

Because verdict is `MOSTLY YES`, not `YES`, the following must be fixed.

### P0 — before Supabase/Auth/case/AI/payment implementation

1. Resolve official name contradiction between `BRAND_IDENTITY_V1` and Constitution headings.
2. Resolve red-flag critical event vs Karen-owned durable urgency/status.
3. Align `SUPABASE_SCHEMA_V1` with `DATA_MODEL_V1`, especially statuses and missing fields.
4. Decide Knowledge Entry approval owner and align Data Model, Authority Matrix, and Access Control.
5. Clarify FAQ and Trust/Experience route/section decision in `NEXTJS_STRUCTURE_V1`.
6. Add retention/privacy decision before physical storage of case history, documents, and Audit Log.
7. Add field-level access notes for high-sensitivity fields.

### P1 — before first real client data

1. Write actual RLS policy spec and tests.
2. Write file-upload security spec.
3. Write Stripe webhook/idempotency spec.
4. Write AI guardrail implementation test matrix.
5. Convert legal/safety PDF obligations into implementation checklist items.
6. Define audit log event taxonomy and sensitive audit view rules.

### P2 — before launch

1. Run launch readiness audit against `MVP_BUILD_PLAN_V1` Phase 10.
2. Verify no public copy violates Constitution or guardrails.
3. Verify role-based route access across Client/Karen/Support/Admin.
4. Verify red-flag path end-to-end.
5. Verify consent capture and Audit Log immutability.

---

## 17. Final Readiness Table

| Area | Readiness | Notes |
|---|---|---|
| Brand foundation | Mostly ready | Name conflict with Constitution must be fixed. |
| Web architecture | Mostly ready | Public scope clear; FAQ/Trust route mapping missing. |
| Data model | Mostly ready | Strong concept; needs physical mapping cleanup. |
| Access control | Mostly ready | Role boundaries strong; field-level access missing. |
| Authority matrix | Mostly ready | Red-flag authority and Knowledge approval need correction. |
| AI guardrails | Mostly ready | Norms strong; red-flag criticality wording must align. |
| Supabase schema | Not ready for implementation | Too much drift from conceptual data model. |
| Next.js structure | Mostly ready | Good scaffold; public route parity needs fix. |
| MVP build plan | Mostly ready | Good sequencing; add documentation-fix gate. |
| Legal/safety readiness | Partial | PDFs exist; retention/privacy still unresolved. |
| Development start | Mostly yes | Safe for scaffold/public site after P0 tasks are opened; not safe for data/AI/payment implementation until P0 fixed. |

**READY FOR DEVELOPMENT: MOSTLY YES**

The architecture is materially stronger than the previous legacy context and can support controlled MVP development. But the implementation must not jump directly into Supabase/Auth/AI/payment until the P0 contradictions are resolved.
