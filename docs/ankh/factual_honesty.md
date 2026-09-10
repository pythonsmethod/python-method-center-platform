# Anham factual honesty

Date: 2026-09-09. Scope: local assistant hardening; no production deployment.

Historical V1 record. The response-screen design and closure wording below are
superseded by `factual_honesty_v2.md` and D-059. In particular, URL/percentage
coincidence is no longer a server gate and live behavior validation is NOT CLOSED.

## Before

Role-specific no-invention instructions existed, but provider calls had no common
policy. Synthesis allowed drafts as factual sources. Failed client-context queries
could become claims of no Case, no documents or no payment. A limited document
sample was described as the total, and prior AI reviews were presented as evidence.

## Implemented contract

`lib/assistant/factual-honesty.ts` owns the policy. Claude and OpenAI append it last
for every call, including direct attachment/extraction calls, arbitration,
synthesis, provider fallback and continuation. Persona prompts include the same
rule and read-only chat capabilities; Realtime appends the policy after its voice
instructions and saved history. Existing JSON/OCR output formats remain unchanged.

Missing data, retrieval failure and confirmed absence are distinct. User reports,
AI drafts, source facts, observed metrics, hypotheses and Karen decisions are not
interchangeable. Source-only/review-only evidence is never promoted by narration.
Only available source names, URLs and provenance levels may be cited. Diagnoses,
treatment prescriptions, unsupported access/action claims and invented percentages
are prohibited in every role. Operational analytics must identify source, period
and scope; hypotheses and causality are not observed metrics.

RU: «Я не могу это подтвердить, чтобы не ввести вас в заблуждение».
EN: “I can't confirm this, and I don't want to mislead you.”

Medical questions go to Karen / Professor Python; payment, access and technical
questions to support; product analytics/general questions to the team. When Karen
is the interlocutor, ask him to verify the source. With no actual handoff receipt,
say that clarification is needed and offer to draft the question. Do not promise
«Уточню» / “I'll check” or claim notification. These chat calls have no action tools.
No notification was added by this task. Emergency directions must not become a
request to wait for the team when a false notification claim is withheld.

## Server controls

File inventory: new `lib/assistant/factual-honesty.ts`; updated
`lib/assistant/{prompts,claude,openai,router,tiers,case-context}.ts` and
`app/api/assistant/{client,staff,realtime/session}/route.ts`; new
`tests/{factual-honesty,factual-honesty-provider,factual-honesty-route,assistant-context-honesty}.test.ts`.
Persistent records: this document, `CURRENT_STATE.md`, `DECISIONS.md`, `ROADMAP.md`.

- Client/staff text endpoints screen final replies before returning them; the
  client endpoint saves only the screened reply.
- Recognizable action claims are withheld; neither browser history nor user text
  authorizes an action. Unsupported explicit URLs and percentages are withheld
  against the server-built prompt context. Rejections use localized human-routing
  text. A known acute/emergency mention retains immediate emergency direction.
- Client query errors no longer imply empty records. No active service period
  does not imply unpaid; an active period does not establish a payment receipt.
  Partial document lists explicitly state their scope. Unknown product IDs do not
  become an invented fixed-duration plan.
- Retired Case processing status/urgency fields are excluded from these snapshots.
  Stored AI reviews are labeled drafts, and unavailable review text does not prove
  that no review exists. Synthesis preserves prior conversation context while
  requiring independent source grounding instead of agreement between drafts.

## Boundaries and validation

This is a strict instruction plus bounded deterministic screening, **not proof of
every sentence's truth**. Pattern checks can miss paraphrases or withhold a quoted
or otherwise harmless action phrase. Matching a URL/percentage in context proves
presence, not semantic relevance, correct arithmetic, source quality or freshness.
Other quantities and named citations remain instruction-governed. Context can
contain user reports and historical AI drafts; their epistemic distinction is
instruction-governed. Attachments do not provide a machine-verified citation list.
Realtime audio is generated directly and has no server output screen; it receives
the same policy and capability limits. OCR/structured output receives the policy
but not the conversational replacement, preserving its parser contract.

Tests use synthetic fixtures and mocked providers/database responses. They verify
transport payloads and continuation, missing/error/partial context, false actions,
invented percentages/URLs, role-appropriate routing, saved-output screening,
forged assistant history, RU → EN → RU and emergency fallback. They are not live
LLM hallucination evaluations or medical validation. No UI route or navigation
was changed; language switching is checked at the response boundary.

Data/schema: no migration, new store, production write, PHI fixture or external
PHI transfer. No extraction/trust threshold changed. The existing synthetic Ankh
benchmark ran in the full suite (3 documents/4 pages, zero critical extraction or
false-VERIFIED errors); its synthetic percentages do not demonstrate medical
accuracy. Generated timestamp/line-ending churn is excluded from the change.

Local implementation CLOSED after the checks recorded in CURRENT_STATE.md.
Phase 2.9 remains OPEN; production auto-verification and Phase 3 production remain
NO-GO. Next action: an isolated, authorized RU/EN adversarial model evaluation
before considering a separately authorized rollout. Do not claim a universal
hallucination-prevention gate or automatically start a new phase.
