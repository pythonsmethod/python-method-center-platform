# PYTHONS AI Core — Provider Independence Migration Specification v1

> Supplied by the founder on 9 August 2026 and adopted as authoritative for
> the AI Core migration. Stored here verbatim, exactly as received, so that
> every phase can be checked against the text that was actually approved
> rather than against someone's memory of it.
>
> Progress against this specification is recorded in
> [`AI_CORE_MIGRATION_LOG.md`](./AI_CORE_MIGRATION_LOG.md).

---

PYTHONS AI CORE — PROVIDER INDEPENDENCE MIGRATION SPECIFICATION v1

Status: Proposed canonical architecture specification
Scope: Current live main of pythonsmethod/python-method-center-platform
Purpose: Migrate the existing AI Core from partial provider dependence to a provider-independent architecture without breaking the live center.

────────

1. Purpose

This specification defines how the existing Python Method Center AI stack evolves into an independent PYTHONS AI Core.

The objective is not to remove OpenAI or Anthropic. The objective is to make them replaceable execution providers inside a platform whose identity, memory, knowledge, policies, safety logic, user context, business rules, routing, and product behavior remain owned by PYTHONS.

The architecture must continue operating if:

• OpenAI is unavailable;
• Anthropic is unavailable;
• one provider changes its API or models;
• one provider becomes too expensive;
• one provider loses a required capability;
• a new provider or self-hosted model is added later.

No single AI vendor may remain a mandatory dependency for the entire product.

────────

2. Current State

The current platform already owns substantial parts of the AI system:

• assistant identity: Anham;
• system prompts and center rules;
• client tiers;
• case context;
• conversation history;
• knowledge database;
• safety and red-flag logic;
• rate limits and emergency switch;
• AI router;
• model comparison mode;
• provider fallback for ordinary text chat;
• client and staff UI.

Current model execution:

```text
PYTHONS PLATFORM
      |
      v
Assistant Router
  /        \
Claude      GPT
  \        /
   Evaluator
      |
      v
   Response
```

Current provider-specific weaknesses:

1. Attachments in client/staff chat are routed directly to Claude.
2. Case review transcription and final review generation call Claude directly.
3. Metrics extraction calls Claude directly.
4. Supplement timing advice calls Claude directly.
5. The quality judge prefers Claude when Claude is available.
6. Long-term semantic memory does not yet exist.
7. Knowledge retrieval is prompt injection of active entries rather than semantic RAG.
8. The current router is built around specific provider functions rather than provider capabilities.

────────

3. Architectural Principle

3.1 PYTHONS owns the intelligence system

The following belong to PYTHONS and must remain provider-independent:

• identity;
• user accounts;
• conversation history;
• long-term memory;
• case state;
• client context;
• knowledge base;
• Karen / Professor Python methodology;
• governance rules;
• red-flag rules;
• safety boundaries;
• business logic;
• routing;
• evaluation;
• observability;
• tools;
• files and document processing workflow;
• structured outputs;
• audit trail.

Providers supply model inference only.

3.2 Providers are replaceable executors

OpenAI, Anthropic, self-hosted models, and future providers are execution backends.

No business module may depend directly on a provider SDK or a provider-specific function.

Forbidden:

```text
business module -> askClaude()
business module -> askOpenAi()
business module -> Anthropic SDK
business module -> OpenAI SDK
```

Required:

```text
business module
      |
      v
PYTHONS AI Capability Layer
      |
      v
Provider Router
      |
  provider adapter
```

────────

4. Target Architecture

```text
                         PYTHONS AI CORE
                               |
        -------------------------------------------------
        |                |               |              |
     Identity          Memory         Knowledge        Safety
        |                |               |              |
        -------------------------------------------------
                               |
                         Context Builder
                               |
                       Capability Layer
            -------------------------------------
            |          |          |             |
           Text      Vision    Documents   Structured Output
            |          |          |             |
            -------------------------------------
                               |
                         Provider Router
            -------------------------------------
            |                  |                |
         OpenAI             Anthropic       Self-hosted
            |                  |                |
            -------------------------------------
                               |
                         Evaluator Layer
                               |
                         Final PYTHONS Answer
```

────────

5. Provider Contract

Introduce a single provider-neutral contract.

Example conceptual interface:

```ts
export type AICapability =
  | "text"
  | "reasoning"
  | "vision"
  | "documents"
  | "structured_output"
  | "tool_use";

export type AIProviderId =
  | "openai"
  | "anthropic"
  | "self_hosted"
  | string;

export interface AIProvider {
  id: AIProviderId;

  capabilities(): Set<AICapability>;

  isAvailable(): Promise<boolean>;

  generate(request: AIRequest): Promise<AIResponse>;
}
```

Provider-specific SDKs must exist only inside provider adapters.

Suggested structure:

```text
lib/ai/
  core/
    types.ts
    capabilities.ts
    router.ts
    evaluator.ts
    errors.ts
    observability.ts

  providers/
    openai.ts
    anthropic.ts
    self-hosted.ts

  context/
    builder.ts

  memory/
    ...

  knowledge/
    ...
```

Existing lib/assistant/* may be migrated gradually; a full rewrite is not required.

────────

6. Capability-Based Routing

Routing must no longer ask:

> Claude or GPT?

It must ask:

> What capability is required, and which healthy provider can supply it?

Example:

```text
Request: ordinary text
Capabilities: text

Request: PDF analysis
Capabilities: documents + vision

Request: extract metrics
Capabilities: documents + structured_output

Request: long reasoning
Capabilities: reasoning

Request: tool execution
Capabilities: tool_use
```

The router selects the best eligible provider according to:

1. required capability;
2. safety requirements;
3. availability;
4. quality tier;
5. latency;
6. cost;
7. privacy requirements;
8. task type;
9. configured provider priority.

────────

7. P0 Migration — Remove Hard Provider Dependencies

P0.1 Introduce provider-neutral AI request/response types

Create normalized:

• AIRequest;
• AIResponse;
• AIError;
• AIProvider;
• AICapability;
• ProviderHealth.

No business module should depend on Anthropic or OpenAI response shapes.

P0.2 Wrap current Claude and GPT implementations

Existing functionality should be preserved behind adapters.

Current behavior must remain functionally equivalent during migration.

P0.3 Replace direct Claude calls in business code

The following current direct dependencies must be migrated:

A. Client/staff attachments

Current:

```text
attachment -> askClaude()
```

Target:

```text
attachment
   |
   v
Capability request: vision/documents
   |
   v
Provider Router
```

B. Case review

Current:

```text
documents
 -> Claude pass 1
 -> Claude pass 2
 -> code comparison
 -> Claude final review
```

Target:

```text
documents
 -> provider A transcription
 -> provider B transcription when possible
 -> deterministic comparison
 -> provider-neutral final generation
```

The two independent readings must remain logically independent.

They should not silently become two calls to the exact same provider if another eligible provider is available.

C. Metrics extraction

Current direct Claude dependency must become:

```text
documents + structured_output
      |
      v
Capability Layer
```

D. Supplement timing advice

Replace direct Claude call with provider-neutral text/reasoning request.

P0.4 Total-provider failure behavior

If all eligible providers are unavailable, the system must return a typed state:

```text
AI_UNAVAILABLE
```

Business modules decide the safe user-facing fallback.

Examples:

• client chat -> support/human handoff;
• staff draft -> retry later;
• metrics extraction -> explain unavailable, do not invent values;
• case review -> do not produce partial fake review;
• red-flag path -> safety escalation must still function independently of LLM availability.

────────

8. P0 Safety Invariants

The migration must not weaken current safety behavior.

The following are non-negotiable:

1. Red-flag deterministic detection remains independent of LLM output.
2. Red-flag recording and notification remain PYTHONS-owned.
3. AI must not diagnose.
4. AI must not prescribe or cancel treatment.
5. AI must not impersonate Professor Python.
6. AI must not fabricate case facts.
7. AI must not claim to have read stored documents it did not receive.
8. Failed provider calls must never result in invented fallback answers.
9. Safety fallback must fail closed.
10. Provider changes must never silently change the center’s governance boundaries.

────────

9. P0 Data Ownership

Canonical client data must never live only inside a provider.

Canonical storage remains PYTHONS-controlled.

This includes:

• conversation history;
• case data;
• payments/context;
• client documents;
• extracted metrics;
• knowledge entries;
• memory;
• escalations;
• provider logs stripped of unnecessary sensitive content.

Provider-specific features such as provider-side threads, assistants, memory, or vector stores must never become the sole canonical source.

────────

10. P1 — Independent Evaluator

Current evaluator behavior should be replaced by an evaluator layer.

The evaluator must be logically separate from candidate generation.

Preferred future behavior:

```text
Candidate A
Candidate B
Candidate C
      |
      v
Independent Evaluation
      |
      v
winner / synthesis
```

Evaluation criteria may include:

• factual grounding;
• hallucination risk;
• policy compliance;
• safety;
• completeness;
• relevance;
• clarity;
• consistency with supplied context;
• format compliance.

The evaluator may itself use:

1. deterministic rules;
2. a dedicated judge model;
3. multiple judges;
4. scoring heuristics;
5. provider-independent evaluation datasets.

A candidate model should not automatically judge a contest in which it participates unless explicitly configured as a fallback.

────────

11. P1 — Third Provider / Self-Hosted Path

Add a third provider abstraction.

The architecture must support a self-hosted or open-weight model without changing business modules.

The first self-hosted provider does not have to match frontier-model quality.

Its initial purpose:

• resilience;
• vendor independence;
• private workloads;
• low-cost tasks;
• emergency fallback;
• future fine-tuning.

Target:

```text
OpenAI unavailable
      |
Anthropic unavailable
      |
Self-hosted eligible
      |
PYTHONS continues operating
```

────────

12. P1 — Long-Term Memory

Current conversation history is an archive, not a full semantic memory system.

Introduce PYTHONS-owned long-term memory.

Possible memory classes:

• stable user facts;
• preferences;
• recurring constraints;
• case facts;
• important prior decisions;
• unresolved tasks;
• relationship/context facts;
• user-approved remembered information.

Architecture:

```text
Conversation
   |
   v
Memory extraction
   |
   v
Memory store
   |
   v
Relevant memory retrieval
   |
   v
Current context
```

Memory retrieval must be provider-independent.

────────

13. P2 — Semantic Knowledge Retrieval / RAG

Current active knowledge injection may remain during migration.

Future target:

```text
Knowledge corpus
      |
 embeddings/index
      |
semantic retrieval
      |
relevant chunks
      |
context builder
```

The vector index must be replaceable.

Knowledge remains canonical in PYTHONS-controlled storage.

The system must support:

• source identifiers;
• chunk provenance;
• relevance score;
• audience restrictions;
• active/inactive state;
• versioning.

────────

14. P2 — Synthesis Mode

Current “best” mode chooses one winner.

A future optional synthesis mode may produce a new answer from multiple candidates.

Example:

```text
Claude -> A
GPT -> B
Self-hosted -> C
      |
      v
Synthesis
      |
      v
Final answer D
```

Synthesis must not automatically be used for every request because it increases cost and latency.

Suggested modes:

• fast;
• balanced;
• best;
• consensus;
• private.

User-facing names need not expose provider names.

────────

15. User Experience Principle

The normal user should interact with Anham / PYTHONS AI, not with a vendor.

Provider attribution may remain available in staff/debug views.

Client-facing product identity must stay stable when providers change.

Do not create user dependence on model branding.

────────

16. Observability

Every AI call should record structured operational metadata.

Recommended fields:

• request ID;
• correlation ID;
• task type;
• required capabilities;
• selected provider;
• selected model;
• latency;
• success/failure;
• normalized error category;
• fallback occurred;
• fallback reason;
• evaluator result;
• token/cost metadata when available.

Do not unnecessarily log full medical prompts or private content.

Sensitive content logging must be minimized.

────────

17. Error Taxonomy

Normalize provider errors.

Example:

```ts
type AIErrorCode =
  | "NO_PROVIDER"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "PROVIDER_DOWN"
  | "INVALID_RESPONSE"
  | "CAPABILITY_UNAVAILABLE"
  | "SAFETY_REFUSAL"
  | "UNKNOWN";
```

Business modules must never branch on Anthropic/OpenAI-specific exception classes.

────────

18. Failover Rules

Failover must be deterministic and bounded.

Rules:

1. Retry only when safe.
2. Use strict timeout.
3. Do not create infinite provider loops.
4. Do not duplicate persistent side effects.
5. Preserve request/case correlation ID.
6. Prefer a different provider after provider-specific failure.
7. Record why failover occurred.
8. Never disguise total-provider failure as a successful answer.
9. For structured tasks, validate the fallback provider output before accepting it.

────────

19. Migration Plan

Phase 0 — Freeze behavior

Before refactor:

• document current modes;
• document current provider models;
• document existing outputs;
• add regression tests for current router behavior;
• add regression tests for red flags;
• add attachment regression tests;
• add case-review regression tests.

No functional changes.

Phase 1 — Core abstraction

Create:

• normalized AI types;
• provider interface;
• OpenAI adapter;
• Anthropic adapter;
• capability registry;
• provider router;
• normalized errors.

Keep current routes working.

Phase 2 — Text migration

Move ordinary text chat through the new provider router.

Acceptance condition:

• guest behavior unchanged;
• registered behavior unchanged;
• paid-client best mode unchanged;
• staff provider-choice behavior unchanged.

Phase 3 — Attachment migration

Move client and staff attachment handling to capability routing.

Acceptance condition:

• PDF/image reading no longer requires Anthropic specifically;
• Claude remains usable as one provider;
• at least one alternate provider path exists or is structurally supported;
• total-provider failure produces safe explicit state.

Phase 4 — Business-function migration

Remove direct askClaude() from:

• case review;
• metrics extraction;
• supplement timing advice;
• any other non-adapter business module.

Acceptance condition:

```text
search for direct provider calls outside providers/
= zero
```

Phase 5 — Evaluator separation

Move judge logic from provider-specific preference to evaluator layer.

Phase 6 — Third provider

Add self-hosted/open-weight adapter.

Phase 7 — Long-term memory

Add memory extraction and retrieval.

Phase 8 — Semantic knowledge retrieval

Add RAG/semantic retrieval.

Phase 9 — Optional synthesis

Add true multi-candidate synthesis.

────────

20. Forbidden Refactor Patterns

Do not:

• rewrite the whole AI system at once;
• remove current working router before replacement is proven;
• move canonical memory into OpenAI/Anthropic;
• introduce provider SDK imports into business modules;
• weaken current safety;
• change Karen/Professor Python authority boundaries;
• change case ownership;
• silently change paid-client behavior;
• delete current fallback before new fallback is live;
• expose provider API keys to the browser;
• expose private provider configuration to clients;
• make a single cloud vendor mandatory for the whole product.

────────

21. Acceptance Criteria — Provider Independence v1

Provider Independence v1 is complete only when all conditions below are true:

Architecture

☐ Business modules do not import askClaude.
☐ Business modules do not import askOpenAi.
☐ Provider SDK imports exist only under provider adapters.
☐ All AI tasks declare required capabilities.
☐ Provider selection is centralized.
☐ Provider failure is normalized.

Text

☐ Ordinary text can run through more than one provider.
☐ Existing best/fallback behavior remains available.

Vision/Documents

☐ Attachment processing uses capability routing.
☐ Case review no longer requires Anthropic directly.
☐ Metrics extraction no longer requires Anthropic directly.

Safety

☐ Deterministic red flags work even if all LLM providers fail.
☐ No provider failure produces fabricated output.
☐ Human/support fallback remains available.

Data

☐ Conversation history remains PYTHONS-owned.
☐ Knowledge remains PYTHONS-owned.
☐ Case context remains PYTHONS-owned.
☐ No provider-hosted memory is canonical.

Operations

☐ Provider health is observable.
☐ Failover events are logged.
☐ Provider/model changes do not require changes to business modules.
☐ A new provider can be added by implementing the provider interface and configuration.

────────

22. Definition of the PYTHONS AI Core

After this migration, the product identity is:

```text
PYTHONS AI
  =
Identity
+ Memory
+ Knowledge
+ Context
+ Safety
+ Tools
+ Router
+ Evaluator
+ Provider ecosystem
```

OpenAI and Anthropic are components of the provider ecosystem, not the product itself.

The long-term goal is that PYTHONS AI can continue operating with different model backends while preserving the same user identity, memory, knowledge, safety rules, case context, and workflows.

────────

23. Immediate Implementation Order

Recommended first implementation sequence:

1. Create provider-neutral types and interfaces.
2. Wrap OpenAI and Anthropic as adapters.
3. Rebuild current router on top of the new provider interface.
4. Preserve current behavior with regression tests.
5. Remove direct Claude dependency from attachments.
6. Remove direct Claude dependency from case review.
7. Remove direct Claude dependency from metrics extraction.
8. Remove direct Claude dependency from supplement timing advice.
9. Separate evaluator.
10. Add third/self-hosted provider.
11. Add long-term memory.
12. Add semantic retrieval.
13. Add synthesis mode if product value justifies it.

────────

24. Implementation Command for Claude/Codex

Use this specification as authoritative for the migration.

Implementation must be incremental.

Do not redesign the center.

Do not change the Constitution, Professor Python authority, case lifecycle, tariffs, safety boundaries, database ownership, or user-facing product identity unless explicitly required by this specification.

Before every phase:

1. inspect current code;
2. list exact files to change;
3. preserve existing behavior;
4. add/adjust tests;
5. implement only the current phase;
6. run tests/build;
7. report changed files, architectural decisions, remaining risks, and commit hash.

Do not begin the next phase automatically without review.

────────

End of Specification