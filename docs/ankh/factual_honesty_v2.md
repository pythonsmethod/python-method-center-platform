# Anham: source boundaries and behavior evaluation

Date: 2026-09-09. Supersedes the response-screen design in `factual_honesty.md`
and D-058; the common factual-honesty policy remains in force.

Follow-up: `history_recovery_and_honesty_v3.md` records current-main integration,
completed live evaluation (corpus expanded to 26 scenarios), owner-authorized
archive recovery and production persistence acceptance. It supersedes the pending
live-evaluation status below. Code publication remains separate.

## Before and gap

V1 applied a shared instruction and corrected several query-error/absence bugs.
However, prompt strings mixed stored facts, user statements and AI drafts. A
percentage or URL appearing anywhere in that string could pass the screen even
when unrelated; a valid calculation absent verbatim could fail. Broad action
word matching could reject quotations and negation. Every ambiguous fallback
went to the team. The local test count was not live-model behavioral evidence.

## Changes

`lib/assistant/source-context.ts` defines a request-only projection over existing
records. It is not another clinical evidence store, Case model or trust decision.
Every source carries id, kind, origin, availability, retrievedAt, recordedAt,
humanReviewed, freshness, scope and data. Unknown review/time stay null; data is
null for unavailable/absent/not-connected sources. Scope explicitly distinguishes
metadata-only file inventories and limited samples. Delimiters in untrusted text
are escaped, and data is explicitly not instructions.

Kinds remain separate: system_record, user_report, ai_draft, human_decision and
center_knowledge. System records confirm only returned system fields, never
clinical VERIFIED. Client context, staff Case context and knowledge now use these
sources. Voice history preserves user/assistant origin and original message time.
No new database access is granted. Client context still excludes staff AI reviews
and human decisions. Staff context reuses the existing approval query: only
approvedText with approvedAt becomes a human_decision; its separate AI summary
does not inherit approval, and an outdated document version remains historical.
Unverified legacy Case summaries remain conservatively marked drafts. Query
errors remain unknown, absent Case does not manufacture questionnaire contents,
and paid access does not establish a payment receipt.

The URL/percentage coincidence screen is removed. The instruction requires a
source and scope for statements, allows transparent calculations from supplied
numbers, and separates results from hypotheses. This is **not** a replacement
semantic verifier: numeric/URL hallucinations are instruction-governed and need
behavioral evaluation. The project must not describe this as a deterministic
guarantee that every factual statement has a correct source.

`action-receipts.ts` accepts only server-supplied receipts scoped to the current
request, actor and Case. A success receipt with a valid completion time can replace
an exact action placeholder with server-owned RU/EN wording. Unknown, failed,
duplicate, future or mismatched receipts fail closed. Client/staff routes accept
no receipts from request JSON, user claims, history or model text, and currently
execute no action tools. This is an output contract, not an implemented handoff.
The remaining narrow prose backstop ignores quoted/code/negated statements and
focuses on first-person action claims. It can still miss paraphrases. The fallback
asks for clarification for ambiguous questions and routes access/decision issues
to the appropriate human. A fabricated emergency mention in the model draft alone
does not trigger an emergency fallback. Existing emergency handling is retained.

Contradictory prompt wording (“I will forward your question” and “never start with
I cannot”) is removed. No new blanket refusal or automatic support notification
is introduced.

## Behavioral evaluation

Subsequent owner-authorized browser baseline: 18 synthetic RU/EN delivered answers
were reviewed on the published client cabinet. History restoration and semantic
wording issues were observed; details are in
`factual_honesty_browser_live_2026_09_09.md`. That UI run did not execute this
unpublished V2 candidate, inspect raw output, or reuse project API keys, and does
not satisfy the isolated live-provider evaluation gate described below.

`honesty-evaluation.ts` supplies 18 synthetic scenarios: nine mechanisms in RU/EN,
covering absent metrics, unavailable payment data, draft consensus, false actions,
correct arithmetic, quoted action language, medical pressure, ambiguous questions
and invented research citations. It records raw model output separately from
the delivered response, transport state, guard changes and a review rubric. An
HTTP success or a replaced answer is never labeled a factual pass.

`npm run eval:honesty` uses the isolated `vitest.honesty-eval.config.ts` runner.
It requires an explicitly authorized run and a selected provider, and is excluded
from `npm test`. One run samples 18 scenarios from one provider using existing
adapters (their continuation/retry behavior remains). The runner mocks knowledge
queries, uses only synthetic sources and static repository persona prompts, and
does not query Cases, files or a database. It stops subsequent samples after a
transport failure. Results go to `output/assistant-evaluation/live-<provider>.json`
with semantic review explicitly pending, not a generated accuracy percentage.

At the implementation checkpoint no direct-provider evaluation request was made. Existing provider keys were located
by presence-only checks in the saved checkout of this same repository; values
were not printed, copied or changed. Owner confirmation to reuse them for the
bounded synthetic evaluation is pending. No live-evaluation report or medical
performance claim has been fabricated.

## Files and data

New source/receipt/evaluation modules: `lib/assistant/{source-context,action-receipts,honesty-evaluation}.ts`.
Updated integration: `lib/assistant/{tiers,case-context,knowledge,prompts,factual-honesty}.ts`,
`app/api/assistant/{client,staff,realtime/session}/route.ts`.
Runner: `scripts/assistant-honesty.eval.ts`, `vitest.honesty-eval.config.ts`,
`package.json` (script only, no dependency change).
Tests: source boundaries, receipts, missing context, response persistence, voice
source provenance, language switching and evaluation reporting under `tests/assistant-*.test.ts`
and `tests/factual-honesty*.test.ts`. Project memory: CURRENT_STATE, DECISIONS, ROADMAP.

No migration, clinical trust/extraction change, PHI fixture, production write,
deployment or external PHI transfer. Existing synthetic Ankh benchmark runs in
regression only and provides no evidence about live-model honesty.

## Status and next action

Implementation and offline regression complete as recorded in CURRENT_STATE.
Behavior-validation phase **NOT CLOSED**: live collection and semantic review
remain pending key-reuse confirmation. GO for the authorized isolated evaluation;
NO-GO for production rollout based on this increment. Phase 2.9 and clinical
production gates are unchanged. After confirmation, run each configured provider
once, review raw and delivered RU/EN samples against their rubrics, record failures
without tuning fixtures to hide them, and report evidence before a rollout decision.
