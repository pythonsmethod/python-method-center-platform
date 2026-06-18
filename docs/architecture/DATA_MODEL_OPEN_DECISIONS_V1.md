# DATA_MODEL_OPEN_DECISIONS_V1

**Status:** Decisions recorded — closes the five open questions raised in `DATA_MODEL_V1.md` §7.
**Scope:** Architectural decisions only. No code, no SQL, no Supabase schema, no infrastructure.
**Relationship to DATA_MODEL_V1:** This document does **not** modify `DATA_MODEL_V1.md`. It records the resolutions that govern how its open tensions are interpreted going forward.

---

## Purpose

`DATA_MODEL_V1.md` defined the conceptual data model and flagged five tensions / open questions. This document fixes the architectural decisions for each so that the data model can be considered settled before the next stage.

---

## Decision 1 — Subscription and Case Period remain separate

Subscription and Case Period are kept as **distinct entities**. They must not be merged.

- **Case Period** is the *factual period of accompaniment* inside a case — the real span during which the client is being supported (e.g. Support 5 weeks, Support 15 weeks as actually delivered).
- **Subscription / Payment** is the *financial and contractual* part — what was paid for and under which terms.

Even though at MVP these may look almost 1:1, they are **not** to be collapsed into a single entity. The factual accompaniment lifecycle and the financial-contractual record are different concerns with different owners and different sources of truth, and conflating them would couple support delivery to billing in a way that breaks down as soon as the two diverge.

---

## Decision 2 — Assessment is a one-time free preliminary analysis per client

Assessment is treated as a **one-time, free preliminary analytic** for a client.

- It is performed **once** per client by default.
- A repeat is possible **only manually**, with permission from administration / Karen.
- It is **never** triggered automatically.

This preserves the constitutional boundary that the preliminary assessment is a single free entry point, not a recurring or self-serve product.

---

## Decision 3 — Message and Support Ticket remain separate at the data level

Message and Support Ticket are kept **separate at the data level**, while the client-facing UX presents a **single unified contact window**.

- **For the client (UX):** one window of communication — the client should not have to know or choose whether something is "a message" or "a ticket."
- **Inside the system (data):**
  - **Message** = meaningful communication *about the case* (the substantive case dialogue).
  - **Support Ticket** = technical / organizational support (operational issues, not case substance).

The unified UX is a presentation concern; it must not drive a merge of the underlying data entities, which have different owners, lifecycles, and routing.

---

## Decision 4 — Audit Log and key case history are retained indefinitely

The **Audit Log and the key case history** are to be stored **indefinitely**, provided this does not conflict with the law and the Offer (оферта).

- This is recorded for now as an **architectural intention**: the history of the case and of consents must **not be lost**.
- Before physical implementation, this must be **separately reconciled** with the legal text and the privacy policy.

The intent is that the record of what happened in a case — and the record of consents given — remains durable and reconstructable, subject to legal and contractual limits to be verified at implementation time.

---

## Decision 5 — Canonical place of consent

The **Audit Log is the canonical, immutable source of fact for consent.**

- **Audit Log** = the single primary, immutable record that a consent was given.
- **Payment / Onboarding** may store *references* to a consent or short reflective fields, but they must **not** become independent sources of truth for consent.

This prevents consent state from drifting across multiple entities: there is exactly one authoritative record of consent, and everything else points back to it.

---

## Readiness statement

After these five decisions, the open tensions from `DATA_MODEL_V1.md` §7 are considered resolved at the architectural level. **`DATA_MODEL_V1` is therefore considered ready for the transition to `AI_GUARDRAILS_V1`.**
