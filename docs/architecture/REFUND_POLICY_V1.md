REFUND_POLICY_V1

Status: Architectural policy document — defines the refund policy for the web-first platform of the center / platform Python Method. Scope: Policy architecture only. No code, no SQL, no Supabase schema, no Stripe integration, and no final legal wording. All client-facing refund language below is DRAFT INTENT and MUST be replaced by legally reviewed text in the Offer before launch.

Date: 2026-06-20

Sources of grounding:
- Constitution of the Center, Constitution of Cases
- Public Offer (Оферта) — the legal source of truth for refund terms
- Payment Architecture, DATA_MODEL_V1, ACCESS_CONTROL_V1, AUTHORITY_MATRIX_V1, SUPABASE_SCHEMA_V1, NEXTJS_STRUCTURE_V1
- AI_GUARDRAILS_V1, CANONICAL_LIFECYCLE_STATUS_MODEL_V1
- DATA_RETENTION_AND_DELETION_POLICY_V1

Canonical decisions (from Anna): no installment payments; paid support activates only after full payment; Karen starts work immediately after payment; the most intensive analytical work begins on day one after payment; a standard refund is not assumed because service work begins immediately; any refund or partial refund exists only as an exception under the Offer / legal terms; refund decisions must not be made by AI; refund decisions require a human / admin / legal process; Stripe / payment records must reflect payment status accurately; the refund policy must be visible before payment.

IMPORTANT: This document is documentation-only P0 closure. It writes no final legal language; all final refund wording is marked as requiring legal review and alignment with the Offer. No code, no SQL, no schema implementation.

1. Purpose

This document closes the final P0 refund-policy gap before implementation. It records the canonical refund decisions, defines the difference between activation, service start, and refund eligibility, and states the architectural implications across payment, data, access, authority, schema, application structure, and the MVP build plan. It exists so that payment behavior, client-facing disclosure, and exception handling are consistent and defensible. It is not the legal text; the Public Offer remains the binding legal source, and all final refund wording here is draft intent pending legal review.

2. Definitions
- Full payment — payment of the entire price of a product in a single transaction; there are no installments and no partial activation.
- Activation — the moment a paid support period becomes active. Activation occurs only after full payment is confirmed.
- Service start — the moment the Center's work on the case begins. Per the canonical decisions, Karen begins work immediately after payment.
- Day-one work — the most intensive analytical work, which begins on the first day after payment; the value of the service is substantially delivered at the very start of the period.
- Standard refund — a routine, assumed-by-default money-back entitlement. Under this policy there is no standard refund, because service work begins immediately.
- Exceptional refund — a refund or partial refund granted only as an exception, only under the Offer / legal terms, and only through an authorized human process.
- Refund exception decision — the human, non-AI determination of whether an exceptional refund applies.

3. No-installment rule

There are no installment payments. A product is purchased by a single full payment. Partial payments do not create partial entitlement, do not activate support, and do not start service. Payment architecture and client-facing UI must not offer or imply installments. (Final wording in the Offer pending legal review.)

4. Full-payment activation

Paid support activates only after full payment is confirmed. No case period, subscription entitlement, or active accompaniment begins on a pending, partial, or unconfirmed payment. Activation is a deterministic consequence of a confirmed full payment, recorded in the Audit Log; it is never granted by AI or by client request without a confirmed payment.

5. Service-start rule

Karen starts work immediately after payment is confirmed. Service start is tied to confirmed full payment, not to any later milestone. Because the Center begins delivering value at once, the period of "paid but not yet worked" is effectively zero; this is the basis for the standard no-refund principle in §7. (The precise client-facing description of when work begins is draft intent and must align with the Offer after legal review.)

6. Day-one work rule

The most intensive analytical work begins on day one after payment. The largest share of the Center's effort and Karen's analytical input is front-loaded to the start of the support period. Consequently, even an early cancellation occurs after substantial, non-recoverable service has already been delivered. This rule is the factual justification for treating refunds as exceptional rather than standard. (Final phrasing pending legal review / Offer alignment.)

7. Standard no-refund principle

A standard refund is not assumed. Because service work begins immediately and the most intensive work is delivered on day one, the platform does not promise or default to refunds. The client-facing default expectation is that a confirmed full payment is non-refundable as a matter of routine. This principle is draft intent only; the binding, enforceable statement of non-refundability must be the legally reviewed Offer text, not this document.

8. Exceptional refund cases

Any refund or partial refund can exist only as an exception under the Offer / legal terms. Exceptional cases are not enumerated here as guarantees; they are possibilities that a human authorized process may consider, strictly within the Offer. Illustrative (non-binding, pending legal review) examples of situations an exception process might consider include: a confirmed duplicate or technical double-charge; a payment taken in clear error where no service was started; a documented failure of the Center to begin the contracted service; or a situation the Offer / applicable consumer law explicitly requires. None of these are promised; each is subject to the authorized human refund-exception decision and to the Offer. Final exception criteria and wording require legal review and must match the Offer.

9. Who can approve refund exceptions

Refund exceptions require a human / admin / legal process. At MVP, the authorized actors are Admin / Support (Anna) executing an operational refund only after the exception is authorized, and the responsible legal / administrative authority that interprets the Offer. The flow is: a request or signal is raised → a human reviews it against the Offer → an authorized human decision is recorded → if approved, the refund is executed in the payment provider and reflected in payment status. Every step is audited. Karen may provide case context but the refund-exception decision is an administrative/legal one, governed by the Offer, not a clinical case decision.

10. Who cannot approve refunds

The following can never approve or grant a refund: any AI service (client-facing AI or Karen-assistant AI); the System service (it may only mechanically execute an already-authorized, human-approved refund and record it); the client (a client may request, but cannot self-grant); and any role acting outside the authorized Offer-based process. No refund is valid without an authorized human decision recorded in the Audit Log.

11. AI restrictions

Refund decisions must not be made by AI. AI may not approve, deny, promise, estimate, or imply a refund outcome, and must not tell a client that a refund will or will not be granted. AI may only: recognize that a message concerns billing/refunds, give neutral navigational information that the refund policy and Offer govern outcomes, and route/escalate the request to the authorized human (Admin/Support) process. This is consistent with AI_GUARDRAILS_V1: AI never decides, never guesses, and escalates. Any refund-related AI output is non-authoritative and logged as an escalation, never as a decision.

12. Client-facing disclosure requirements

The refund policy must be visible before payment. Before a client confirms a purchase, the checkout / offer surface must clearly present: that payment is full (no installments); that support activates only after full payment; that work begins immediately and the most intensive work is on day one; that refunds are not standard and exist only as exceptions under the Offer; and a link to the binding Offer. The disclosure must be presented and acknowledged before the pay action. The exact disclosure copy is draft intent and must be finalized by legal review in line with the Offer; consent/acknowledgement of the Offer at payment is recorded in the Audit Log.

13. Payment-status implications

Stripe / payment records must reflect payment status accurately. Payment status values must distinguish at least: awaiting/pending, confirmed (full payment), declined/error, and refunded (and, where applicable, partially_refunded) — with refunded/partially_refunded set only as the result of an authorized, executed exception. Activation depends on confirmed full payment; a refund changes payment status and, per the case lifecycle, may end or void the associated entitlement. Payment status must never be set to refunded by AI or by client action; only an authorized human-initiated, System-executed refund updates it. (Concrete enum values are documented as implications in §14, not implemented here.)

14. Stripe / payment architecture implications

Documented for Payment Architecture and SUPABASE_SCHEMA_V1 (no Stripe integration, no SQL, no code here):
- The payment model represents full payment only; no installment/partial-payment constructs.
- payment.status must support refunded and (optionally) partially_refunded in addition to existing values; these are reachable only via an authorized refund-exception path.
- A refund is linked to the original payment (and to the case period / subscription it affects) so status changes are traceable.
- Card/bank data remains exclusively with the payment provider; only a processor reference is stored. Refund execution happens in the provider; the platform records status and the deciding human actor.
- Activation logic keys strictly off confirmed full payment; nothing activates on partial/pending.

15. Access-control implications

Documented for ACCESS_CONTROL_V1 and AUTHORITY_MATRIX_V1:
- Admin/Support (Anna) may execute a refund only after an authorized refund-exception decision under the Offer; this is an operational action, audited.
- Karen does not execute refunds and does not own the refund-exception decision; Karen may supply case context. (Karen may note that a refund is warranted in case context, but the binding approval is the administrative/legal Offer-based process.)
- AI and System cannot decide refunds; System may only execute an already-authorized refund and write the audit record.
- Clients may request a refund but cannot approve or self-execute one.
- The refund-exception decision and execution are access-sensitive and must be audited; access to refund actions follows least privilege.

16. Audit-log requirements

Every refund-relevant event is appended to the immutable Audit Log: the refund request/signal, the human review, the authorized decision (approve/deny) with the deciding actor and the Offer basis, and the executed status change in the payment provider. The Audit Log records actor, action, target (payment/case period), timestamp, and the Offer/version reference relied upon. The log is append-only; refunds are never silently applied, never AI-decided, and always traceable to a named human authority. Pre-payment acknowledgement of the refund disclosure / Offer is also recorded.

17. Legal review required

This document is not legal text. All final refund wording — the non-refundability statement, the enumerated exception conditions, the client-facing disclosure copy, and any consumer-law carve-outs — MUST be drafted and approved through legal review and made to align with the Public Offer before launch. Where this document and the Offer differ, the legally reviewed Offer governs. No statement here should be presented to clients as the binding refund term.

Required updates to (documented here as the synchronization scope; applied in the referenced documents, not as final legal text):
- Payment Architecture — full-payment-only model; activation only on confirmed full payment; refunded / partially_refunded reachable only via authorized exception; refund executed in provider; no installments.
- DATA_MODEL_V1 — Payment/refund relationship: refund as an exceptional, human-authorized event linked to the original Payment and the affected Case Period/Subscription; refund status reflected; no installment entity.
- ACCESS_CONTROL_V1 — refund execution = Admin/Support only after authorized exception; AI/System/Client cannot approve; refund actions audited; least privilege.
- AUTHORITY_MATRIX_V1 — Decision Owner for a refund exception = authorized human/legal/admin process (not Karen, not AI); Karen provides context only; System executes; AI escalates.
- SUPABASE_SCHEMA_V1 — payment status enum implications (refunded / partially_refunded), refund linkage to payment + period, processor-reference-only, audit treatment; future fields documented, no SQL.
- NEXTJS_STRUCTURE_V1 — pre-payment disclosure surface at checkout/offer; refund/billing request routes that escalate to Support, never an AI/self-service refund decision; Offer link.
- MVP_BUILD_PLAN_V1 — refund policy visible before payment is MVP-required; refund-exception handling is human/admin only; legal review of refund wording vs Offer is a pre-launch / pre-real-payment gate.

18. Self-check
- No installments — HELD. §3 forbids installments and partial activation; payment model is full-payment-only.
- Full-payment activation — HELD. §4 ties activation strictly to confirmed full payment; no activation on pending/partial.
- Service starts immediately; day-one intensive work — HELD. §5–§6 record immediate service start and front-loaded day-one work as the factual basis.
- Standard no-refund — HELD as draft intent. §7 states refunds are not assumed; binding statement deferred to the legally reviewed Offer.
- Refunds only as exceptions under the Offer — HELD. §8 frames all refunds as Offer-bound exceptions, none promised.
- Human/admin/legal approval; AI cannot decide — HELD. §9–§11 require an authorized human decision and explicitly bar AI/System/client approval.
- Accurate payment status — HELD. §13–§14 require status to reflect reality; refunded set only via authorized execution; never by AI/client.
- Disclosure before payment — HELD. §12 requires visible, acknowledged disclosure before the pay action, with an Offer link.
- Auditability — HELD. §16 makes every refund step append-only and traceable to a named human authority.
- No final legal language — HELD. §17 marks all final wording as requiring legal review and Offer alignment; this document is documentation-only.
- No code, no SQL, no schema implementation — HELD. Implications are documented only.

End of REFUND_POLICY_V1.
