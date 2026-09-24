# AGENTS.md — NEXORA CORE / PMC APPLICATION OPERATING RULES

## Owner-approved architecture — 2026-09-23

Read `docs/architecture/NEXORA_MASTER_ARCHITECTURE.md` before new architecture work.
NEXORA owns reusable capabilities, including document analysis. ANHAM is the
AI system within Python Method Center and consumes those capabilities through
a PMC authorization/domain adapter. External capability commercialization belongs
to NEXORA / NEXORA API. ANKH is retired as a standalone system/product name.

The implementation is still hosted in this repository; the approved target does
not prove a separate NEXORA runtime or released API. Do not duplicate Cases,
source documents, evidence or an entire processing engine to satisfy the naming.
Keep organization/app/subject authorization and PMC-specific methodology separate.

Legacy `docs/ankh`, harness, script, environment and provider identifiers remain
compatibility references until a reviewed migration updates their dependants.
Do not relabel historical benchmark evidence as new NEXORA runtime validation.

## Repository-wide boundaries

- Work only in `pythonsmethod/python-method-center-platform`.
- Never clone, connect to, fetch from, inspect, modify, or reuse code from the archived legacy repository `pythonsmethod/python-method-center`.
- Do not add the legacy repository as a Git remote or source dependency.
- The retired client processing classification remains retired. Client cases and support requests have no processing status, urgency, prioritization, automatic transition, badge or filter. `docs/architecture/CLIENT_PROCESSING_WITHOUT_CLASSIFICATION.md` is authoritative.
- Every user-facing change must be complete in Russian and English. Visible copy, accessibility labels, validation, metadata, navigation and states must follow the active locale. Language switching must preserve the route and be verified in both directions.

These repository-wide rules remain authoritative for NEXORA capability work inside PMC. The rest of this file preserves the document-analysis operating memory.

## 1. Purpose

This repository contains the PMC application and the existing implementation intended to supply NEXORA document-analysis capabilities.

This file defines how Codex must work on document analysis and its PMC integration.

The goal is to build a precise, explainable, safe, scalable system that:

1. receives client medical documents;
2. extracts facts with provenance;
3. separates source facts from AI interpretation;
4. builds longitudinal evidence;
5. prepares a structured picture for Karen;
6. never invents missing data;
7. preserves uncertainty and review states;
8. supports future scale without making Karen manually read every document.

This is not a generic “AI reads PDFs” feature.

The target architecture is:

Source Document
→ Document AI
→ Extraction
→ Verification
→ Canonical Facts / Clinical Evidence
→ Trust Decision
→ Longitudinal Evidence Model
→ NEXORA Document Analysis + PMC Domain Adapter
→ Karen Review / Decision
→ Client Response

## 2. Mandatory working rule

НЕ ПРОСИ МЕНЯ ВЫПОЛНИТЬ ВРУЧНУЮ ДЕЙСТВИЯ, КОТОРЫЕ ТЫ МОЖЕШЬ ВЫПОЛНИТЬ САМ.

Before asking the owner to do anything:
- inspect the repository;
- inspect available tools;
- inspect current code and environment;
- perform all possible actions yourself.

Ask the owner only for genuine owner-only actions such as:
- permissions;
- MFA;
- billing;
- legal/compliance acceptance;
- access to a source artifact not available to Codex;
- explicit authorization to transmit PHI externally when required.

Do not return a long manual click-through guide if the action can be performed directly.

## 3. Read before document-analysis work

Before changing document-analysis code, read:

1. `AGENTS.md`
2. `CURRENT_STATE.md`
3. `ROADMAP.md`
4. `DECISIONS.md`
5. `docs/architecture/NEXORA_MASTER_ARCHITECTURE.md` and the ANHAM/PMC application profile; the former `Ankh_Analysis_System_Master_Concept_v1_ru.docx` is a historical reference only
6. relevant documents under `docs/ankh/`
7. existing canonical Case / AI / Karen / safety documents referenced by the project

For the current repository, the canonical implementation record is the Markdown documentation under `docs/ankh/`. If the Master Concept DOCX is not present in the repository, do not invent its contents or treat a remembered copy as newer than repository evidence.

Do not create a parallel Case model, state machine, role model, evidence store, or source of truth before checking whether one already exists.

## 4. Canonical architectural principles

### 4.1 Source facts are immutable

Never overwrite the original document data with normalized or interpreted data.

Keep separate layers:

SOURCE
EXTRACTED
VERIFIED
NORMALIZED
ANALYTICAL INTERPRETATION
KAREN DECISION
CLIENT RESPONSE

### 4.2 Facts and interpretation are different

Never merge these categories:

- VERIFIED FACT
- OBSERVED PATTERN
- HYPOTHESIS
- KAREN DECISION

Temporal sequence is not causality.

A laboratory High/Low flag is not the same as clinical significance.

### 4.3 Uncertainty must remain visible

If evidence is insufficient:
- use `NEEDS_REVIEW`;
- use `SOURCE_ONLY`;
- use unresolved normalization;
- say that the system does not know.

Do not guess to improve benchmark percentages.

### 4.4 Provenance is mandatory

Important extracted evidence must be traceable:

fact
→ source document
→ page
→ region
→ exact token/span when available.

Never claim a provenance level that is not actually available.

### 4.5 Precision over coverage

The project prefers:
- lower automatic coverage with zero dangerous false VERIFIED
over
- high coverage obtained by guessing.

Never weaken trust thresholds merely to obtain a better-looking percentage.

### 4.6 One real Case is not universal validation

A 47/47 result on one Case proves only that the selected facts on that Case can be matched to source.

It does not prove:
- universal clinical accuracy;
- production readiness;
- generalization across labs;
- multi-language reliability;
- safe automatic verification.

## 5. Current production boundary

Until `CURRENT_STATE.md` explicitly changes this:

DO NOT:
- enable production auto-verification;
- enable production PHI processing for all client uploads;
- apply document-analysis staging migrations to production without a dedicated task;
- start automatic diagnosis/recommendation generation;
- generate client-facing medical interpretation without the approved workflow;
- silently convert `NEEDS_REVIEW` to `VERIFIED`.

## 6. Phase discipline

For every phase:

1. inspect current state;
2. define the gap;
3. implement only the required scope;
4. add tests;
5. run regression suite;
6. run benchmark when relevant;
7. verify provenance/safety;
8. update documentation;
9. update `CURRENT_STATE.md`;
10. update `DECISIONS.md` for architectural decisions;
11. update `ROADMAP.md` if sequence/status changed.

Do not begin the next phase merely because code was written.

A phase closes only when its Definition of Done is satisfied.

## 7. Required final report after every implementation task

Report:

A. What existed before
B. What changed
C. Files created/changed
D. Data/schema changes
E. Tests and exact results
F. Benchmark results, if applicable
G. Security/PHI implications
H. Known limitations
I. What was intentionally NOT implemented
J. Phase CLOSED / NOT CLOSED
K. GO / NO-GO for next phase
L. Exact next action

## 8. Testing rules

Never hide test failures.

Separate:
- failures caused by current work;
- known unrelated failures.

At minimum run relevant:
- unit tests;
- integration tests;
- TypeScript;
- ESLint;
- `git diff --check`.

For extraction/trust changes, also run the existing document-analysis benchmark suite under its compatible script name.

## 9. PHI / document handling

Do not commit:
- raw client documents;
- raw OCR responses containing PHI;
- screenshots with identifiers;
- credentials or service-account keys.

Temporary PHI files used for an explicitly authorized validation must be deleted after the task if required by the task.

Retain only minimized/deidentified benchmark artifacts where appropriate.

## 10. Architecture over patches

Do not create one-off parsing rules for individual target values.

When extraction fails:
1. classify root cause;
2. group failures by mechanism;
3. fix the general mechanism;
4. add a regression fixture;
5. prove no regression.

## 11. Provider independence

Google Document AI is the current primary extraction provider.

Do not architect the whole system so it cannot later support another provider.

Use provider adapters.

Do not add Azure/AWS merely to inflate accuracy without a defined validation need.

## 12. NEXORA capability and PMC expert roles

NEXORA document analysis (through the PMC adapter):
- extracts;
- structures;
- compares;
- detects changes;
- surfaces contradictions/gaps;
- prepares evidence and analytical draft.

Karen:
- reviews;
- corrects;
- interprets;
- makes the Case decision within the Center model.

The capability and its PMC adapter must not silently turn review-only evidence into established truth.

## 13. Main product principle

Internal system complexity may grow.

Karen's interface must become simpler.

The desired Karen experience is:
- understand the Case quickly;
- see what changed;
- see what requires attention;
- inspect evidence only when needed;
- know what is uncertain;
- make a decision without manually rereading all PDFs.

## 14. Memory of the project

The repository is the persistent project memory.

Do not rely on the current chat thread as the only source of context.

When important decisions are made:
- record them in `DECISIONS.md`;
- update `CURRENT_STATE.md`;
- update `ROADMAP.md`.

If a new Codex thread starts, restore project context from these files before proceeding.
