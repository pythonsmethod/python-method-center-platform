# DATA_RETENTION_AND_DELETION_POLICY_V1

Status: Draft v1
Scope: Canonical policy for data retention, archival, client self-service account deletion, and the precise distinction between archive, deletion, account closure, and case closure for the Python Method web-first platform.
Type: Architecture policy. Documentation only. No code, no SQL, no schema changes, no Issues.

This document closes the **P0 data-retention and deletion-policy gap** identified during architecture audits. It records canonical decisions made by Anna. It does not introduce implementation; it defines the policy that implementation must later satisfy.

---

## 1. Purpose

This policy defines how long the platform keeps client and case data, when and how data is archived versus deleted, and how a client can delete their own account without contacting support. It establishes the rule that a client's deletion right takes priority over retaining a case for organizational history, and that AI and methodology development must never depend on retaining personally identifiable client data.

It exists so that retention, archival, and deletion behavior is decided once, at the architecture level, rather than improvised during build. It is the source of truth that DATA_MODEL_V1, ACCESS_CONTROL_V1, SUPABASE_SCHEMA_V1, NEXTJS_STRUCTURE_V1, and MVP_BUILD_PLAN_V1 must align to.

---

## 2. Definitions

This policy depends on four distinct concepts that are frequently confused. They are **not** interchangeable.

- **Active data** — data belonging to an account and case that is currently in operational use and visible in active work views and queues.
- **Completed case** — a case whose work is finished but whose record is still retained for historical and support continuity. The account remains, and the client can return.
- **Archived case** — a case hidden from active operational queues and excluded from active work views after a period of inactivity, but still stored and recoverable by authorized staff. **Archived does not mean deleted.**
- **Account closure** — see the §23 distinction table. Closure is the lifecycle end-state of an account; in this platform there is no separate "soft closure" path that retains personal data indefinitely against the client's wishes — a client who wants to leave uses self-service deletion.
- **Case closure** — the operational end of case work (e.g. a support period ends, or Karen marks the case complete). Case closure does **not** delete data and does **not** close the account.
- **Deletion** — permanent removal of the account and its associated case data, initiated by the client through self-service, after confirmation, explanation of consequences, and a deletion reason.

The full archive vs deletion vs account closure vs case closure distinction is given in §23.

---

## 3. Active data

Active data is the default state for an account and its case while the client is engaged with the center. It appears in Karen's active case views, in operational queues, and in the client cabinet.

While data is active: the client can view their case, upload documents, communicate, and see their assessment and review history; Karen and authorized staff can act on the case within ACCESS_CONTROL_V1; and all access-sensitive actions are written to the Audit Log.

Active data remains active until either the case is completed and becomes inactive long enough to be archived (§6), or the client deletes their account (§7–§11).

---

## 4. Completed cases

A completed case is one where the active work is finished but the record is retained. Completion is a case-closure event (§23), not a deletion event.

Because **one person = one account = one permanent case**, a completed case continues to belong to the account. The client keeps access to their historical record in the cabinet, and Karen retains full visibility of the historical support record so that a returning client is met with continuity rather than a blank slate (§13).

A completed case stays retained and visible until inactivity triggers archival (§6) or the client deletes the account (§7).

---

## 5. Archived cases

Archival is an operational visibility change, not a data-removal event.

An archived case is: **hidden from active operational queues**, **excluded from active work views**, and **recoverable by authorized staff**. The underlying data continues to exist and is not anonymized or destroyed by archival alone. Archival keeps active surfaces clean and focused on live work while preserving the historical record.

Recovery from archive is a staff capability governed by ACCESS_CONTROL_V1 and is itself an audited action. Archival never overrides a client's deletion right: if a client deletes their account, archived cases are deleted along with active ones (§7, §11).

---

## 6. Five-year archival rule

A case becomes **archived after 5 years of inactivity**.

"Inactivity" is measured from the last meaningful activity on the case (the precise activity signal is a data-model decision recorded for DATA_MODEL_V1; see §17). When the five-year inactivity threshold is reached, the case transitions to archived: removed from active queues and active work views, retained in storage, and recoverable by authorized staff.

The five-year rule is an archival rule, **not** a deletion rule. Reaching five years of inactivity never causes automatic deletion of client data. Deletion only ever happens through client self-service (§7) — the archival clock and the deletion right are independent, and the deletion right takes priority (§14).

---

## 7. Client self-service deletion

A client **does not need to contact support to delete their account.** Account deletion is **self-service from the client cabinet.**

The client initiates deletion themselves from their cabinet. Before anything is removed, the platform must require confirmation, explain consequences, and request a deletion reason (§9, §10). After the client confirms, the account is deleted, its cases, questionnaires, and uploaded documents are deleted, and access is revoked (§11).

This is the canonical leave path for a client. There is no parallel "request support to delete me" requirement; support involvement is not a precondition for the client exercising their deletion right.

---

## 8. Deletion workflow

The deletion workflow is the ordered sequence the cabinet must implement:

1. Client opens account deletion from the client cabinet.
2. Platform explains the consequences of deletion (§9) — what will be removed and that it is permanent and irreversible.
3. Platform requires explicit confirmation from the client (§9).
4. Platform requests a deletion reason (§10).
5. On confirmed deletion: the account is deleted, cases are deleted, questionnaires are deleted, uploaded documents are deleted, and access is revoked (§11).
6. An audit record of the deletion event (and reason) is retained per §15, without retaining the deleted personal content itself.
7. If the person returns later, they create a new account and start a new onboarding process (§12).

This workflow is documentation of intended behavior only; the implementing phase must satisfy each step, with build sequencing handled per MVP_BUILD_PLAN_V1.

---

## 9. Required deletion confirmations

Before any data is removed, the platform must:

- **Require confirmation** — an explicit, deliberate confirmation action by the client. Deletion must never be a single accidental click or an implied/auto-accepted action.
- **Explain consequences** — clearly state that deletion removes the account, all cases, all questionnaires, and all uploaded documents; that access will be revoked; and that the action is permanent and cannot be undone. The client must understand that returning later means starting over with a new account and new onboarding (§12).

Confirmation is a precondition. No deletion of client data occurs until the client has both seen the consequences and confirmed.

---

## 10. Deletion reason collection

As part of confirmed deletion, the platform must **request a deletion reason** from the client.

The reason is collected to support service improvement and operational understanding of why clients leave. Collecting a reason must not be used to obstruct, delay, or override the client's deletion right — the deletion proceeds once confirmed (§14). Whether the reason field is strictly required to proceed or offered as optional is a UX/legal detail to be settled in legal review (§21) and reflected in the cabinet implementation, but the deletion right itself is never gated behind providing a reason.

The reason is retained in a form that does not depend on retaining the client's personally identifiable case content (§18).

---

## 11. Data removed during deletion

On confirmed deletion, the following are removed:

- the **account** is deleted,
- the client's **cases** are deleted (active and archived alike),
- **questionnaires** are deleted,
- **uploaded documents** are deleted,
- **access is revoked.**

Archival status does not protect data from deletion — archived cases are deleted along with active ones because the client's deletion right takes priority over organizational retention (§14). What is *not* removed is the minimal, non-identifying audit trail of the deletion event itself (§15), which records that a deletion occurred and the reason, without reconstructing the deleted personal content.

---

## 12. Account recreation after deletion

Deletion is final. If the person returns later, **they create a new account and start a new onboarding process.**

There is no restoration of a deleted account, no merging of a new account with a previously deleted one, and no recovery of previously deleted cases, questionnaires, or documents. A returning person is treated as a new client: new account, new permanent case, new onboarding, fresh consent.

This is the deliberate consequence of honoring the deletion right: the platform does not secretly retain a shadow copy to "welcome back" a deleted client.

---

## 13. Karen access to historical records

For clients who have **not** deleted their account, Karen must be able to see the **full historical support record**: previous cases, uploaded documents, reviews, and communication history — even if the client returns after months or years.

This is why completed and archived cases are retained rather than deleted: a returning, non-deleted client should be met with continuity, not a blank slate. Archival hides cases from active queues but keeps them recoverable for exactly this purpose (§5).

This historical-access guarantee applies only while the account exists. Once a client exercises self-service deletion, the historical record is gone and cannot be surfaced to Karen — the deletion right takes priority over historical continuity (§14).

---

## 14. Priority of client deletion rights

**Client deletion rights take priority over retaining a case for organizational history.**

Wherever this policy creates tension between keeping a record (for Karen's continuity, for archival history, for organizational memory) and honoring a client's confirmed deletion, deletion wins. Archival, completion, and historical-access guarantees are all subordinate to the client's right to delete their account and have their cases, questionnaires, and documents removed.

---

## 15. Audit-log considerations

The Audit Log remains the canonical record of consent and access-sensitive actions across the platform. This policy interacts with it as follows:

- Deletion is an audited event: the fact that a deletion occurred, when, and the deletion reason are recorded.
- The audit trail of a deletion must **not** reconstruct or retain the deleted personal content (cases, questionnaire answers, documents, communication bodies). It records that the event happened, not the substance of what was deleted.
- Archival and recovery-from-archive are audited actions.
- The exact reconciliation between immutable consent/audit records and the requirement to remove personal data on deletion is a legal-review item (§21): the audit log must retain enough to prove process integrity while not defeating the deletion of personal data.

---

## 16. Privacy implications

The deletion right is a privacy guarantee: a client can leave and have their personal data removed without negotiating with support. The platform must not undermine this by retaining hidden copies, by exporting personal data into systems outside the deletion boundary, or by treating the deletion reason as a backdoor to retain identifying information.

Archival is explicitly **not** a privacy workaround. Archived data is still the client's data and is still subject to the deletion right. Any process (analytics, methodology, AI) that touches client data must respect that archived and active data alike disappear on deletion.

---

## 17. Data-model implications (for DATA_MODEL_V1)

DATA_MODEL_V1 must be updated to reflect, at the model level (no schema/SQL here):

- A case lifecycle that distinguishes active, completed, and archived states, with archived defined as a visibility/queue state rather than a deletion state.
- An inactivity signal sufficient to evaluate the five-year archival rule (definition of "last meaningful activity").
- A deletion model in which deleting an account cascades to cases (active and archived), questionnaires, and uploaded documents, and revokes access.
- A separation between deleted personal content and the retained, non-identifying deletion-event record (reason + timestamp).
- The principle that AI and methodology development must not depend on retaining personally identifiable client data (§18).

This resolves the open item previously flagged: consent/data retention must be reconciled against legal text and privacy policy before persisting (per DATA_MODEL_OPEN_DECISIONS_V1).

---

## 18. Methodology and AI implications

**AI and methodology development must not depend on retaining personally identifiable client data.**

Any improvement of methodology, training, or AI assistance must be designed so that it survives the deletion of any individual client's identifiable data. Methodology and AI value must derive from non-identifying, aggregated, or de-identified signals — never from a dependency on keeping a specific client's identifiable cases, questionnaires, documents, or communications after that client has deleted their account.

---

## 19. Supabase future implications (for SUPABASE_SCHEMA_V1)

SUPABASE_SCHEMA_V1 must later (no schema changes in this document) account for:

- Representing case archival state and the inactivity basis for the five-year rule.
- A deletion path that removes account, cases (active and archived), questionnaires, and uploaded documents (including stored files), and revokes access.
- Retaining a minimal, non-identifying deletion-event record consistent with §15 and §17.
- Ensuring archival is queryable as "excluded from active views but recoverable by authorized staff," consistent with ACCESS_CONTROL_V1.

These are forward-looking requirements for the schema document, not instructions to modify the schema now.

---

## 20. Dashboard and Next.js structure implications

ACCESS_CONTROL_V1 must be updated so that: recovery of archived cases is an authorized-staff capability; clients can see and act on their own deletion (self-service) but cannot affect other clients; and the deletion right is enforced over retention preferences.

NEXTJS_STRUCTURE_V1 must account for a client-cabinet account-deletion surface that implements the §8 workflow (consequence explanation, confirmation, reason collection), and for staff dashboard/queue behavior where archived cases are excluded from active work views but reachable for authorized recovery.

Active work views and operational queues must exclude archived cases by default while remaining a path through which authorized staff can recover them.

---

## 21. Legal review required

The following must be confirmed in legal review before implementation persists real client data:

- Reconciliation of immutable consent/audit records with the obligation to delete personal data on request (§15).
- Whether the deletion reason is required or optional, and the lawful basis for retaining it (§10).
- Confirmation that the five-year archival rule and the self-service deletion right are consistent with applicable data-protection obligations.
- Confirmation that no retention "for organizational history" overrides a client's deletion request (§14).
- Confirmation that methodology/AI use of client-derived data is lawful and does not depend on retaining identifiable data (§18).

This document records the canonical product decisions; it does not constitute legal sign-off.

---

## 22. Self-check

**Against Anna's canonical decisions**

- Returning non-deleted client: Karen sees full historical record — previous cases, documents, reviews, communication. ✔ (§13)
- Client does not need to contact support to delete; deletion is self-service from the cabinet. ✔ (§7)
- Before deletion: confirmation required, consequences explained, deletion reason requested. ✔ (§8, §9, §10)
- After confirmed deletion: account, cases, questionnaires, uploaded documents deleted; access revoked. ✔ (§11)
- Returning person creates a new account and starts new onboarding. ✔ (§12)
- Cases archived after 5 years of inactivity; archived ≠ deleted; archived = hidden from active queues, excluded from active work views, recoverable by authorized staff. ✔ (§5, §6)
- Client deletion rights take priority over retaining a case for organizational history. ✔ (§14)
- AI and methodology development must not depend on retaining personally identifiable client data. ✔ (§18)

**Against the four-concept distinction**

- Archive, deletion, account closure, and case closure are each defined and distinguished. ✔ (§2, §23)

**Against project constraints**

- No SQL written. ✔
- No code modified. ✔
- No schema changes implemented. ✔
- Documentation-only P0 closure. ✔

**Open items**

- Legal-review items in §21 remain open and must be resolved before persisting real client data.

---

## 23. Distinction reference — archive vs deletion vs account closure vs case closure

| Concept | What it is | Data removed? | Account survives? | Visible to Karen / staff? | Triggered by |
| --- | --- | --- | --- | --- | --- |
| **Case closure** | Operational end of case work (period ends / case completed) | No | Yes | Yes — retained as historical record | Karen / case lifecycle |
| **Archive** | Case hidden from active queues after 5 years of inactivity | No | Yes | Hidden from active views; recoverable by authorized staff | 5-year inactivity rule (§6) |
| **Account closure** | Lifecycle end-state of an account | Realized through deletion — a departing client uses self-service deletion | No | No (once deletion completes) | Client self-service (§7) |
| **Deletion** | Permanent removal of account, cases, questionnaires, documents; access revoked | Yes — permanent, irreversible | No | No | Client self-service, after confirmation + reason (§7–§11) |

Key contrast: **archive preserves data and the account** (visibility change only), while **deletion permanently removes data and the account** (and cannot be undone). **Case closure** ends work without removing data; **account closure** for a departing client is realized through **deletion**, honoring the client's deletion right over organizational retention.

---

## 24. Required updates to other documents

This policy requires the following documentation-only updates (to be made as their own commits; no changes in this file):

- **DATA_MODEL_V1** — add case lifecycle (active/completed/archived), inactivity signal for the 5-year rule, deletion cascade, and separation of deleted content from the non-identifying deletion-event record (§17).
- **ACCESS_CONTROL_V1** — define archived-case recovery as an authorized-staff capability, client self-service deletion scope, and priority of the deletion right over retention (§20).
- **SUPABASE_SCHEMA_V1** — record forward requirements for archival state, deletion cascade (including stored files), and minimal deletion-event retention (§19). No schema changes here.
- **NEXTJS_STRUCTURE_V1** — add the cabinet account-deletion surface (consequences, confirmation, reason) and exclusion of archived cases from active work views with an authorized recovery path (§20).
- **MVP_BUILD_PLAN_V1** — reference this policy where account deletion, archival, and historical access are sequenced, consistent with the existing pattern used for AGE_AND_CARE_RECIPIENT_POLICY_V1.

---

End of DATA_RETENTION_AND_DELETION_POLICY_V1.
undefined
