# ROADMAP.md — ANKH ANALYSIS SYSTEM

## North Star

Build a system that turns heterogeneous client medical documents into a traceable, longitudinal, reviewable evidence model that allows Ankh to prepare the Case and Karen to understand and decide quickly.

Accuracy, explainability, safety and workflow efficiency are more important than maximizing automation percentage.

---

## COMPLETED FOUNDATION

### Phase 1 — Document AI Foundation
Status: COMPLETE

Delivered:
- Google Cloud project;
- Enterprise Document OCR;
- server authentication foundation;
- provider adapter;
- successful smoke tests.

### Phase 2 — Canonical Fact Extraction & Verification
Status: COMPLETE

Delivered:
- canonical lab fact model;
- parsing;
- deterministic verification;
- source provenance;
- confidence routing;
- normalization;
- idempotency;
- safe persistence design.

### Phase 2.5 — Gold Dataset & Benchmark Infrastructure
Status: COMPLETE AS INFRASTRUCTURE

Delivered:
- Gold Dataset contract;
- benchmark runner;
- error library;
- regression reporting;
- synthetic baseline;
- layout registry.

### Phase 2.5B — First Real Clinical Case
Status: COMPLETE

Delivered:
- real document classification;
- Clinical Evidence layer;
- radiology/pathology/procedure/biomarker extraction audit;
- timeline and deterministic linkage utilities;
- real Gold subset;
- security cleanup.

### Phase 2.5C — Extraction Hardening / Closure
Status: CLOSED AS REVIEW-ONLY

Delivered:
- spatial table fallback;
- pathology regression work;
- root-cause mechanisms;
- 47-target closure benchmark;
- safe `NEEDS_REVIEW`/`SOURCE_ONLY` routing.

Result:
47/47 source matches under visual review, but 0 automatic VERIFIED.

### Phase 2.7 — Verification Trust Framework
Status: COMPLETE

Delivered:
- separate trust/confidence dimensions;
- evidence classes;
- declarative gate policies;
- P0–P4 provenance levels;
- explainable trust decisions;
- reason codes;
- policy versioning;
- shadow mode;
- human calibration contract.

Result:
0/47 auto-verify under unchanged conservative policy because P3/P4 exact provenance is missing.

---

# NEXT

## Phase 2.8 — P3 Token/Span Provenance & Verification Upgrade

Status: COMPLETE FOR THE LOCALLY RETAINED, MINIMIZED CORPUS

Goal:
add exact source-span/token provenance without weakening trust policy.

Target chain:

fact
→ document
→ page
→ region
→ exact source span/tokens
→ parser
→ trust decision

Required outcomes:
- exact span/token mapping where technically available;
- provenance confidence;
- no false provenance claims;
- immutable source/canonical data;
- rerun unchanged `phase-2.7-shadow-v1`;
- report new shadow coverage and precision;
- no tuning policy thresholds to this Case.

Expected decision:
determine which evidence classes can safely approach automatic verification.

Result:
- exact P3 token provenance recovered for 6/47 targets with retained token sets;
- 41/47 remained P2 because exact raw token sets were not retained;
- P4 remained 0/47;
- unchanged shadow policy remained at 0/47 auto-verified and 0 false auto-verified;
- no source fact or production state was mutated.

---

## Phase 2.9 — Broader Real-World Validation

Status: IN PROGRESS — DATA GATE OPEN

Goal:
validate extraction + trust gates on multiple Cases/layouts.

Coverage should eventually include:
- multiple labs;
- multiple pathology formats;
- multiple radiology formats;
- PDF originals;
- mobile photos;
- multiple languages;
- low-quality scans;
- corrected/addendum documents;
- multi-page reports.

Required:
- independent human review dataset;
- false VERIFIED tracking;
- per-evidence-class precision;
- release thresholds based on risk, not marketing goals.

Current readiness:
- configurable 11-gate audit implemented; current numeric thresholds are proposed and not yet approved;
- 1/11 gates passes;
- existing evidence contains only one real Case and cannot support broader conclusions;
- synthetic fixtures remain regression-only and are not counted as real Cases.

Phase closure requires additional authorized real source material and independent review; repeating the existing Case does not satisfy this requirement.

---

# PHASE 3 — ANKH ANALYTICAL ENGINE

## Phase 3A — Longitudinal Evidence Model
Status: CONDITIONAL FUTURE / TEST-ONLY

Build:
- event timeline;
- collection/exam/procedure/pathology dates;
- cross-document temporal structure;
- "SINCE KAREN LAST REVIEW";
- change detection.

Must preserve:
VERIFIED / NEEDS_REVIEW / SOURCE_ONLY status.

Phase 3 must never flatten review-only evidence into fact.

## Phase 3B — Trend Engine

Build:
- longitudinal lab trends;
- comparability;
- within-reference but meaningful change detection;
- explicit lab/reference distinction;
- no false trend across non-comparable units/methods.

## Phase 3C — Evidence Relationship Layer

Build:
- co-occurring changes;
- temporal associations;
- deterministic document relations;
- explicit separation between association and causality.

## Phase 3D — Ankh Analytical Picture

Build:
- concise Case picture for Karen;
- major changes;
- stable areas;
- contradictions;
- missing data;
- evidence links;
- confidence/review markers.

No automatic diagnosis.

## Phase 3E — Automated Analytical QA

Build:
- deterministic checks;
- policy checks;
- AI critique;
- unsupported-statement detection;
- evidence coverage checks.

---

# PHASE 4 — KAREN WORKSPACE

Goal:
Karen understands a prepared Case in ~30–90 seconds where feasible.

Core UI:
- Case summary;
- data quality badge;
- major changes;
- timeline;
- all indicators;
- evidence drill-down;
- source snippets;
- unresolved contradictions;
- missing data;
- Ask Ankh;
- Karen Decision.

Internal complexity must not leak into the primary Karen view.

---

# PHASE 5 — CLIENT RESPONSE

Goal:
turn Karen-approved analysis into clear client communication.

Client output should answer:
1. what was reviewed;
2. what was found;
3. what changed;
4. what appears stable;
5. what cannot be determined;
6. what data are still missing;
7. what next step was approved.

Client response must not simply copy the technical Karen interface.

---

# PHASE 6 — CONTROLLED LEARNING

Build:
- Case-only corrections;
- extraction-error library;
- methodology proposal workflow;
- rule scope;
- approval before methodology changes;
- no uncontrolled self-learning.

---

# PHASE 7 — SCALE

Targets:
- 100 cases/day;
- later 1,000 cases/day.

Required:
- queues/workers;
- idempotency;
- retries;
- provider rate-limit handling;
- observability;
- cost per Case;
- quality metrics;
- load testing;
- routing by complexity/risk;
- minimized Karen manual effort.

Do not assume 1,000 cases/day means 1,000 full manual Karen reviews.

---

# PRODUCTION GATES

Production auto-verification remains NO-GO until:
- broader real-world validation;
- validated thresholds;
- independent human calibration;
- staging persistence;
- PHI/compliance closure;
- operational monitoring;
- rollback path.

Phase 3 production remains NO-GO until these requirements are appropriately closed.

---

# ROADMAP RULE

Do not skip phases because a later feature is exciting.

Do not keep adding phases merely to create architecture.

Each new phase must solve a demonstrated gap in:
- accuracy;
- safety;
- explainability;
- workflow;
- scalability;
- maintainability.
