# AGENTS.md — ANKH ANALYSIS SYSTEM OPERATING RULES

## Repository-wide boundaries

- Work only in `pythonsmethod/python-method-center-platform`.
- Never clone, connect to, fetch from, inspect, modify, or reuse code from the archived legacy repository `pythonsmethod/python-method-center`.
- Do not add the legacy repository as a Git remote or source dependency.
- The retired client processing classification remains retired. Client cases and support requests have no processing status, urgency, prioritization, automatic transition, badge or filter. `docs/architecture/CLIENT_PROCESSING_WITHOUT_CLASSIFICATION.md` is authoritative.
- Every user-facing change must be complete in Russian and English. Visible copy, accessibility labels, validation, metadata, navigation and states must follow the active locale. Language switching must preserve the route and be verified in both directions.

These repository-wide rules remain authoritative for Ankh work. The rest of this file adds the permanent Ankh operating memory.

## 1. Purpose

This repository contains the Ankh Analysis System / Python Method Center clinical-document analysis platform.

This file defines how Codex must work on the Ankh analysis/document-processing system.

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
→ Ankh Analytical Engine
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

## 3. Read before any Ankh work

Before changing Ankh code, read:

1. `AGENTS.md`
2. `CURRENT_STATE.md`
3. `ROADMAP.md`
4. `DECISIONS.md`
5. `Ankh_Analysis_System_Master_Concept_v1_ru.docx` or its repository Markdown equivalent
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
- apply Ankh staging migrations to production without a dedicated task;
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

For extraction/trust changes, also run the current Ankh benchmark suite.

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

## 12. Karen and Ankh roles

Ankh:
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

Ankh must not silently turn review-only evidence into established truth.

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
