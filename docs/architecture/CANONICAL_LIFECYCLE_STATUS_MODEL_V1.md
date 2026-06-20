# CANONICAL_LIFECYCLE_STATUS_MODEL_V1

> Status: Draft v1 — P0 architecture contradiction closure
> Scope: Documentation only. No code, no database schema changes.
> Project / platform name: **Python Method**
> Slogan (philosophy, not legal/platform name): «Rehabilitation Without Borders» / «Реабилитация без границ»

---

## 1. Purpose

This document defines the **canonical lifecycle and status model** for the Python Method platform. It resolves P0 contradictions found by audits by establishing one authoritative model for User, Client, Case, Payment, Support, and Message/request states, and the rules that govern transitions between them.

This is a normative reference document. It does not introduce code or change the physical schema. It is the source of truth that a future DATA_MODEL_TO_SUPABASE_MAPPING_V1 must follow.

---

## 2. Canonical entity / brand decisions

These naming and entity decisions are canonical and override any conflicting usage in earlier documents.

1. **Pythons & Co.** — the US corporation that receives payments and reports business activity. It is the legal/commercial entity.
2. **Python Method** — Karen's methodology for body recovery, rehabilitation, long-term preservation, and longevity. This is the platform/product name.
3. **Python Elixir** — Karen's experimental formula. **Not** part of the licensed commercial platform until legal/licensing status is resolved. It must not appear as a sellable product or commercial claim in the MVP.
4. **"Rehabilitation Without Borders"** — a philosophy / slogan, **not** the legal or platform name. It must never be used as the legal entity name or as the platform's official name.

---

## 3. User status model

A **Registered User** is any person with an account. Registration alone does not make a person a Client.

| Status | Meaning |
|---|---|
| registered | Account exists; person has only registered, reads posts, watches content, or observes the site. |
| active_observer | Registered user engaging with public/free content but has not received any service. |
| converted_to_client | Registered user who has received any service and now also holds a Client record (see section 9). |
| suspended | Account access restricted (admin action, audited). |
| closed | Account closed/archived per policy (no permanent deletion outside policy). |

**Rule:** A Registered User and a Client are **separate** concepts. A person remains a Registered User (not a Client) as long as they only register, read, watch, or observe.

---

## 4. Client status model

A **Client** record is created only when a person receives any service from the center, including the free preliminary analysis.

| Status | Meaning |
|---|---|
| prospective | Reserved internal state before first service is delivered (optional; externally the person is still only a Registered User). |
| active | Has at least one open/active Case. |
| inactive | Has Client history but no currently active Case. |
| returning | Previously inactive Client who started a new Case after a gap. |
| archived | Client archived per policy; history retained. |

**Rule:** One **Client** may have **multiple Cases** over time. The Client is the durable identity of a person who has received service; the Case is the unit of service.

---

## 5. Case status model

A **Case** is a single unit of service. Case types: free preliminary analysis; paid 5-week support; paid 15-week support; repeat case; resumed case.

| Status | Meaning |
|---|---|
| created | Case record created (free analysis requested, or payment confirmed for paid support). |
| awaiting_start | Created but work has not begun (intake pending). |
| in_progress | Karen's work is active. |
| awaiting_client | Blocked pending client input/documents. |
| paused | Temporarily paused (audited). |
| completed | Service delivered; period finished. |
| closed | Case closed (completed or terminated per policy). |
| reopened | A closed case explicitly resumed (see section 11). |

**Case type field (separate from status):** free_preliminary_analysis, paid_support_5w, paid_support_15w, repeat, resumed.

**Rule:** The free preliminary analysis is a **real service**. It must create both a **Client record** and a **Case record**. It is currently free only as a launch/growth mechanism and may become paid later; the model must not assume "free" means "no Case".

---

## 6. Payment status model

Payments are tracked separately from Case (consistent with DATA_MODEL_OPEN_DECISIONS_V1: Subscription/Payment kept separate from Case Period).

| Status | Meaning |
|---|---|
| not_required | Free preliminary analysis — no payment needed. |
| pending | Checkout initiated, not confirmed. |
| paid | Full payment confirmed. |
| failed | Payment attempt failed. |
| refunded | Refund issued per Offer/legal terms. |
| partially_refunded | Partial refund per Offer/legal terms. |

**Rules:**
- **No installment payments.** Only **full payment** activates paid support.
- Karen's work starts **immediately after payment**, especially the full analysis on day one.
- Refund logic must align with the Offer/legal terms. An **ordinary refund is not assumed** — refunds are exceptions governed by the Offer, not a default expectation.
- A confirmed paid event is what activates a paid support Case period.

---

## 7. Support status model

Support/Anna handle technical and organizational support (Support Tickets), distinct from case-meaning communication.

| Status | Meaning |
|---|---|
| open | Ticket created. |
| in_progress | Support/Anna working on it. |
| waiting_on_user | Awaiting user response. |
| escalated_to_karen | Case-meaning items handed to Karen. |
| resolved | Issue resolved. |
| closed | Ticket closed. |

**Rule:** Support handles technical/organizational issues; anything that is a case decision is escalated to Karen, who is the single source of case decisions.

---

## 8. Message / request status model

Message/request tracking must exist for Karen. These are the canonical message statuses.

| Status | Meaning |
|---|---|
| submitted | Message/request submitted by the client. |
| unread_by_karen | Not yet seen by Karen. |
| in_review_by_karen | Karen is reviewing it. |
| answered | Karen has answered. |
| closed | Thread closed. |

**Rule:** For the client, the UX may present a single unified communication window, but internally Message (case-meaning communication) and Support Ticket (technical/organizational) remain separate, each with its own status set.

---

## 9. Rules: when a Registered User becomes a Client

A Registered User becomes a Client **only after receiving any service** from the center, including the free preliminary analysis.

- Registering, reading posts, watching content, or observing the site does **not** create a Client.
- Receiving any service (free preliminary analysis included) **creates a Client record and a Case record** and transitions the user to converted_to_client.
- The conversion event must be recorded in the Audit Log.

---

## 10. Rules: creating a new Case

- A new Case is created when: a free preliminary analysis is requested; a paid support product (5w or 15w) is purchased (full payment confirmed); or a repeat/resumed engagement begins.
- One Client may hold multiple Cases over time; Cases do not overwrite each other — each is a distinct record with its own type and status.
- A paid Case is created/activated only on a confirmed paid payment event (no installments).
- Free preliminary analysis creates a Case of type free_preliminary_analysis even though no payment is required.

---

## 11. Rules: closing and reopening Cases

- A Case moves to completed when its service/period is delivered, then to closed.
- A closed Case may be **reopened** explicitly (status reopened) — e.g., a resumed case after months — rather than silently editing a closed record.
- A repeat engagement after a gap may instead be modeled as a **new Case** of type repeat; choosing reopen vs. new case is a deliberate decision recorded in the Audit Log.
- Closing or reopening a Case is an audited action.

---

## 12. Analytics implications for Anna / admin dashboard

The separation of User vs. Client and Client vs. Case enables clean metrics:

- **Registered Users vs. Clients:** distinguish observers from people who received service (conversion funnel).
- **Conversion rate:** registered → client (first service), and free-analysis → paid-support.
- **Cases by type:** counts of free analysis, paid 5w, paid 15w, repeat, resumed.
- **Active vs. inactive vs. returning Clients** over time.
- **Payment metrics:** pending/paid/failed/refunded — full-payment only, no installment cohorts.
- **Karen workload:** message statuses (unread_by_karen, in_review_by_karen) and case statuses (in_progress, awaiting_client).
- **Support load:** ticket statuses and escalation-to-Karen rate.
- Business reporting attributes commercial activity to **Pythons & Co.** (the legal payee entity).

---

## 13. Notes for future DATA_MODEL_TO_SUPABASE_MAPPING_V1

- Keep **User**, **Client**, and **Case** as separate records; Client links to a User, Case links to a Client (one-to-many).
- Model **Case type** as a separate field/enum from **Case status**.
- Keep **Payment** separate from **Case period**; activation of a paid Case depends on a confirmed full payment (no installment fields).
- Message statuses and Support Ticket statuses are distinct enums even if surfaced in one UI window.
- Each status enum above should map to a Postgres enum/check constraint, with status-change events captured for Audit Log.
- Python Elixir must not be represented as a sellable product entity until legal/licensing is resolved.
- Confirm consent and case-history retention against legal text and privacy policy before persisting (per DATA_MODEL_OPEN_DECISIONS_V1).

---

## 14. Self-check (P0 closure)

- Registered User vs. Client separated. (ok)
- Client vs. Case separated; one Client to many Cases. (ok)
- Free preliminary analysis = real service creating Client + Case. (ok)
- No installments; full payment activates paid support; Karen starts immediately. (ok)
- Refund not assumed; aligned to Offer/legal. (ok)
- Message statuses: submitted / unread_by_karen / in_review_by_karen / answered / closed. (ok)
- Canonical brand/entity decisions recorded (Pythons & Co. / Python Method / Python Elixir / slogan). (ok)
- No code, no schema changes — documentation only. (ok)

**Open contradictions:** None identified at model level. Physical mapping to be handled in DATA_MODEL_TO_SUPABASE_MAPPING_V1.

---

*End of CANONICAL_LIFECYCLE_STATUS_MODEL_V1.*
