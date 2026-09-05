# Ankh canonical fact layer — Phase 2

Status: implemented and tested as a development-only, service-only foundation. It is not connected to production uploads or real PHI processing.

## Audit: what exists, what was missing, what was added

### What exists

- `client_cases` is the single canonical Case table.
- `uploaded_documents` is the immutable document metadata/source link and already belongs to a Case and profile.
- `document_processing_jobs` is the existing service-only retry queue.
- `document_extractions` stores the existing two-reading transcription output per source document.
- `lib/document-extraction` provides a replaceable Document AI adapter and preserves raw responses, page layout, confidence, language, quality and tables.
- the separate metrics feature stores client-entered/extracted chart points, but does not contain the provenance, references, verification or version semantics required for canonical facts.
- existing Case lifecycle and retired client-classification rules remain authoritative and unchanged.

### What was missing

- a typed Source → Extracted → Verified → Normalized model;
- deterministic numeric, inequality, reference and flag parsing;
- visual provenance on every fact;
- conservative confidence routing and a selective second-OCR hook;
- safe analyte/unit normalization without forced LOINC/UCUM mapping;
- extraction/parser versioning and durable idempotency;
- a service-only canonical persistence schema with RLS;
- PHI-free regression fixtures and an OCR-to-fact integration test.

### What was added

- provider-neutral canonical fact types and counters;
- Google Document AI table parsing;
- deterministic verification and normalization pipeline;
- idempotent fingerprints and stable fact IDs;
- a service-only persistence helper and minimal Supabase migration;
- seven synthetic fixture scenarios and unit/integration coverage.

## Architecture and boundary

```text
uploaded_documents (source)
  → Google Document AI raw response (extracted, versioned)
  → table parser (candidate rows)
  → deterministic verification (verified / needs review / rejected)
  → safe normalization (original fields remain immutable)
  → canonical_lab_facts (service-only)
  → Phase 3 later
```

Phase 2 copies and verifies laboratory facts. It does not diagnose, grade severity, infer organ damage or causality, recommend actions, create a Karen UI, draft a client response, or change a Case state.

## Canonical schema

Each fact stores:

- identity: `fact_id`, deterministic `fact_fingerprint`, Case and source document;
- provenance: source page and Document AI bounding polygon;
- original source fields: test name, value, unit, reference and laboratory flag;
- derived fields: numeric value/comparator, normalized name/unit, parsed reference bounds;
- separate dates: order, collection/specimen, received, result and report;
- optional laboratory and method;
- extraction confidence, verification issues/status, normalization and comparability statuses;
- extraction provider and version.

`standard_code` is nullable. Phase 2 does not guess LOINC. Original strings are never overwritten by normalized strings.

## Parsing rules

- decimal point and decimal comma;
- negative numbers and scientific notation;
- `<`, `>`, `≤`, `≥`, `<=`, `>=` result comparators;
- ranges with hyphen, en dash, em dash or `to`;
- one-sided reference bounds;
- text results remain in `value_original` with `value_numeric = null`;
- missing references are allowed;
- multiline cell text is collapsed only for whitespace, not semantically rewritten;
- Google tables are parsed only when recognizable test and result columns exist;
- unknown layouts are not guessed.

## Verification and confidence routing

`VERIFIED` requires required source fields, reliable row association, page + coordinates, and critical-field confidence of at least `0.90`. `NEEDS_REVIEW` preserves low confidence, ambiguous row association, incomplete provenance, unresolved numeric/reference syntax and missing confidence. Missing required test/value becomes `REJECTED`.

Name or unit normalization being unresolved does not discard an otherwise faithful source fact. It lowers normalization/comparability and remains visible. `verificationRequests` is the hook for a future selective second OCR provider; Azure/AWS are not connected.

Laboratory `HIGH/H`, `LOW/L` and `ABNORMAL/A` are stored as source flags. They are not clinical interpretations.

## Provenance

The chain is `fact → source_document_id → source_page → source_coordinates`. Bounding polygons are retained from the relevant Document AI value/test cell. A fact without reliable visual provenance cannot become fully verified.

## Dates and comparability

Dates remain separate. Future longitudinal work should prefer a reliable collection/specimen date; report date is never silently substituted as measurement time by this layer.

Safe unit normalization only canonicalizes spelling/case for a small exact set. It performs no conversion. Known test + safely normalized/absent unit is `HIGH` comparability; unresolved unit is `LIMITED`; unresolved test mapping is `NOT_COMPARABLE`.

## Idempotency and persistence

`canonical_fact_extractions` is unique by source document, source fingerprint, provider, provider version and parser version. `canonical_lab_facts` is unique by extraction run and fact fingerprint. Reprocessing identical content/version upserts the same run/facts rather than appending duplicates.

Both tables reference the existing `client_cases`, `uploaded_documents` and `profiles`. RLS is enabled; `anon` and `authenticated` have explicit deny policies and revoked privileges. Only a trusted server-side service-role path may persist them. The existing production worker does not call this layer in Phase 2.

## Observability

Every pipeline result includes structured counters:

- `documents_processed`;
- `facts_extracted`;
- `facts_verified`;
- `facts_needing_review`;
- `facts_rejected`;
- `parser_errors`;
- `normalization_unresolved`.

These contain counts only. Full medical documents or raw response bodies must not be logged.

## Synthetic regression suite

Fixtures contain no PHI and cover the required values, decimal comma, inequality, missing reference, multiple pages, ambiguous low confidence and duplicate processing. The integration fixture models a Google Document AI table and verifies the complete Hemoglobin path.

Representative integration output:

```json
{
  "originalTestName": "Hemoglobin",
  "normalizedTestName": "Hemoglobin",
  "valueOriginal": "9.6",
  "valueNumeric": 9.6,
  "unitOriginal": "g/dL",
  "unitNormalized": "g/dL",
  "referenceOriginal": "12.0–15.5",
  "referenceLow": 12,
  "referenceHigh": 15.5,
  "labFlagOriginal": "LOW",
  "verificationStatus": "VERIFIED",
  "sourcePage": 1
}
```

## Known limitations and Phase 3 boundary

- The table parser intentionally skips unrecognized layouts; a future parser registry can add laboratory-specific layouts after benchmark evidence.
- Document-level dates/laboratory/method need explicit reliable extraction inputs; they are nullable today.
- No broad LOINC/UCUM dictionary or unit conversion exists.
- No real-PHI fixture or raw production response is committed.
- No second OCR provider, UI, timeline, medical analysis, Karen decision or client response is implemented.
- Production activation requires the separate PHI/security/compliance gate and explicit authorization.

Recommended Phase 3: benchmark this verified dataset against a de-identified gold set, add parser-format routing and evidence review APIs, then build longitudinal observations and contradiction/missing-data logic without changing the canonical Case or source facts.

Phase 2.5 benchmark infrastructure, measured synthetic baseline, staging audit and real-world release gates are documented in [Gold Dataset and benchmark](./gold_dataset_and_benchmark.md). Layout statistics are maintained separately in [Laboratory layout registry](./layout_registry.md). Synthetic benchmark results must not be represented as real-world accuracy.
